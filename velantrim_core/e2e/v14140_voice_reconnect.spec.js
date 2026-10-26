// @ts-check
const { test, expect } = require('@playwright/test');
// EitiVoice P1-1: обрыв mock WebSocket → reconnecting → listening; лимит 2 попытки; ключ отклонён → без повторов;
// нет готовых провайдеров → текстовый режим. Реальные провайдеры НЕ вызываются (WebSocket, mic и fetch — моки).
test.use({ locale: 'ru-RU' });

function installMocks() {
  window.__ws = [];
  class FakeWS {
    constructor(url, protocols) {
      this.url = url; this.protocols = protocols; this.readyState = 0; this.sent = []; this.binaryType = 'blob';
      window.__ws.push(this);
      setTimeout(() => { this.readyState = 1; this.onopen && this.onopen({}); }, 10);
    }
    send(d) { this.sent.push(typeof d === 'string' ? JSON.parse(d) : d); }
    close(code, reason) {
      if (this.readyState === 3) return;
      this.readyState = 3;
      setTimeout(() => this.onclose && this.onclose({ code: code || 1000, reason: reason || '' }), 0);
    }
    // имитация сетевого обрыва со стороны сервера
    drop(code) { this.readyState = 3; this.onerror && this.onerror({}); this.onclose && this.onclose({ code: code || 1006, reason: '' }); }
    serverSend(obj, binary) { const s = JSON.stringify(obj); this.onmessage && this.onmessage({ data: binary ? new TextEncoder().encode(s).buffer : s }); }
  }
  FakeWS.OPEN = 1;
  window.WebSocket = FakeWS;
  const md = navigator.mediaDevices || {};
  md.getUserMedia = () => new Promise(() => {});
  // любые внешние запросы к ИИ блокируем — тест не должен ходить в сеть
  const origFetch = window.fetch.bind(window);
  window.fetch = (url, opts) => {
    if (/^https?:\/\/(?!127\.0\.0\.1)/.test(String(url))) return Promise.reject(new TypeError('blocked in test'));
    return origFetch(url, opts);
  };
}

async function boot(page, extra) {
  await page.route(/^(?!http:\/\/127\.0\.0\.1)https?:\/\//, (r) => r.abort());
  await page.addInitScript(({ extra }) => {
    localStorage.setItem('eiti_onboarded', 'true');
    for (const [k, v] of Object.entries(extra || {})) localStorage.setItem(k, v);
  }, { extra });
  await page.addInitScript(installMocks);
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof openView === 'function' && typeof eitiDb !== 'undefined' && !!eitiDb
    && !!window.EitiVoiceController && typeof window.EitiVoice.handleDrop === 'function', null, { timeout: 20_000 });
  await page.evaluate(() => { const ob = document.getElementById('eiti-onboarding'); if (ob) ob.remove(); });
}

async function startGemini(page, idx) {
  await page.waitForFunction((i) => window.__ws.length === i + 1 && window.__ws[i].sent.length === 1, idx, { timeout: 10_000 });
  await page.evaluate((i) => window.__ws[i].serverSend({ setupComplete: {} }, true), idx);
  await page.waitForFunction(() => EitiVoice.state() === 'listening');
}

test('Gemini: обрыв сокета → reconnecting (1с) → listening; счётчик сброшен', async ({ page }) => {
  await boot(page, { eiti_voice_provider: 'gemini' });
  await page.evaluate(() => {
    localStorage.setItem('eiti_gemini_key', _obfKey('AIza-mock')); localStorage.removeItem('eiti_grok_key');
    window.__st = []; EitiVoice.on('state', (e) => window.__st.push(e.state)); window.__rc = []; EitiVoice.on('reconnect', (e) => window.__rc.push(e.attempt + '@' + e.delay));
    chatLog.length = 0; openView('chat'); eitiChatGrokToggle();
  });
  await startGemini(page, 0);
  await page.evaluate(() => window.__ws[0].drop(1006));
  expect(await page.evaluate(() => EitiVoice.state())).toBe('reconnecting');
  await expect(page.locator('.toast', { hasText: 'переподключение (1/2)' })).toHaveCount(1);
  await startGemini(page, 1);
  const r = await page.evaluate(() => ({ rc: window.__rc, info: EitiVoice.reconnectInfo(), st: window.__st }));
  expect(r.rc).toEqual(['1@1000']);
  expect(r.info.attempts).toBe(0);
  expect(r.st).toContain('reconnecting');
  await page.evaluate(() => eitiChatGrokToggle());
  expect(await page.evaluate(() => EitiVoice.state())).toBe('idle');
});

