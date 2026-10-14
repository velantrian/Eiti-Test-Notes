// @ts-check
const { test, expect } = require('@playwright/test');

// Smoke tests for the EITI PWA. These intentionally avoid brittle deep-UI
// selectors and instead assert that the single-file app boots, the onboarding
// wizard can be bypassed, persistence APIs are available, and no fatal runtime
// errors occur. They are a safety net for "did a change break the whole app",
// which the pure-logic unit tests cannot catch.

// Bypass the first-run onboarding wizard by pre-seeding its localStorage flag.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('eiti_onboarded', 'true');
  });
});

test('app loads with the correct title', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page).toHaveTitle(/VELANTRIM EITI/i);
});

test('boots without fatal page errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/index.html');
  await page.waitForLoadState('networkidle');
  expect(errors, 'uncaught exceptions during boot:\n' + errors.join('\n')).toHaveLength(0);
});

test('main UI is present after onboarding is bypassed', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('body')).toBeVisible();
  // An onboarding overlay, if rendered, must not be blocking the app.
  const onboarding = page.locator('#onboardingOverlay, .onboarding-overlay');
  if (await onboarding.count()) {
    await expect(onboarding.first()).toBeHidden();
  }
});

test('browser persistence APIs are available', async ({ page }) => {
  await page.goto('/index.html');
  const caps = await page.evaluate(() => ({
    idb: typeof indexedDB !== 'undefined',
    ls: typeof localStorage !== 'undefined',
  }));
  expect(caps.idb).toBe(true);
  expect(caps.ls).toBe(true);
});

test('SQLite WASM engine asset is reachable', async ({ page }) => {
  const resp = await page.request.get('/sql-wasm.wasm');
  expect(resp.status()).toBe(200);
});
