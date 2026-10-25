// Release-preview suite: run real PWA tests from the staged Pages artifact, not repo root.
const { defineConfig } = require('@playwright/test');
const base = require('./playwright.config.js');
const site = process.env.EITI_PAGES_SITE_DIR;
if (!site) throw new Error('EITI_PAGES_SITE_DIR is required for release-preview tests');

module.exports = defineConfig({
  ...base,
  testMatch: [
    '**/pages_boundary.release.js',
    '**/smoke.spec.js',
    '**/v1400_offline.spec.js',
    '**/v1410_kb.spec.js',
  ],
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    ...base.webServer,
    command: 'python3 -m http.server 8099 --directory ' + JSON.stringify(site),
    reuseExistingServer: false,
  },
});
