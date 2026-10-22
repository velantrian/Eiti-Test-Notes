// @ts-check
const { defineConfig, devices } = require('@playwright/test');

// Smoke-level E2E config for the EITI single-file PWA.
// Serves the repo root over http:// (Service Workers refuse file://).
module.exports = defineConfig({
  testDir: '.',
  testMatch: '*.spec.js',
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:8099',
    headless: true,
    // Allow pointing at a pre-installed Chromium when the Playwright browser
    // download is blocked (e.g. restricted networks). Unset in CI, where
    // `npx playwright install` provides the matching browser.
    launchOptions: process.env.PW_CHROMIUM_PATH
      ? { executablePath: process.env.PW_CHROMIUM_PATH }
      : undefined,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    // v13.8.1: iPhone Safari (WebKit). Run with `--project=webkit-iphone`.
    // CI installs only Chromium, so there the project is opt-in (PW_WEBKIT=1).
    // - serviceWorkers:'block' — otherwise the SW intercepts fetch and page.route() AI mocks never fire;
    // - storageState — the install hint counts as already shown (banner never blocks clicks).
    ...(!process.env.CI || process.env.PW_WEBKIT ? [{
      name: 'webkit-iphone',
      testIgnore: /freeze_smoke\.spec\.js/, // CDP metrics — Chromium only
      // Live-voice specs mock getUserMedia/AudioContext the Chromium way; WebKit's audio stack differs.
      grepInvert: /Gemini Live|Grok \(xAI\) путь/,
      use: {
        ...devices['iPhone 13'],
        serviceWorkers: 'block',
        storageState: {
          cookies: [],
          origins: [{ origin: 'http://127.0.0.1:8099', localStorage: [{ name: 'eiti_install_hint_seen', value: '1' }, { name: 'eiti_toured_v7', value: '1' }] }],
        },
      },
    }] : []),
  ],
  webServer: {
    command: 'python3 -m http.server 8099 --directory ../..',
    url: 'http://127.0.0.1:8099/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
