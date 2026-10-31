// @ts-check
// v14.15.3: EITI Tell — офлайн «расскажи что-то / расскажи там / удиви меня / как ты думаешь» → мудрость / факт / история /
// размышление, «ещё» — следующий; «расскажи про луну» остаётся в базе знаний, «мне грустно» — в EITI Care. Без сети. 412×915.
const { test, expect } = require('@playwright/test');
const fs = require('fs');

const SHOT = fs.existsSync('/workspace') ? '/workspace/' : null;
async function shot(page, name) {
  if (!SHOT) return;
  await page.addStyleTag({ content: '.toast{display:none!important}' });
  await page.waitForTimeout(900); // анимация появления сообщения
  await page.screenshot({ path: SHOT + 'offline-v14153-' + name + '.png' });
}
test.use({ locale: 'ru-RU' });

async function boot(page) {
  await page.setViewportSize({ width: 412, height: 915 });
  await page.addInitScript(() => {
    localStorage.setItem('eiti_onboarded', 'true');
    localStorage.setItem('eiti_toured_v7', '1');
    localStorage.setItem('eiti_install_hint_seen', '1');
    localStorage.setItem('eiti_ai_provider', 'deepseek');
    localStorage.removeItem('deepseek_api_key');
    localStorage.removeItem('eiti_apikey_deepseek');
  });
  await page.goto('/index.html');
  await page.waitForFunction(() => window.eitiChatReady === true && typeof window.EitiTellHost === 'object' && typeof window.EitiFramesHost === 'object');
  await expect(page.locator('#splash')).toBeHidden();
  await page.addStyleTag({ content: '#eiti-pin-modal{display:none!important}' });
  await page.evaluate(() => { document.querySelectorAll('#eiti-onboarding,#eiti-pin-modal,.toast').forEach((e) => e.remove()); localStorage.setItem('eiti_offline_mode', '0'); });
}
const incoming = (page) => page.locator('#messages .message.incoming');
const last = (page) => incoming(page).last();
async function ask(page, text) {
  const n = await incoming(page).count();
  await page.locator('#input').fill(text);
  await page.locator('#send').click();
  await expect(incoming(page)).toHaveCount(n + 1, { timeout: 20000 });
  await page.waitForTimeout(300);
  return (await last(page).innerText());
}
function watchExternal(context) {
  const ext = [];
  context.on('request', (r) => { if (!/^http:\/\/127\.0\.0\.1:8099\//.test(r.url()) && !/^(data|blob):/.test(r.url())) ext.push(r.url()); });
  return ext;
}
const CAT = /Мудрость|Интересный факт|История|Размышление/;

test('«Расскажи что-то» → случайная категория, «ещё» → другое; «расскажи там», «удиви меня»', async ({ page, context }) => {
  await boot(page);
  const ext = watchExternal(context);
  const a = await ask(page, 'Расскажи что-то');
  expect(a).toMatch(CAT);
  expect(a).toContain('Скажи «ещё»');
  expect(a).not.toMatch(/нет в базе/i);
  await shot(page, '1-rasskazhi-chto-to');
  const b = await ask(page, 'ещё');
  expect(b).toMatch(CAT);
  expect(b).not.toBe(a);
  await shot(page, '2-eshche');
  expect(await ask(page, 'расскажи там')).toMatch(CAT);
  expect(await ask(page, 'удиви меня')).toMatch(CAT);
  expect(await ask(page, 'раскажи чтонибудь интересное')).toMatch(CAT);
  await shot(page, '3-variants');
  const st = await page.evaluate(() => window.EitiTellHost.stats);
  expect(st.hits).toBeGreaterThanOrEqual(5);
  expect(ext).toEqual([]);
});

test('«скажи, как ты думаешь» → размышление; «интересный факт» → факт; «скажи мудрость» → мудрость', async ({ page, context }) => {
  await boot(page);
  const ext = watchExternal(context);
  expect(await ask(page, 'скажи, как ты думаешь')).toContain('Размышление');
  expect(await ask(page, 'интересный факт')).toContain('Интересный факт');
  expect(await ask(page, 'скажи мудрость')).toContain('Мудрость');
  await shot(page, '4-categories');
  expect(ext).toEqual([]);
});

test('приоритеты: «расскажи про луну» — база знаний, «мне грустно» — EITI Care, «расскажи сказку» — сказки', async ({ page }) => {
  await boot(page);
  const moon = await ask(page, 'расскажи про луну');
  expect(moon).toContain('Луна');
  expect(moon).not.toMatch(CAT);
  const sad = await ask(page, 'мне грустно');
  expect(sad).not.toMatch(CAT);
  expect(sad).not.toMatch(/нет в базе/i);
  const tale = await ask(page, 'расскажи сказку');
  expect(tale).not.toMatch(/Интересный факт|Размышление/);
  await shot(page, '5-priorities');
  // после ответов других слоёв «ещё» к Tell не относится (disarm на проходе)
  expect(await page.evaluate(() => window.EitiTellHost.stats.hits)).toBe(0);
});
