// @ts-check
const { test, expect } = require('@playwright/test');

// v13.7.22: «💾 Сохранить чат» в меню «+», AI Voice (Grok xAI / Gemini Live) в настройках,
// mock WebSocket для Gemini Live и Grok, тихое обновление без тоста версии.

const SHOTS = process.env.EITI_SHOTS_DIR || '';

// интерфейс на русском (локаль браузера определяет язык UI)
test.use({ locale: 'ru-RU' });

// Подменяем WebSocket / getUserMedia / fetch x.ai — без сети и реальных ключей.
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
    serverSend(obj, binary) {
      const s = JSON.stringify(obj);
      this.onmessage && this.onmessage({ data: binary ? new TextEncoder().encode(s).buffer : s });
    }
  }
  FakeWS.OPEN = 1;
  window.WebSocket = FakeWS;
  const md = navigator.mediaDevices || {};
  md.getUserMedia = () => {
    if (window.__micMode === 'stream') {
      const ctx = new AudioContext();
      return Promise.resolve(ctx.createMediaStreamDestination().stream);
    }
    return new Promise(() => {}); // «ждём разрешения» — микрофон не нужен для проверки протокола
  };
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
  await page.waitForFunction(() => typeof openView === 'function' && typeof window.eitiChatPlusToggle === 'function'
    && typeof window.eitiChatSaveAs === 'function' && typeof eitiDb !== 'undefined' && !!eitiDb, null, { timeout: 20_000 });
  await page.evaluate(() => { const ob = document.getElementById('eiti-onboarding'); if (ob) ob.remove(); });
}

async function seedChat(page) {
  await page.evaluate(() => {
    const t0 = new Date(2026, 9, 22, 14, 5).getTime();
    chatLog.length = 0;
    chatLog.push({ id: 's1', role: 'system', text: 'SYSTEM-SECRET', ts: t0 });
    chatLog.push({ id: 'u1', role: 'user', text: 'Привет, EITI', ts: t0 });
    chatLog.push({ id: 'a1', role: 'ai', text: 'Здравствуйте!', ts: t0 + 60000, provider: 'deepseek' });
    openView('chat');
  });
}

async function openPlus(page) {
  await page.evaluate(() => { const p = document.getElementById('chat-plus-popup'); if (p) { p.style.display = 'none'; p.classList.remove('open'); } });
  await page.click('#chat-plus-btn');
  await expect(page.locator('#chat-plus-popup')).toBeVisible();
}

for (const theme of ['ios6-leather', 'paper-light']) {
  test(`меню «+»: «💾 Сохранить чат» после «Скопировать чат», выбор формата (${theme})`, async ({ page }) => {
    await boot(page, { theme });
    await seedChat(page);
    await openPlus(page);
    const labels = await page.locator('#chat-plus-popup .cpi-label').allTextContents();
    const i = labels.indexOf('Скопировать чат');
    expect(i).toBeGreaterThanOrEqual(0);
    expect(labels[i + 1]).toBe('Сохранить чат');
    expect(labels.join('|')).not.toContain('Grok Voice');
    expect(labels).toContain('AI Voice');
    const tag = theme === 'paper-light' ? '-light' : '';
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/after-chat-menu${tag}.png` });

    await page.locator('#chat-plus-popup .chat-plus-item', { hasText: 'Сохранить чат' }).click();
    await expect(page.locator('#chat-plus-popup [data-chat-save]')).toHaveCount(3);
    await expect(page.locator('#chat-plus-popup [data-chat-save="md"]')).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/after-chat-save-picker${tag}.png` });

    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#chat-plus-popup [data-chat-save="md"]'),
    ]);
    expect(dl.suggestedFilename()).toMatch(/^chat-.+-\d{4}-\d{2}-\d{2}\.md$/);
    const fs = require('fs');
    const text = fs.readFileSync(await dl.path(), 'utf8').replace(/^\uFEFF/, '');
    expect(text).toContain('**Вы** · 22.10.2026 14:05\n\nПривет, EITI');
    expect(text).toContain('**DeepSeek** · 22.10.2026 14:06\n\nЗдравствуйте!');
    expect(text).not.toContain('SYSTEM-SECRET');
    await expect(page.locator('#chat-plus-popup')).toBeHidden();
  });
}

test('«Сохранить чат» виден и при старых сохранённых настройках панели (без ключа saveChat)', async ({ page }) => {
  await boot(page, { eiti_chat_panel_btns: JSON.stringify({ attach: true, deepseek: true, image: false, grok: true, grokMute: true, copyChat: true, clearInput: true }) });
  await seedChat(page);
  await openPlus(page);
  await expect(page.locator('#chat-plus-popup .cpi-label', { hasText: 'Сохранить чат' })).toHaveCount(1);
});

