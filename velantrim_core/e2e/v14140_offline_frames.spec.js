// @ts-check
// v14.14.0: EITI Frames — «Расскажи о науке» / «о науке расскажи» без ключа, уточнения, честный ответ с кнопками,
// 🌐 Википедия (мок: успех, тайм-аут, офлайн), переключатель в настройках. Скриншоты 412×915 → /workspace/offline-*.png (если есть).
const { test, expect } = require('@playwright/test');
const fs = require('fs');

const SHOT = fs.existsSync('/workspace') ? '/workspace/' : null;
async function shot(page, name) {
  if (!SHOT) return;
  await page.addStyleTag({ content: '.toast{display:none!important}' });
  await page.waitForTimeout(900); // анимация появления сообщения
  await page.screenshot({ path: SHOT + 'offline-' + name + '.png' });
}
test.use({ locale: 'ru-RU' });

async function boot(page, wiki) {
  await page.setViewportSize({ width: 412, height: 915 });
  await page.addInitScript((w) => {
    localStorage.setItem('eiti_onboarded', 'true');
    localStorage.setItem('eiti_toured_v7', '1');
    localStorage.setItem('eiti_install_hint_seen', '1');
    localStorage.setItem('eiti_ai_provider', 'deepseek');
    localStorage.removeItem('deepseek_api_key');
    localStorage.removeItem('eiti_apikey_deepseek');
    if (!sessionStorage.getItem('eiti_t_w')) { // только при первом заходе — перезагрузка проверяет сохранение
      if (w == null) localStorage.removeItem('eiti_wiki_offline'); else localStorage.setItem('eiti_wiki_offline', w);
      sessionStorage.setItem('eiti_t_w', '1');
    }
  }, wiki);
  await page.goto('/index.html');
  await page.waitForFunction(() => window.eitiChatReady === true && typeof window.EitiFramesHost === 'object');
  await expect(page.locator('#splash')).toBeHidden();
  await page.addStyleTag({ content: '#eiti-pin-modal{display:none!important}' });
  await page.evaluate(() => { document.querySelectorAll('#eiti-onboarding,#eiti-pin-modal,.toast').forEach((e) => e.remove()); localStorage.setItem('eiti_offline_mode', '0'); });
}
async function send(page, text) {
  await page.locator('#input').fill(text);
  await page.locator('#send').click();
}
const last = (page) => page.locator('#messages .message.incoming').last();

function mockWiki(page, mode) {
  return page.route(/https:\/\/(ru|en)\.wikipedia\.org\/.*/, async (route) => {
    const u = route.request().url();
    if (mode === 'timeout') return; // никогда не отвечаем → тайм-аут хоста
    if (/list=search/.test(u)) return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ query: { search: [{ title: 'Квазибульба' }] } }) });
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ type: 'standard', title: 'Квазибульба', extract: 'Квазибульба — вымышленное растение <b>для теста</b>, придуманное специально для проверки офлайн-ответов.', content_urls: { desktop: { page: 'https://ru.wikipedia.org/wiki/Квазибульба' } } }) });
  });
}

test('«Расскажи о науке» без ключа → карточка понятия, уточнения держат тему', async ({ page }) => {
  await boot(page, '0');
  await send(page, 'Расскажи о науке');
  await expect(last(page)).toContainText('Наука', { timeout: 20000 });
  await expect(last(page)).not.toContainText('Настройте');
  await send(page, 'а зачем?');
  await expect(last(page)).toContainText('Зачем', { timeout: 15000 });
  await send(page, 'а когда появилась?');
  await expect(last(page)).toContainText('Когда', { timeout: 15000 });
  await shot(page, 'science');
  const n = await page.locator('#messages .message.incoming').count();
  await send(page, 'Скажи о науке');
  await expect(page.locator('#messages .message.incoming')).toHaveCount(n + 1, { timeout: 15000 });
  await expect(last(page)).toContainText('Наука');
  await expect(last(page)).not.toContainText('Настройте');
});