test('Gemini: обрывы без восстановления → ровно 2 попытки (1с, 3с), затем переход к готовому OpenAI; без бесконечных повторов', async ({ page }) => {
  await boot(page, { eiti_voice_provider: 'gemini' });
  await page.evaluate(() => {
    localStorage.setItem('eiti_gemini_key', _obfKey('AIza-mock')); localStorage.removeItem('eiti_grok_key');
    localStorage.setItem('eiti_openai_voice_key', _obfKey('sk-mock-not-real'));
    window.__rc = []; EitiVoice.on('reconnect', (e) => window.__rc.push(e.attempt + '@' + e.delay));
    window.__fb = []; EitiVoice.on('fallback', (e) => window.__fb.push(e.to));
    openView('chat'); eitiChatGrokToggle();
  });
  const ready = await page.evaluate(() => EitiVoice.fallbackOrder('gemini'));
  expect(ready).toContain('openai');
  await page.waitForFunction(() => window.__ws.length === 1 && window.__ws[0].readyState === 1);
  await page.evaluate(() => window.__ws[0].drop(1006));
  await page.waitForFunction(() => window.__ws.length === 2 && window.__ws[1].readyState === 1, null, { timeout: 5000 });
  await page.evaluate(() => window.__ws[1].drop(1006));
  await page.waitForFunction(() => window.__ws.length === 3 && window.__ws[2].readyState === 1, null, { timeout: 8000 });
  await page.evaluate(() => window.__ws[2].drop(1006));
  await expect(page.locator('.eiti-voice-switch-btn')).toContainText('OpenAI');
  await page.waitForTimeout(4500);
  const r = await page.evaluate(() => ({ rc: window.__rc, fb: window.__fb, n: window.__ws.length, st: EitiVoice.state() }));
  expect(r.rc).toEqual(['1@1000', '2@3000']);
  expect(r.fb).toEqual(['openai']);
  expect(r.n).toBe(3); // больше сокетов не открывалось
  expect(r.st).not.toBe('reconnecting');
});

test('Gemini: ключ отклонён (1007) → без повторов; нет готовых провайдеров → текстовый режим, фокус в поле ввода', async ({ page }) => {
  await boot(page, { eiti_voice_provider: 'gemini' });
  await page.evaluate(() => {
    localStorage.setItem('eiti_gemini_live_key', _obfKey('bad')); localStorage.removeItem('eiti_grok_key');
    window.__rc = []; EitiVoice.on('reconnect', (e) => window.__rc.push(e)); window.__tm = []; EitiVoice.on('text_mode', (e) => window.__tm.push(e.reason));
    openView('chat'); eitiChatGrokToggle();
  });
  await page.waitForFunction(() => window.__ws.length === 1 && window.__ws[0].readyState === 1);
  await page.evaluate(() => window.__ws[0].close(1007, 'API key not valid. Please pass a valid API key.'));
  const toast = page.locator('.eiti-voice-switch-toast[data-eiti-text-mode="1"]');
  await expect(toast).toContainText('других готовых голосовых провайдеров нет');
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => ({ rc: window.__rc.length, tm: window.__tm, n: window.__ws.length }))).toEqual({ rc: 0, tm: ['auth'], n: 1 });
  await page.locator('.eiti-voice-text-btn').click();
  expect(await page.evaluate(() => document.activeElement && document.activeElement.id)).toBe('input');
});

