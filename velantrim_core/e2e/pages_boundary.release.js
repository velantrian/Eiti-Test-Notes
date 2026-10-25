// Run only with playwright.pages.config.js against an allowlisted Pages staging tree.
const { test, expect } = require('@playwright/test');

test('release has core assets and denies research/tooling URLs', async ({ request }) => {
  for (const path of [
    '/folklore/ancient/ancient.json',
    '/folklore/README.md',
    '/docs/ARCHITECTURE.md',
    '/scripts/build_pages.py',
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
  }
  for (const path of [
    '/index.html', '/manifest.json', '/sw.js',
    '/sql-wasm.wasm', '/offline/core.json', '/offline/packs/tales_caucasian.json',
    '/kb/index.json', '/kb/idx/physics.json', '/kb/packs/kb_physics.json',
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
  }
});

test('real PWA survives offline reload with already loaded tales and KB', async ({ page, context }) => {
  await page.addInitScript(() => {
    localStorage.setItem('eiti_onboarded', 'true');
    localStorage.setItem('eiti_toured_v7', '1');
    localStorage.setItem('eiti_install_hint_seen', '1');
    localStorage.removeItem('deepseek_api_key');
    localStorage.removeItem('eiti_apikey_deepseek');
  });
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.EitiOffline === 'object' && typeof window.EitiKBHost === 'object');
  await page.evaluate(() => navigator.serviceWorker.ready);
  const online = await page.evaluate(async () => {
    await EitiOffline.init();
    await EitiKBHost.init();
    const tale = await EitiOffline.reply('расскажи грузинскую сказку');
    const kb = await EitiKBHost.answer('почему небо голубое');
    return { tale: tale && tale.text, kb: kb && kb.a };
  });
  expect(online.tale).toBeTruthy();
  expect(online.kb).toContain('рэлеев');
  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/VELANTRIM EITI/i);
    const cached = await page.evaluate(async () => {
      await EitiOffline.init();
      await EitiKBHost.init();
      const tale = await EitiOffline.reply('расскажи грузинскую сказку');
      const kb = await EitiKBHost.answer('почему небо голубое');
      return { tale: tale && tale.text, kb: kb && kb.a };
    });
    expect(cached.tale).toBeTruthy();
    expect(cached.kb).toContain('рэлеев');
  } finally {
    await context.setOffline(false);
  }
});