test('«о науке расскажи» и «Поцелуй о науке» (оговорка диктовки)', async ({ page }) => {
  await boot(page, '0');
  await send(page, 'о науке расскажи');
  await expect(last(page)).toContainText('Наука', { timeout: 20000 });
  await shot(page, 'reverse');
  await send(page, 'Поцелуй о науке');
  await expect(last(page)).toContainText('Наука', { timeout: 15000 });
  await send(page, 'объясни фотосинтез');
  await expect(last(page)).toContainText('Фотосинтез', { timeout: 15000 });
});

test('ничего не нашлось → честный ответ с кнопками, без «Настройте ключ»', async ({ page }) => {
  await boot(page, '0');
  await send(page, 'расскажи про квазибульбу');
  await expect(last(page).locator('.eiti-fb-btn')).toHaveCount(2, { timeout: 20000 });
  await expect(last(page)).toContainText('🔍 Поискать в заметках');
  await expect(last(page)).toContainText('🤖 Включить ИИ');
  await expect(last(page)).not.toContainText('Настройте');
  await expect(last(page)).not.toContainText('EITIFB');
  await shot(page, 'fallback');
});

test('🌐 Википедия (мок): успех → подпись и ссылка, текст очищен', async ({ page }) => {
  await mockWiki(page, 'ok');
  await boot(page, '1');
  await send(page, 'расскажи про квазибульбу');
  await expect(last(page)).toContainText('Википедия', { timeout: 20000 });
  await expect(last(page)).toContainText('вымышленное растение');
  await expect(last(page).locator('b')).not.toContainText('для теста');
  await shot(page, 'wikipedia');
  // кэш IndexedDB: второй раз без сети
  await page.unroute(/wikipedia\.org/);
  await page.route(/wikipedia\.org/, (r) => r.abort());
  const t = await page.evaluate(() => EitiWikiHost.lookup('квазибульбу'));
  expect(t).toContain('Википедия');
});

test('🌐 Википедия: тайм-аут и офлайн → кнопки, без зависания', async ({ page, context }) => {
  await mockWiki(page, 'timeout');
  await boot(page, '1');
  await send(page, 'расскажи про зюзюбрика');
  await expect(last(page).locator('.eiti-fb-btn')).toHaveCount(2, { timeout: 30000 });
  await context.setOffline(true);
  const r = await page.evaluate(() => EitiWikiHost.lookup('несуществующее понятие'));
  expect(r).toBeNull();
  await context.setOffline(false);
});

test('настройка «🌐 Википедия для офлайн-ответов»: по умолчанию вкл без ключа, сохраняется', async ({ page }) => {
  await boot(page);
  expect(await page.evaluate(() => EitiWikiHost.enabled())).toBe(true);
  await page.evaluate(() => { if (typeof openView === 'function') openView('settings'); });
  const cb = page.locator('#eiti-wiki-offline');
  await cb.scrollIntoViewIfNeeded();
  await expect(cb).toBeChecked();
  await page.locator('#eiti-wiki-settings').scrollIntoViewIfNeeded();
  await shot(page, 'settings');
  await cb.uncheck();
  expect(await page.evaluate(() => localStorage.getItem('eiti_wiki_offline'))).toBe('0');
  await page.reload();
  await page.waitForFunction(() => window.eitiChatReady === true);
  expect(await page.evaluate(() => EitiWikiHost.enabled())).toBe(false);
  await page.evaluate(() => { if (typeof openView === 'function') openView('settings'); });
  await expect(page.locator('#eiti-wiki-offline')).not.toBeChecked();
  // с ключом ИИ по умолчанию выключено
  await page.evaluate(() => { localStorage.removeItem('eiti_wiki_offline'); localStorage.setItem('deepseek_api_key', 'sk-test'); });
  expect(await page.evaluate(() => EitiWikiHost.enabled())).toBe(false);
});