test('отмена: пользователь стартует заново во время reconnecting → ожидающая попытка снята, лишнего сокета нет', async ({ page }) => {
  await boot(page, { eiti_voice_provider: 'gemini' });
  await page.evaluate(() => { localStorage.setItem('eiti_gemini_key', _obfKey('AIza-mock')); openView('chat'); eitiChatGrokToggle(); });
  await page.waitForFunction(() => window.__ws.length === 1 && window.__ws[0].readyState === 1);
  await page.evaluate(() => window.__ws[0].drop(1006));
  expect(await page.evaluate(() => EitiVoice.reconnectInfo().pending)).toBe('gemini');
  await page.evaluate(() => EitiVoice.stop());
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => ({ n: window.__ws.length, st: EitiVoice.state(), p: EitiVoice.reconnectInfo().pending }))).toEqual({ n: 1, st: 'idle', p: '' });
});

test('нет сети: обрыв → без переподключения, честное сообщение', async ({ page, context }) => {
  await boot(page, { eiti_voice_provider: 'gemini' });
  await page.evaluate(() => { localStorage.setItem('eiti_gemini_key', _obfKey('AIza-mock')); openView('chat'); eitiChatGrokToggle(); });
  await page.waitForFunction(() => window.__ws.length === 1 && window.__ws[0].readyState === 1);
  await context.setOffline(true);
  await page.evaluate(() => window.__ws[0].drop(1006));
  await expect(page.locator('.eiti-voice-switch-toast')).toContainText('нет сети');
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => ({ n: window.__ws.length, p: EitiVoice.reconnectInfo().pending }))).toEqual({ n: 1, p: '' });
  await context.setOffline(false);
});

test('«⏹ Отменить» в тосте во время второй ожидающей попытки (3с) → переподключения нет, UI в покое, без перехода к другому провайдеру', async ({ page }) => {
  await boot(page, { eiti_voice_provider: 'gemini' });
  await page.evaluate(() => {
    localStorage.setItem('eiti_gemini_key', _obfKey('AIza-mock')); localStorage.removeItem('eiti_grok_key');
    localStorage.setItem('eiti_openai_voice_key', _obfKey('sk-mock-not-real')); // готовый запасной провайдер есть — но переключаться нельзя
    window.__rc = []; EitiVoice.on('reconnect', (e) => window.__rc.push(e.attempt + '@' + e.delay));
    window.__fb = []; EitiVoice.on('fallback', (e) => window.__fb.push(e.to));
    window.__tm = []; EitiVoice.on('text_mode', (e) => window.__tm.push(e.reason));
    openView('chat'); eitiChatGrokToggle();
  });
  await page.waitForFunction(() => window.__ws.length === 1 && window.__ws[0].readyState === 1);
  await page.evaluate(() => window.__ws[0].drop(1006));
  await page.waitForFunction(() => window.__ws.length === 2 && window.__ws[1].readyState === 1, null, { timeout: 5000 });
  await page.evaluate(() => window.__ws[1].drop(1006));
  // вторая попытка запланирована (3 с) — ждём это состояние явно, а не по таймеру
  await page.waitForFunction(() => EitiVoice.state() === 'reconnecting' && EitiVoice.reconnectInfo().pending === 'gemini');
  expect(await page.evaluate(() => window.__rc)).toEqual(['1@1000', '2@3000']);
  // настоящая кнопка «⏹ Отменить» в тосте переподключения (2/2)
  const cancel = page.locator('.toast', { hasText: 'переподключение (2/2)' }).locator('.eiti-voice-rc-cancel');
  await expect(cancel).toBeVisible();
  await expect(cancel).toHaveText('⏹ Отменить');
  await cancel.click();
  await page.waitForFunction(() => EitiVoice.state() === 'idle');
  await expect(page.locator('.eiti-voice-rc-toast')).toHaveCount(0);
  await page.waitForTimeout(4000); // дольше любой задержки (3 с): запланированный старт не должен сработать
  const r = await page.evaluate(() => ({ n: window.__ws.length, st: EitiVoice.state(), p: EitiVoice.reconnectInfo().pending,
    a: EitiVoice.reconnectInfo().attempts, rc: window.__rc, fb: window.__fb, tm: window.__tm, act: !!window._grokVoiceActive,
    btn: document.getElementById('chat-grok-btn').textContent }));
  expect(r).toEqual({ n: 2, st: 'idle', p: '', a: 0, rc: ['1@1000', '2@3000'], fb: [], tm: [], act: false, btn: '🗣️' });
  await expect(page.locator('.eiti-voice-switch-toast')).toHaveCount(0);
});
