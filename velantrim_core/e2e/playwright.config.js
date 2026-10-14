// @ts-check
const { defineConfig } = require('@playwright/test');

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
  webServer: {
    command: 'python3 -m http.server 8099 --directory ../..',
    url: 'http://127.0.0.1:8099/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
