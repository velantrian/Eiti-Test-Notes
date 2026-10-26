// @ts-check
const { test, expect } = require('@playwright/test');
// EitiVoice P0-3: один общий запрос микрофона и одинаковые локализованные ошибки (RU/EN/DE)

function micMocks(mode) {
  window.__ws = [];
  window.WebSocket = class { constructor() { window.__ws.push(this); } send() {} close() {} };
  const md = navigator.mediaDevices || {};
  window.__gum = 0;
  md.getUserMedia = () => {
    window.__gum++;
    const name = mode === 'absent' ? 'NotFoundError' : 'NotAllowedError';
    return Promise.reject(new DOMException('Permission denied', name));
  };
}

async function boot(page, locale, mode, extra) {
  await page.addInitScript(({ extra }) => {
    localStorage.setItem('eiti_onboarded', 'true');
    for (const [k, v] of Object.entries(extra || {})) localStorage.setItem(k, v);
  }, { extra });
  await page.addInitScript(micMocks, mode);
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof openView === 'function' && typeof eitiDb !== 'undefined' && !!eitiDb && !!window.EitiVoiceCore, null, { timeout: 20_000 });
  await page.evaluate(() => { const ob = document.getElementById('eiti-onboarding'); if (ob) ob.remove(); });
}

const CASES = [
  { locale: 'ru-RU', text: 'Нет доступа к микрофону' },
  { locale: 'en-US', text: 'No microphone access' },
  { locale: 'de-DE', text: 'Kein Mikrofonzugriff' },
];
for (const c of CASES) {
  test.describe(c.locale, () => {
    test.use({ locale: c.locale });
    test(`Grok: отказ в микрофоне → mic_denied, понятный тост, кнопка не висит (${c.locale})`, async ({ page }) => {
      await boot(page, c.locale, 'denied');
      await page.evaluate(() => { localStorage.setItem('eiti_grok_key', _obfKey('xai-test')); eitiChatGrokToggle(); });
      await expect(page.locator('.toast', { hasText: c.text }).first()).toBeVisible();
      const r = await page.evaluate(() => ({ st: EitiVoice.state(), code: EitiVoice.lastError() && EitiVoice.lastError().code, a: window._grokVoiceActive, gum: window.__gum, ws: window.__ws.length }));
      expect(r).toEqual({ st: 'error', code: 'mic_denied', a: false, gum: 1, ws: 0 });
    });
  });
}

test.describe('один путь для всех провайдеров', () => {
  test.use({ locale: 'ru-RU' });
  test('Mistral: нет микрофона → mic_absent через тот же eitiVoiceMic', async ({ page }) => {
    await boot(page, 'ru-RU', 'absent', { eiti_voice_provider: 'mistral' });
    await page.evaluate(() => { localStorage.setItem('eiti_mistral_key', _obfKey('m-test')); EitiVoice.start('mistral'); });
    await expect(page.locator('.toast', { hasText: 'Микрофон не найден' }).first()).toBeVisible();
    const r = await page.evaluate(() => ({ st: EitiVoice.state(), code: EitiVoice.lastError().code, prov: EitiVoice.lastError().provider, a: window._grokVoiceActive, gum: window.__gum }));
    expect(r).toEqual({ st: 'error', code: 'mic_absent', prov: 'mistral', a: false, gum: 1 });
  });
});
