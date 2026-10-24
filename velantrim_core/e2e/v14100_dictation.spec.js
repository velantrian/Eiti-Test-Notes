// v14.10.0: 🎤 in the pill = speech-to-text dictation (Web Speech API, mocked); voice assistant lives in «+».
const { test, expect } = require('@playwright/test');

const SHOTS = process.env.EITI_SHOTS || '';

async function boot(page, loc, opts = {}) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(({ l, o }) => {
    localStorage.setItem('eiti_onboarded', 'true'); localStorage.setItem('eiti_toured_v7', '1'); localStorage.setItem('eiti_install_hint_seen', '1');
    localStorage.setItem('eiti_locale', l);
    window.__sr = { instances: [], available: [], installs: [], voiceOpened: 0 };
    if (o.noSR) { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; return; }
    class FakeSR {
      constructor() { this.lang = ''; this.interimResults = false; this.continuous = false; this.processLocally = false; window.__sr.instances.push(this); }
      start() { this.started = true; }
      stop() { this.stopped = true; setTimeout(() => this.onend && this.onend(), 0); }
      abort() { this.aborted = true; setTimeout(() => this.onend && this.onend(), 0); }
      emit(parts) { // parts: [[text, isFinal], ...]
        const results = parts.map(([t, f]) => Object.assign([{ transcript: t, confidence: 0.9 }], { isFinal: f }));
        this.onresult && this.onresult({ resultIndex: 0, results });
      }
      fail(error) { this.onerror && this.onerror({ error }); this.onend && this.onend(); }
    }
    if (o.local) {
      FakeSR.available = (opts) => { window.__sr.available.push(opts); return Promise.resolve(o.local); };
      FakeSR.install = (opts) => { window.__sr.installs.push(opts); return Promise.resolve(true); };
    }
    window.webkitSpeechRecognition = FakeSR; delete window.SpeechRecognition;
    if (o.offline) Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
  }, { l: loc, o: opts });
  await page.goto('/index.html');
  await page.waitForFunction(() => window.eitiChatReady === true, null, { timeout: 30000 });
  await page.addStyleTag({ content: '#eiti-pin-modal{display:none!important}' });
  await page.evaluate(() => {
    document.querySelectorAll('#eiti-onboarding,#eiti-pin-modal,.toast').forEach((e) => e.remove());
    const orig = window.eitiToggleGrokVoice; window.eitiToggleGrokVoice = function () { window.__sr.voiceOpened++; };
    window.EitiVoice && (window.EitiVoice.start = () => { window.__sr.voiceOpened++; });
  });
}
const last = (page) => page.evaluate(() => { const a = window.__sr.instances; const r = a[a.length - 1]; return r && { lang: r.lang, interim: r.interimResults, local: r.processLocally, started: !!r.started }; });

test('mic dictates into the input (interim live, final kept), does not send, does not open the voice assistant', async ({ page }) => {
  await boot(page, 'ru');
  const mic = page.locator('#eiti-composer-mic');
  await page.locator('#input').fill('Привет,');
  const before = await page.locator('#messages .message').count();
  await mic.click();
  expect(await last(page)).toEqual({ lang: 'ru-RU', interim: true, local: false, started: true });
  await expect(mic).toHaveClass(/eiti-recording/);
  await expect(mic).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => window.__sr.instances[0].emit([['как', false]]));
  await expect(page.locator('#input')).toHaveValue('Привет, как');
  await page.evaluate(() => window.__sr.instances[0].emit([['как дела', true], [' у тебя', false]]));
  await expect(page.locator('#input')).toHaveValue('Привет, как дела у тебя');
  if (SHOTS || true) await page.screenshot({ path: '/workspace/screens/mic-dictation.png' }).catch(() => {});
  await mic.click(); // tap to stop
  await expect(mic).not.toHaveClass(/eiti-recording/);
  await expect(page.locator('#input')).toHaveValue('Привет, как дела');
  expect(await page.locator('#messages .message').count()).toBe(before); // not sent
  expect(await page.evaluate(() => window.__sr.voiceOpened)).toBe(0);
});

test('recognition language follows the app language (en-US / de-DE)', async ({ page }) => {
  await boot(page, 'de');
  await page.locator('#eiti-composer-mic').click();
  expect((await last(page)).lang).toBe('de-DE');
  await expect(page.locator('#eiti-composer-mic')).toHaveAttribute('aria-label', 'Aufnahme stoppen');
});