test('TXT-экспорт: точный текст с ролями', async ({ page }) => {
  await boot(page);
  await seedChat(page);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => window.eitiChatSaveAs('txt'))]);
  expect(dl.suggestedFilename()).toMatch(/\.txt$/);
  const text = require('fs').readFileSync(await dl.path(), 'utf8').replace(/^\uFEFF/, '');
  expect(text).toMatch(/^.+\nЭкспорт: \d\d\.\d\d\.\d{4} \d\d:\d\d\n\n\[22\.10\.2026 14:05\] Вы:\nПривет, EITI\n\n\[22\.10\.2026 14:06\] DeepSeek:\nЗдравствуйте!\n$/);
});

test('Настройки AI Voice: провайдер/модель/голос сохраняются; без «Grok Voice»', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => openView('settings'));
  const box = page.locator('#ai-voice-settings');
  await box.scrollIntoViewIfNeeded();
  await expect(page.locator('#ai-voice-provider')).toHaveValue('grok');
  await expect(page.locator('#ai-voice-gemini-box')).toBeHidden();
  await page.selectOption('#ai-voice-provider', 'gemini');
  await expect(page.locator('#ai-voice-gemini-box')).toBeVisible();
  await page.selectOption('#gemini-live-model', 'gemini-3.8-live-extended-thinking');
  await page.selectOption('#gemini-live-voice', 'Kore');
  await page.fill('#gemini-live-key', 'AIza-test-key');
  await page.locator('#gemini-live-key').blur();
  const st = await page.evaluate(() => ({
    p: localStorage.getItem('eiti_voice_provider'), m: localStorage.getItem('eiti_gemini_live_model'),
    v: localStorage.getItem('eiti_gemini_live_voice'), k: _deobfKey(localStorage.getItem('eiti_gemini_live_key') || ''),
  }));
  expect(st).toEqual({ p: 'gemini', m: 'gemini-3.8-live-extended-thinking', v: 'Kore', k: 'AIza-test-key' });
  await page.reload();
  await page.waitForFunction(() => typeof openView === 'function' && typeof window.eitiVoiceSettingsRender === 'function');
  await page.evaluate(() => { const ob = document.getElementById('eiti-onboarding'); if (ob) ob.remove(); openView('settings'); });
  await expect(page.locator('#ai-voice-provider')).toHaveValue('gemini');
  await expect(page.locator('#gemini-live-model')).toHaveValue('gemini-3.8-live-extended-thinking');
  await expect(page.locator('#gemini-live-voice')).toHaveValue('Kore');
  const visible = await page.evaluate(() => document.body.innerText);
  expect(visible).not.toContain('Grok Voice');
  await page.locator('#ai-voice-settings').scrollIntoViewIfNeeded();
  if (SHOTS) { await page.evaluate(() => document.getElementById('ai-voice-settings').scrollIntoView({ block: 'center' })); await page.waitForTimeout(300); await page.screenshot({ path: `${SHOTS}/after-chat-settings-voice.png` }); }
});

test('Настройки AI Voice — светлая тема (скриншот) и Grok по умолчанию', async ({ page }) => {
  await boot(page, { theme: 'paper-light', eiti_voice_provider: 'gemini' });
  await page.evaluate(() => openView('settings'));
  await page.locator('#ai-voice-settings').scrollIntoViewIfNeeded();
  await expect(page.locator('#gemini-live-model')).toHaveValue('gemini-3.8-live');
  await expect(page.locator('#gemini-live-voice')).toHaveValue('Puck');
  if (SHOTS) { await page.evaluate(() => document.getElementById('ai-voice-settings').scrollIntoView({ block: 'center' })); await page.waitForTimeout(300); await page.screenshot({ path: `${SHOTS}/after-chat-settings-voice-light.png` }); }
  await page.selectOption('#ai-voice-provider', 'grok');
  await expect(page.locator('#ai-voice-grok-box')).toBeVisible();
  await expect(page.locator('#grok-live-model')).toBeDisabled();
});

