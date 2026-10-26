// @ts-check
const { test, expect } = require('@playwright/test');
// EitiVoice P0-2: единый контроллер local/eiti_voice.js — состояния, адаптеры, совместимость (mock WS)
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
    serverSend(obj, binary) { const s = JSON.stringify(obj); this.onmessage && this.onmessage({ data: binary ? new TextEncoder().encode(s).buffer : s }); }
  }
  FakeWS.OPEN = 1;
  window.WebSocket = FakeWS;
  const md = navigator.mediaDevices || {};
  md.getUserMedia = () => new Promise(() => {});
  const origFetch = window.fetch.bind(window);
  window.fetch = (url, opts) => {
    if (String(url).indexOf('api.x.ai/v1/realtime/client_secrets') !== -1) {
      return Promise.resolve(new Response(JSON.stringify({ value: 'tok-123' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    return origFetch(url, opts);
  };
}

async function boot(page, extra) {
  await page.addInitScript(({ extra }) => {
    localStorage.setItem('eiti_onboarded', 'true');
    for (const [k, v] of Object.entries(extra || {})) localStorage.setItem(k, v);
  }, { extra });
  await page.addInitScript(installMocks);
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof openView === 'function' && typeof eitiDb !== 'undefined' && !!eitiDb
    && !!window.EitiVoiceCore && typeof window.EitiVoice.state === 'function', null, { timeout: 20_000 });
  await page.evaluate(() => { const ob = document.getElementById('eiti-onboarding'); if (ob) ob.remove(); });
}

test('контроллер загружен: 6 адаптеров, старый API на месте, caps/alias', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => ({
    ids: EitiVoice.ids(), ad: Object.keys(EitiVoiceController.adapters),
    legacy: ['providers', 'current', 'active', 'start', 'stop', 'mute', 'isActive', 'offerSwitch', 'label', 'tr', 'needs', 'ids'].every((k) => k in EitiVoice),
    st: EitiVoice.state(), alisa: EitiVoice.caps('alisa'), cur: EitiVoice.current(), label: EitiVoice.label('yandex'),
  }));
  expect(r.ids.sort()).toEqual(['gemini', 'grok', 'mistral', 'openai', 'qwen', 'yandex']);
  expect(r.ad.sort()).toEqual(r.ids);
  expect(r.legacy).toBe(true);
  expect(r.st).toBe('idle');
  expect(r.alisa.needsProxy).toBe(true);
  expect(r.cur).toBe('grok');
  expect(r.label).toBe('Алиса (Яндекс)');
});

test('Gemini (mock WS): requesting_mic → listening → idle через события voice state', async ({ page }) => {
  await boot(page, { eiti_voice_provider: 'gemini' });
  await page.evaluate(() => {
    window.__st = []; EitiVoice.on('state', (e) => window.__st.push(e.state + ':' + e.provider));
    localStorage.setItem('eiti_gemini_key', _obfKey('AIza-shared')); chatLog.length = 0; openView('chat');
    eitiChatGrokToggle();
  });
  await page.waitForFunction(() => window.__ws.length === 1 && window.__ws[0].sent.length === 1);
  await page.evaluate(() => window.__ws[0].serverSend({ setupComplete: {} }, true));
  await page.waitForFunction(() => EitiVoice.state() === 'listening');
  await page.evaluate(() => eitiChatGrokToggle());
  const st = await page.evaluate(() => window.__st);
  expect(st).toContain('requesting_mic:gemini');
  expect(st).toContain('listening:gemini');
  expect(st[st.length - 1]).toBe('idle:');
  expect(await page.evaluate(() => EitiVoice.isActive())).toBe(false);
});

test('Grok (mock WS): тот же путь, состояние connecting:grok, стоп → idle', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { localStorage.setItem('eiti_grok_key', _obfKey('xai-test')); window.__st = []; EitiVoice.on('state', (e) => window.__st.push(e.state + ':' + e.provider)); eitiChatGrokToggle(); });
  await page.waitForFunction(() => window.__st.includes('requesting_mic:grok'));
  expect(await page.evaluate(() => EitiVoice.isActive())).toBe(true);
  await page.evaluate(() => eitiChatGrokToggle());
  expect(await page.evaluate(() => [EitiVoice.state(), window._grokVoiceActive])).toEqual(['idle', false]);
});

test('ошибка сокета → state error, код socket/auth, fallbackOrder только из готовых', async ({ page }) => {
  await boot(page, { eiti_voice_provider: 'gemini' });
  await page.evaluate(() => { localStorage.setItem('eiti_gemini_live_key', _obfKey('bad')); localStorage.removeItem('eiti_grok_key'); window.__err = []; EitiVoice.on('error', (e) => window.__err.push(e.code + ':' + e.provider)); eitiChatGrokToggle(); });
  await page.waitForFunction(() => window.__ws.length === 1 && window.__ws[0].readyState === 1);
  await page.evaluate(() => window.__ws[0].close(1007, 'API key not valid. Please pass a valid API key.'));
  await expect(page.locator('.toast', { hasText: 'Gemini Live: ключ отклонён' })).toHaveCount(1);
  const r = await page.evaluate(() => ({ fo: EitiVoice.fallbackOrder('gemini'), active: window._grokVoiceActive }));
  expect(r.active).toBe(false);
  expect(r.fo).not.toContain('gemini');
  expect(r.fo).not.toContain('grok'); // без ключа
});

test('localStorage не растёт из-за контроллера', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const before = JSON.stringify(Object.keys(localStorage).sort()), size = JSON.stringify(localStorage).length;
    EitiVoice.on('state', () => {}); EitiVoiceCore.setState('connecting', 'grok'); EitiVoiceCore.fail('socket', 'grok'); EitiVoiceCore.setState('idle');
    EitiVoice.caps('grok'); EitiVoice.fallbackOrder('grok');
    return { same: before === JSON.stringify(Object.keys(localStorage).sort()), grew: JSON.stringify(localStorage).length - size };
  });
  expect(r).toEqual({ same: true, grew: 0 });
});