test('errors → translated toasts (EN): permission, no speech', async ({ page }) => {
  await boot(page, 'en');
  const mic = page.locator('#eiti-composer-mic');
  await mic.click();
  await page.evaluate(() => window.__sr.instances[0].fail('not-allowed'));
  await expect(page.locator('.toast').last()).toContainText('No microphone access');
  await expect(mic).not.toHaveClass(/eiti-recording/);
  await mic.click();
  await page.evaluate(() => window.__sr.instances[1].fail('no-speech'));
  await expect(page.locator('.toast').last()).toContainText('No speech detected');
});

test('unsupported browser → translated toast, mic disabled', async ({ page }) => {
  await boot(page, 'de', { noSR: true });
  const mic = page.locator('#eiti-composer-mic');
  await expect(mic).toHaveAttribute('aria-disabled', 'true');
  await mic.click({ force: true }); // aria-disabled, but a tap still explains why
  await expect(page.locator('.toast').last()).toContainText('Spracheingabe wird in diesem Browser nicht unterstützt');
});

test('network error → falls back to on-device recognition (processLocally)', async ({ page }) => {
  await boot(page, 'en', { local: 'available' });
  await page.locator('#eiti-composer-mic').click();
  expect((await last(page)).local).toBe(false);
  await page.evaluate(() => window.__sr.instances[0].fail('network'));
  await expect.poll(() => page.evaluate(() => window.__sr.instances.length)).toBe(2);
  expect(await last(page)).toEqual({ lang: 'en-US', interim: true, local: true, started: true });
  expect(await page.evaluate(() => window.__sr.available[0])).toEqual({ langs: ['en-US'], processLocally: true });
  await page.evaluate(() => window.__sr.instances[1].emit([['hello offline', true]]));
  await expect(page.locator('#input')).toHaveValue('hello offline');
});

test('offline + downloadable pack → install() then on-device', async ({ page }) => {
  await boot(page, 'ru', { local: 'downloadable', offline: true });
  await page.locator('#eiti-composer-mic').click();
  await expect.poll(() => page.evaluate(() => window.__sr.instances.length)).toBe(1);
  expect(await page.evaluate(() => window.__sr.installs.length)).toBe(1);
  expect((await last(page)).local).toBe(true);
});

test('offline, no on-device support → Gboard hint toast', async ({ page }) => {
  await boot(page, 'en', { offline: true });
  await page.locator('#eiti-composer-mic').click();
  await expect(page.locator('.toast').last()).toContainText('Gboard');
  expect(await page.evaluate(() => window.__sr.instances.length)).toBe(0);
  await expect(page.locator('#eiti-composer-mic')).not.toHaveClass(/eiti-recording/);
});

test('«+» menu has the voice assistant (with provider + change link → Settings), diary popup has a shortcut', async ({ page }) => {
  await boot(page, 'ru');
  await page.locator('#chat-plus-btn').click();
  const item = page.locator('#chat-plus-popup .chat-plus-item', { hasText: 'Голосовой ассистент' });
  await expect(item).toBeVisible();
  await expect(item.locator('.cpi-voice-prov')).toHaveText(/Grok Voice|Gemini Live/);
  await page.screenshot({ path: '/workspace/screens/plus-menu.png' }).catch(() => {});
  await item.locator('.cpi-voice-change').click();
  await expect(page.locator('#ai-voice-provider')).toBeVisible();
  await expect(page.locator('#ai-voice-provider')).toBeInViewport();
  expect(await page.evaluate(() => window.__sr.voiceOpened)).toBe(0); // «change» only opens settings
  // the item itself still starts the assistant
  await page.locator('.tab-item[data-view="chat"]').evaluate((el) => el.click());
  await page.locator('#chat-plus-btn').click();
  await page.locator('#chat-plus-popup .chat-plus-item', { hasText: 'Голосовой ассистент' }).locator('.cpi-label').click();
  // diary shortcut exists and opens the same setting
  expect(await page.locator('#rne-voice-settings-link').count()).toBe(1);
  await page.evaluate(() => window.eitiOpenVoiceSettings());
  await expect(page.locator('#ai-voice-provider')).toBeInViewport();
});