test('Gemini Live (mock WS): URL, setup, setupComplete, транскрипт → chatLog, mute, текст, стоп', async ({ page }) => {
  await boot(page, { eiti_voice_provider: 'gemini', eiti_gemini_live_voice: 'Charon' });
  await page.evaluate(() => { localStorage.setItem('eiti_gemini_key', _obfKey('AIza-shared')); chatLog.length = 0; openView('chat'); });
  await page.evaluate(() => eitiChatGrokToggle());
  await page.waitForFunction(() => window.__ws.length === 1 && window.__ws[0].sent.length === 1);
  const first = await page.evaluate(() => ({ url: window.__ws[0].url, protocols: window.__ws[0].protocols, bt: window.__ws[0].binaryType, msg: window.__ws[0].sent[0] }));
  expect(first.url).toBe('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=AIza-shared');
  expect(first.protocols).toBeUndefined();
  expect(first.bt).toBe('arraybuffer');
  expect(Object.keys(first.msg)).toEqual(['setup']);
  expect(first.msg.setup.model).toBe('models/gemini-3.8-live');
  expect(first.msg.setup.generationConfig).toEqual({ responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } } });
  expect(first.msg.setup.inputAudioTranscription).toEqual({});
  expect(first.msg.setup.outputAudioTranscription).toEqual({});
  expect(first.msg.setup.systemInstruction.parts[0].text).toContain('AI Voice');

  await page.evaluate(() => window.__ws[0].serverSend({ setupComplete: {} }, true)); // бинарный кадр
  await expect(page.locator('.toast', { hasText: 'AI Voice (Gemini) слушает' })).toHaveCount(1);
  await page.evaluate(() => {
    const ws = window.__ws[0];
    ws.serverSend({ serverContent: { inputTranscription: { text: 'Как дела?' } } });
    ws.serverSend({ serverContent: { outputTranscription: { text: 'Отлично, ' } } });
    ws.serverSend({ serverContent: { outputTranscription: { text: 'спасибо!' } } });
    ws.serverSend({ serverContent: { turnComplete: true } });
  });
  const log = await page.evaluate(() => chatLog.map((m) => ({ role: m.role, text: m.text, provider: m.provider })));
  expect(log).toEqual([
    { role: 'user', text: '[🎤 Голос] Как дела?', provider: undefined },
    { role: 'assistant', text: '[🗣️ AI Voice] Отлично, спасибо!', provider: 'gemini-live' },
  ]);
  await expect(page.locator('#messages')).toContainText('Отлично, спасибо!');

  await page.evaluate(() => eitiGrokMuteToggle());
  await page.evaluate(() => window.eitiGrokSendText('Напиши кратко'));
  const sent = await page.evaluate(() => window.__ws[0].sent.slice(1));
  expect(sent).toEqual([{ realtimeInput: { audioStreamEnd: true } }, { realtimeInput: { text: 'Напиши кратко' } }]);

  await page.evaluate(() => eitiChatGrokToggle());
  expect(await page.evaluate(() => ({ a: window._grokVoiceActive, m: window._grokMuted, rs: window.__ws[0].readyState }))).toEqual({ a: false, m: false, rs: 3 });
});

test('Gemini Live: нет ключа → русский тост; закрытие сервером → понятная ошибка', async ({ page }) => {
  await boot(page, { eiti_voice_provider: 'gemini' });
  await page.evaluate(() => { localStorage.removeItem('eiti_gemini_key'); localStorage.removeItem('eiti_gemini_live_key'); eitiChatGrokToggle(); });
  await expect(page.locator('.toast', { hasText: 'Нет ключа Gemini' })).toHaveCount(1);
  expect(await page.evaluate(() => window.__ws.length)).toBe(0);
  await page.evaluate(() => { localStorage.setItem('eiti_gemini_live_key', _obfKey('bad')); eitiChatGrokToggle(); });
  await page.waitForFunction(() => window.__ws.length === 1 && window.__ws[0].readyState === 1);
  await page.evaluate(() => window.__ws[0].close(1007, 'API key not valid. Please pass a valid API key.'));
  await expect(page.locator('.toast', { hasText: 'Gemini Live: ключ отклонён' })).toHaveCount(1);
  expect(await page.evaluate(() => window._grokVoiceActive)).toBe(false);
});

test('Grok (xAI) путь без изменений: client_secrets → wss api.x.ai + подпротокол, session.update', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { window.__micMode = 'stream'; localStorage.setItem('eiti_grok_key', _obfKey('xai-test')); localStorage.setItem('eiti_grok_voice_name', 'Eve'); eitiChatGrokToggle(); });
  await page.waitForFunction(() => window.__ws.length === 1 && window.__ws[0].sent.length >= 1, null, { timeout: 10_000 });
  const r = await page.evaluate(() => ({ url: window.__ws[0].url, protocols: window.__ws[0].protocols, m: window.__ws[0].sent[0] }));
  expect(r.url).toBe('wss://api.x.ai/v1/realtime?model=grok-voice-latest');
  expect(r.protocols).toEqual(['xai-client-secret.tok-123']);
  expect(r.m.type).toBe('session.update');
  expect(r.m.session.voice).toBe('eve');
  expect(r.m.session.input_audio_format).toBe('pcm16');
  expect(Array.isArray(r.m.session.tools)).toBe(true);
  await page.evaluate(() => eitiChatGrokToggle());
  expect(await page.evaluate(() => window._grokVoiceActive)).toBe(false);
});

test('Тихое обновление: нет тоста с версией при запуске и на SW_UPDATED', async ({ page }) => {
  await boot(page);
  await page.waitForTimeout(2500);
  const versionToast = () => page.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent).filter((t) => /13\.\d+\.\d+|Обновлени/.test(t)));
  expect(await versionToast()).toEqual([]);
  const handled = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 'no-sw';
    navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: { type: 'SW_UPDATED', version: '13.7.22' } }));
    await new Promise((r) => setTimeout(r, 300));
    return window._eitiSwUpdatedVersion;
  });
  expect(handled).toBe('13.7.22');
  expect(await versionToast()).toEqual([]);
  const ver = await page.evaluate(() => window.EITI_VERSION);
  await expect(page.locator('#about-version-label')).toHaveText(new RegExp('VELANTRIM EITI v' + ver.replace(/\./g, '\\.')));
});
