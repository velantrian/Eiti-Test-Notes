// @ts-check
// v14.1.0: KB library — lazy load (one domain pack), offline answer without a key, AI context block, tales not hijacked.
const { test, expect } = require('@playwright/test');

async function boot(page) {
  await page.addInitScript(() => {
    localStorage.setItem('eiti_onboarded', 'true');
    localStorage.setItem('eiti_toured_v7', '1');
    localStorage.setItem('eiti_install_hint_seen', '1');
    localStorage.setItem('eiti_ai_provider', 'deepseek');
    localStorage.removeItem('deepseek_api_key');
    localStorage.removeItem('eiti_apikey_deepseek');
  });
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.EitiKBHost === 'object' && typeof window.EitiOffline === 'object');
  await expect(page.locator('#splash')).toBeHidden();
  await page.addStyleTag({ content: '#eiti-pin-modal{display:none!important}' });
  await page.evaluate(() => { document.querySelectorAll('#eiti-onboarding,#eiti-pin-modal,.toast').forEach((e) => e.remove()); localStorage.removeItem('eiti_ds_off'); localStorage.setItem('eiti_offline_mode', '0'); });
}

async function send(page, text) {
  await page.locator('#input').fill(text);
  await page.locator('#send').click();
}

test('главный поток не блокируется надолго при индексации 11k статей', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(async () => {
    let worst = 0, last = performance.now(), stop = false;
    (function tick() { const n = performance.now(); worst = Math.max(worst, n - last); last = n; if (!stop) setTimeout(tick, 0); })();
    await EitiKBHost.init(); stop = true;
    return { worst, stats: EitiKBHost.stats };
  });
  console.log('kb main-thread worst gap ms', Math.round(r.worst), JSON.stringify(r.stats));
  expect(r.worst).toBeLessThan(400);
});

test('KB не грузится на старте, init быстрый, грузится только нужный пакет', async ({ page }) => {
  const req = [];
  page.on('request', (r) => { if (/\/kb\//.test(r.url())) req.push(r.url()); });
  await boot(page);
  expect(req.length).toBe(0);
  const r = await page.evaluate(async () => {
    const t0 = performance.now(); await EitiKBHost.init(); const init = performance.now() - t0;
    const t1 = performance.now(); const a = await EitiKBHost.answer('почему небо голубое'); const ans = performance.now() - t1;
    return { init, ans, text: a && a.a, stats: EitiKBHost.stats };
  });
  expect(r.text).toContain('рэлеев');
  expect(req.some((u) => /kb\/index\.json/.test(u))).toBe(true);
  const packs = req.filter((u) => /kb\/packs\//.test(u));
  expect(packs.length).toBe(1);
  expect(packs[0]).toMatch(/kb_physics\.json/);
  expect(req.filter((u) => /kb\/idx\//.test(u)).length).toBe(r.stats.shards);
  expect(r.stats.entries).toBeGreaterThanOrEqual(10000);
  expect(r.init).toBeLessThan(15000);
  console.log('kb timing', JSON.stringify({ init: Math.round(r.init), answer: Math.round(r.ans), stats: r.stats }));
});

test('чат без ключа: ответ из библиотеки знаний, сказки и диалоги не перехвачены', async ({ page }) => {
  await boot(page);
  const msgs = page.locator('#messages .message.incoming');
  await send(page, 'почему небо голубое');
  await expect(msgs.last()).toContainText('KB', { timeout: 15000 });
  await expect(msgs.last()).toContainText('рэлеев');
  await send(page, 'какая столица Австралии');
  await expect(msgs.last()).toContainText('Канберра', { timeout: 15000 });
  await send(page, 'кто такой Никола Тесла');
  await expect(msgs.last()).toContainText('Тесла', { timeout: 15000 });
  await expect(msgs.last()).toContainText('KB');
  await send(page, 'расскажи сказку на ночь');
  await expect(msgs.last()).not.toContainText('🧠 KB', { timeout: 15000 });
  await send(page, 'привет, как дела?');
  await expect(msgs.last()).not.toContainText('🧠 KB', { timeout: 15000 });
});

test('с ключом: в системный контекст ИИ добавлен блок БИБЛИОТЕКА ЗНАНИЙ', async ({ page }) => {
  await boot(page);
  let body = '';
  await page.route('https://api.deepseek.com/v1/chat/completions', async (route) => {
    body = route.request().postData() || '';
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ choices: [{ message: { role: 'assistant', content: 'ок' } }] }) });
  });
  await page.evaluate(() => EitiKBHost.init()); // как после фонового прогрева (load + 6 c)
  await page.evaluate(() => { localStorage.setItem('deepseek_api_key', 'sk-test'); localStorage.setItem('eiti_apikey_deepseek', 'sk-test'); });
  await send(page, 'почему небо голубое днём');
  await expect.poll(() => body.length, { timeout: 20000 }).toBeGreaterThan(0);
  expect(body).toContain('БИБЛИОТЕКА ЗНАНИЙ EITI');
  expect(body).toContain('рэлеев');
});
