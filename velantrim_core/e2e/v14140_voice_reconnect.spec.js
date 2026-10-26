// @ts-check
// EitiVoice P1-1: browser/network regression with synthetic WebSockets only.
// No model endpoint receives requests; alternate-provider activation requires an actual user click.
const { test, expect } = require('@playwright/test');
test.use({ locale: 'ru-RU' });

function browserMocks() {
  window.__voiceSockets = [];
  class FakeWS {
    constructor(url) {
      this.url = url; this.readyState = 0; this.sent = []; this.binaryType = 'blob'; this._listeners = {};
      window.__voiceSockets.push(this);
      setTimeout(() => { if (this.readyState === 0) { this.readyState = 1; this._emit('open', {}); } }, 10);
    }
    addEventListener(type, cb) { (this._listeners[type] = this._listeners[type] || []).push(cb); }
    _emit(type, data) {
      const ev = { ...data, stopped: false, stopImmediatePropagation() { this.stopped = true; } };
      for (const fn of this._listeners[type] || []) { fn(ev); if (ev.stopped) break; }
      if (!ev.stopped && typeof this['on' + type] === 'function') this['on' + type](ev);
    }
    send(value) { this.sent.push(typeof value === 'string' ? JSON.parse(value) : value); }
    close(code, reason) { this.serverClose(code || 1000, reason || ''); }
    serverClose(code, reason) {
      if (this.readyState === 3) return;
      this.readyState = 3; this._emit('close', { code, reason: reason || '' });
    }
    serverSend(data) { this._emit('message', { data: JSON.stringify(data) }); }
  }
  FakeWS.OPEN = 1; FakeWS.CONNECTING = 0; FakeWS.CLOSED = 3;
  window.WebSocket = FakeWS;
  const media = navigator.mediaDevices || {};
  media.getUserMedia = () => new Promise(() => {}); // never open a real microphone
  const oldFetch = window.fetch.bind(window);
  window.fetch = (url, opts) => {
    const target = String(url);
    if (['https://api.x.ai/', 'https://api.openai.com/', 'https://api.mistral.ai/',
         'https://generativelanguage.googleapis.com/'].some((prefix) => target.startsWith(prefix))) {
      return Promise.reject(new Error('Model calls forbidden by EitiVoice P1-1 test'));
    }
    return oldFetch(url, opts);
  };
}

async function boot(page) {
  await page.addInitScript(() => {
    localStorage.setItem('eiti_onboarded', 'true');
    localStorage.setItem('eiti_voice_provider', 'gemini');
  });
  await page.addInitScript(browserMocks);
  await page.goto('/index.html');
  await page.waitForFunction(() => !!window.EitiVoiceController && !!window.EitiVoiceCore &&
    typeof window.EitiVoice.offerSwitch === 'function' && typeof eitiDb !== 'undefined' && !!eitiDb,
    null, { timeout: 20000 });
  await page.evaluate(() => { const ob = document.getElementById('eiti-onboarding'); if (ob) ob.remove(); });
}

async function startGemini(page) {
  await page.evaluate(() => {
    localStorage.setItem('eiti_gemini_live_key', _obfKey('mock-only-key'));
    window.__states = [];
    EitiVoice.on('state', (ev) => window.__states.push(ev.state));
    EitiVoice.start('gemini');
  });
  await page.waitForFunction(() => window.__voiceSockets.length === 1 && window.__voiceSockets[0].sent.length > 0);
  await page.evaluate(() => window.__voiceSockets[0].serverSend({ setupComplete: {} }));
  await page.waitForFunction(() => EitiVoice.state() === 'listening');
}

test('Gemini WS reconnects after 1s and 3s, then offers only a ready provider', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    for (const id of EitiVoice.ids()) if (id !== 'gemini' && id !== 'openai') EitiVoice.providers[id].hasKey = () => false;
    EitiVoice.providers.openai.hasKey = () => true; // simulated readiness, never started
  });
  await startGemini(page);
  await page.evaluate(() => window.__voiceSockets[0].serverClose(1006, 'network lost'));
  await page.waitForFunction(() => EitiVoice.state() === 'reconnecting');
  await page.waitForFunction(() => window.__voiceSockets.length === 2, null, { timeout: 3000 });
  await page.evaluate(() => window.__voiceSockets[1].serverSend({ setupComplete: {} }));
  await page.waitForFunction(() => EitiVoice.state() === 'listening');
  await page.evaluate(() => window.__voiceSockets[1].serverClose(1006, 'network lost again'));
  await page.waitForFunction(() => EitiVoice.recoveryStatus().attempts === 2);
  await page.waitForFunction(() => window.__voiceSockets.length === 3, null, { timeout: 5500 });
  await page.evaluate(() => window.__voiceSockets[2].serverSend({ setupComplete: {} }));
  await page.waitForFunction(() => EitiVoice.state() === 'listening');
  await page.evaluate(() => window.__voiceSockets[2].serverClose(1006, 'third break'));
  await expect(page.locator('.eiti-voice-switch-toast .eiti-voice-switch-btn')).toHaveText(/Переключить на OpenAI Realtime/);
  const status = await page.evaluate(() => ({
    n: window.__voiceSockets.length, attempts: EitiVoice.recoveryStatus().attempts,
    exhausted: EitiVoice.recoveryStatus().exhausted, active: window._grokVoiceActive
  }));
  expect(status).toEqual({ n: 3, attempts: 2, exhausted: true, active: false });
  // No user click -> never create another (possibly paid) provider session.
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__voiceSockets.length)).toBe(3);
});

test('auth close 1008 has zero retries; no alternate -> text button focuses composer', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    for (const id of EitiVoice.ids()) if (id !== 'gemini') EitiVoice.providers[id].hasKey = () => false;
  });
  await startGemini(page);
  await page.evaluate(() => window.__voiceSockets[0].serverClose(1008, 'unauthorized key'));
  const btn = page.locator('.eiti-voice-switch-toast .eiti-voice-switch-btn');
  await expect(btn).toHaveText('Продолжить текстом');
  expect(await page.evaluate(() => EitiVoice.lastError().code)).toBe('auth');
  await btn.click();
  expect(await page.evaluate(() => document.activeElement && document.activeElement.id)).toBe('input');
  expect(await page.evaluate(() => window.__voiceSockets.length)).toBe(1);
  expect(await page.evaluate(() => EitiVoice.recoveryStatus().attempts)).toBe(0);
});

test('manual stop during scheduled recovery prevents a delayed reconnection', async ({ page }) => {
  await boot(page);
  await startGemini(page);
  await page.evaluate(() => window.__voiceSockets[0].serverClose(1006, 'lost'));
  await page.waitForFunction(() => EitiVoice.recoveryStatus().pending === true);
  await page.evaluate(() => EitiVoice.stop()); // no active transport, so explicit cancellation API
  await page.evaluate(() => EitiVoice.cancelReconnect());
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => window.__voiceSockets.length)).toBe(1);
});
