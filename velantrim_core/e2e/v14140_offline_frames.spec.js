// @ts-check
// v14.14.0: EITI Frames — «Расскажи о науке» / «о науке расскажи» без ключа, уточнения; ответы СТРОГО из локальной базы:
// «Не знаю, этого нет в базе» (журнал тем), «🔄 Обновить базу офлайн-ответов» в Настройках (мок манифеста и Википедии:
// успех, офлайн, тайм-аут), карточка «🌐 из Википедии» потом отвечает без сети. Скриншоты 412×915 → /workspace/offline-*.png.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..');

const SHOT = fs.existsSync('/workspace') ? '/workspace/' : null;
async function shot(page, name) {
  if (!SHOT) return;
  await page.addStyleTag({ content: '.toast{display:none!important}' });
  await page.waitForTimeout(900); // анимация появления сообщения
  await page.screenshot({ path: SHOT + 'offline-' + name + '.png' });
}
test.use({ locale: 'ru-RU', timezoneId: 'Europe/Berlin' }); // v14.15.3: номера DE — только в Германии

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
  await page.waitForFunction(() => window.eitiChatReady === true && typeof window.EitiFramesHost === 'object' && typeof window.EitiBaseHost === 'object');
  await expect(page.locator('#splash')).toBeHidden();
  await page.addStyleTag({ content: '#eiti-pin-modal{display:none!important}' });
  await page.evaluate(() => { document.querySelectorAll('#eiti-onboarding,#eiti-pin-modal,.toast').forEach((e) => e.remove()); localStorage.setItem('eiti_offline_mode', '0'); });
}
async function send(page, text) {
  await page.locator('#input').fill(text);
  await page.locator('#send').click();
}
const last = (page) => page.locator('#messages .message.incoming').last();

const JSONH = { 'access-control-allow-origin': '*' };
// Википедия (мок): REST summary по прямому названию → тестовая статья (с HTML, который должен вычиститься)
function mockWiki(target) {
  return target.route(/https:\/\/(ru|en)\.wikipedia\.org\/.*/, async (route) => {
    const u = route.request().url();
    if (/list=search/.test(u)) return route.fulfill({ status: 200, contentType: 'application/json', headers: JSONH, body: JSON.stringify({ query: { search: [] } }) });
    const title = decodeURIComponent(u.split('/page/summary/')[1] || '').replace(/_/g, ' ');
    return route.fulfill({ status: 200, contentType: 'application/json', headers: JSONH, body: JSON.stringify({ type: 'standard', title, extract: title + ' — вымышленное понятие <b>для теста</b>, придуманное специально для проверки офлайн-ответов EITI.', content_urls: { desktop: { page: 'https://ru.wikipedia.org/wiki/' + encodeURIComponent(title) } } }) });
  });
}
// манифест (мок): изменился один пакет — offline/core.json (тот же JSON + перевод строки → другой хеш)
function mockManifest(target, mode) {
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'offline_manifest.json'), 'utf-8'));
  const body = fs.readFileSync(path.join(ROOT, 'offline', 'core.json'), 'utf-8') + '\n';
  const h = crypto.createHash('sha256').update(body).digest('hex').slice(0, 16);
  man.files['offline/core.json'] = { h, s: Buffer.byteLength(body) };
  const hits = [];
  return Promise.all([
    target.route(/\/offline_manifest\.json\?u=/, async (route) => {
      hits.push(route.request().url());
      if (mode === 'timeout') return; // не отвечаем → тайм-аут хоста
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(man) });
    }),
    target.route(new RegExp('/offline/core\\.json\\?u=' + h + '$'), (route) => { hits.push(route.request().url()); return route.fulfill({ status: 200, contentType: 'application/json', body }); }),
  ]).then(() => hits);
}
async function openBaseSettings(page) {
  await page.evaluate(() => { if (typeof openView === 'function') openView('settings'); });
  const g = page.locator('#eiti-base-settings');
  await g.scrollIntoViewIfNeeded();
  await expect(page.locator('#eiti-base-update')).toBeVisible();
  return g;
}
const NOT_IN_BASE = 'Не знаю, этого нет в базе';

test('«Расскажи о науке» без ключа → карточка понятия, уточнения держат тему', async ({ page }) => {
  await boot(page);
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
  await boot(page);
  await send(page, 'о науке расскажи');
  await expect(last(page)).toContainText('Наука', { timeout: 20000 });
  await shot(page, 'reverse');
  await send(page, 'Поцелуй о науке');
  await expect(last(page)).toContainText('Наука', { timeout: 15000 });
  await send(page, 'объясни фотосинтез');
  await expect(last(page)).toContainText('Фотосинтез', { timeout: 15000 });
});

test('ничего не нашлось → коротко «Не знаю, этого нет в базе» + подсказка, кнопки, без «Настройте ключ»', async ({ page }) => {
  await boot(page);
  await send(page, 'расскажи про квазибульбу');
  await expect(last(page).locator('.eiti-fb-btn')).toHaveCount(2, { timeout: 20000 });
  await expect(last(page)).toContainText(NOT_IN_BASE + ': «квазибульб');
  await expect(last(page)).toContainText('🔄 Обновить базу офлайн-ответов');
  await expect(last(page)).toContainText('🔍 Поискать в заметках');
  await expect(last(page)).toContainText('🤖 Включить ИИ');
  await expect(last(page)).not.toContainText('Настройте');
  await expect(last(page)).not.toContainText('EITIFB');
  await expect(last(page)).not.toContainText('Википеди');
  await shot(page, 'notinbase');
});

test('5 формулировок вне базы (вкл. «Расскажи, как сделать шоколад») → «нет в базе», журнал тем, ни одного внешнего запроса', async ({ page, context }) => {
  await boot(page);
  const ext = []; // только во время ответов в чате
  context.on('request', (r) => { if (!/^http:\/\/127\.0\.0\.1:8099\//.test(r.url()) && !/^(data|blob):/.test(r.url())) ext.push(r.url()); });
  const asks = [
    ['Расскажи, как сделать шоколад', 'Шоколад'],
    ['объясни, что такое квазибульба', 'квазибульба'],
    ['как это — зюзюбрик?', 'зюзюбрик'],
    ['зачем нужен флюкс-конденсатор?', 'флюкс конденсатор'],
    ['по сути, кто такой вася пупкин', 'вася пупкин'],
  ];
  for (const [q, topic] of asks) {
    const n = await page.locator('#messages .message.incoming').count();
    await send(page, q);
    await expect(page.locator('#messages .message.incoming')).toHaveCount(n + 1, { timeout: 20000 });
    await expect(last(page)).toContainText(NOT_IN_BASE, { timeout: 20000 });
    await expect(last(page)).toContainText(topic);
    await expect(last(page)).not.toContainText('Настройте');
  }
  // темы без ответа — в локальном журнале (карточка «Шоколад» есть, нет только раздела → в журнал не идёт)
  await expect.poll(() => page.evaluate(() => EitiBaseHost.misses().then((l) => l.map((x) => x.t).sort())), { timeout: 5000 })
    .toEqual(['вася пупкин', 'зюзюбрик', 'квазибульба', 'флюкс конденсатор']);
  const ext2 = ext.filter((u) => !/cdnjs\.cloudflare\.com\/ajax\/libs\/dompurify\//.test(u) && !/fonts\.(googleapis|gstatic)\.com/.test(u));
  expect(ext2.filter((u) => /wikipedia|wikimedia/.test(u))).toEqual([]);
  expect(ext2).toEqual([]);
});

test.describe('🔄 Обновить базу офлайн-ответов', () => {
  test.use({ serviceWorkers: 'block' }); // запросы страницы видны page.route (SW проверяется unit/pytest)

  test('журнал «Темы без ответа» в Настройках: видно и очищается', async ({ page }) => {
    await boot(page);
    await send(page, 'объясни, что такое квазибульба');
    await expect(last(page)).toContainText(NOT_IN_BASE, { timeout: 20000 });
    await send(page, 'как это — зюзюбрик?');
    await expect(last(page)).toContainText('зюзюбрик', { timeout: 20000 });
    await expect.poll(() => page.evaluate(() => EitiBaseHost.misses().then((l) => l.length))).toBe(2);
    await openBaseSettings(page);
    await page.evaluate(() => EitiBaseHost.render());
    await expect(page.locator('#eiti-base-miss-n')).toHaveText('2');
    await page.locator('#eiti-base-miss summary').click();
    await expect(page.locator('#eiti-base-miss-list')).toContainText('квазибульба');
    await expect(page.locator('#eiti-base-miss-list')).toContainText('зюзюбрик');
    await page.locator('#eiti-base-miss-clear').click();
    await expect(page.locator('#eiti-base-miss-n')).toHaveText('0');
    expect(await page.evaluate(() => EitiBaseHost.misses().then((l) => l.length))).toBe(0);
  });

  test('успех (мок манифеста и Википедии) → пакет обновлён, темы стали карточками, потом отвечают без сети', async ({ page, context }) => {
    const hits = await mockManifest(page, 'ok');
    await mockWiki(page);
    await boot(page);
    for (const q of ['объясни, что такое квазибульба', 'по сути, кто такой вася пупкин']) {
      await send(page, q);
      await expect(last(page)).toContainText(NOT_IN_BASE, { timeout: 20000 });
    }
    await expect.poll(() => page.evaluate(() => EitiBaseHost.misses().then((l) => l.length))).toBe(2);
    await openBaseSettings(page);
    await expect(page.locator('#eiti-base-wiki')).toBeChecked(); // по умолчанию ВКЛ
    await expect(page.locator('#eiti-base-last')).toContainText('ещё не обновлялась');
    const res = await page.evaluate(() => eitiBaseUpdate());
    expect(res.ok).toBe(true);
    expect(res.files).toBe(1);
    expect(res.changed).toEqual(['offline/core.json']);
    expect(res.wiki).toBe(2);
    expect(hits.length).toBe(2); // манифест + ровно один изменившийся файл
    await expect(page.locator('#eiti-base-status')).toContainText('✅ База обновлена');
    await expect(page.locator('#eiti-base-status')).toContainText('пакетов обновлено: 1');
    await expect(page.locator('#eiti-base-status')).toContainText('новых тем из Википедии: 2');
    await expect(page.locator('#eiti-base-last')).not.toContainText('ещё не обновлялась');
    await expect(page.locator('#eiti-base-miss-n')).toHaveText('0');
    // файл лёг в кэш приложения под обычным адресом, «?u=» не осталось
    const cached = await page.evaluate(async () => {
      const ks = []; for (const n of await caches.keys()) for (const r of await (await caches.open(n)).keys()) ks.push(r.url);
      return ks.filter((u) => /offline\/core\.json/.test(u));
    });
    expect(cached.some((u) => /\/offline\/core\.json$/.test(u))).toBe(true);
    expect(cached.some((u) => /\?u=/.test(u))).toBe(false);
    await page.locator('#eiti-base-settings').scrollIntoViewIfNeeded();
    await shot(page, 'update-settings');
    // второй раз — «уже актуальна», без скачивания файлов
    const res2 = await page.evaluate(() => eitiBaseUpdate());
    expect(res2.files).toBe(0);
    await expect(page.locator('#eiti-base-status')).toContainText('✅ База уже актуальна');
    // теперь без сети: карточка «🌐 из Википедии» из IndexedDB
    await page.unroute(/wikipedia\.org/);
    const ext = [];
    context.on('request', (r) => { if (/wikipedia/.test(r.url())) ext.push(r.url()); });
    await context.setOffline(true);
    await page.evaluate(() => { if (typeof openView === 'function') openView('chat'); });
    await send(page, 'объясни, что такое квазибульба');
    await expect(last(page)).toContainText('🌐 из Википедии · Квазибульба', { timeout: 20000 });
    await expect(last(page)).toContainText('вымышленное понятие');
    await expect(last(page)).toContainText('Источник');
    await expect(last(page).locator('b')).not.toContainText('для теста');
    await expect(last(page)).not.toContainText(NOT_IN_BASE);
    await shot(page, 'after-update');
    // тема, которой нет и в карточках, — без сети тоже честное «нет в базе» (а не «AI недоступен»)
    await send(page, 'как это — зюзюбрик?');
    await expect(last(page)).toContainText(NOT_IN_BASE, { timeout: 20000 });
    await expect(last(page)).not.toContainText('AI service недоступен');
    expect(ext).toEqual([]);
    await context.setOffline(false);
  });

  test('без сети → понятное сообщение и ни одного запроса', async ({ page, context }) => {
    const hits = await mockManifest(page, 'ok');
    await boot(page);
    await openBaseSettings(page);
    await context.setOffline(true);
    const res = await page.evaluate(() => eitiBaseUpdate());
    expect(res.offline).toBe(true);
    await expect(page.locator('#eiti-base-status')).toContainText('📴 Нет интернета');
    expect(hits).toEqual([]);
    await expect(page.locator('#eiti-base-last')).toContainText('ещё не обновлялась');
    await context.setOffline(false);
  });

  test('тайм-аут сервера → «⏱ не ответил вовремя», кнопка снова доступна', async ({ page }) => {
    await mockManifest(page, 'timeout');
    await boot(page);
    await openBaseSettings(page);
    const t0 = Date.now();
    const res = await page.evaluate(() => eitiBaseUpdate());
    expect(Date.now() - t0).toBeLessThan(20000);
    expect(res.ok).toBe(false);
    expect(res.error).toBe('timeout');
    await expect(page.locator('#eiti-base-status')).toContainText('⏱ Сервер не ответил вовремя');
    await expect(page.locator('#eiti-base-update')).toBeEnabled();
    await expect(page.locator('#eiti-base-last')).toContainText('ещё не обновлялась');
  });
});

// v14.14.0 talk: «что ты думаешь об этом» / «обдумай» / «что будет, если» / «другой вариант» / «сравни» / «подведи итог» — без ключа и без сети
function watchExternal(context) {
  const ext = [];
  context.on('request', (r) => { if (!/^http:\/\/127\.0\.0\.1:8099\//.test(r.url()) && !/^(data|blob):/.test(r.url())) ext.push(r.url()); });
  return ext;
}
test('talk: «что ты думаешь об этом» → честно «личного мнения нет» + суть/почему/зачем из базы, «поцелуй меня» — не вопрос', async ({ page, context }) => {
  await boot(page);
  const ext = watchExternal(context);
  await send(page, 'что такое фотосинтез');
  await expect(last(page)).toContainText('Фотосинтез', { timeout: 20000 });
  await send(page, 'скажи, что ты думаешь об этом?');
  await expect(last(page)).toContainText('мнение', { timeout: 15000 });
  await expect(last(page)).toContainText(/мнения у меня нет|не «думаю»|Мнения, как у человека/);
  await expect(last(page)).toContainText('Суть');
  await expect(last(page)).not.toContainText('Настройте');
  await shot(page, 'opinion');
  await send(page, 'как считаешь, что будет, если он исчезнет?');
  await expect(last(page)).toContainText('что будет, если', { timeout: 15000 });
  const n = await page.locator('#messages .message.incoming').count();
  await send(page, 'поцелуй меня');
  await expect(page.locator('#messages .message.incoming')).toHaveCount(n + 1, { timeout: 15000 });
  await expect(last(page)).not.toContainText('📘');
  expect(ext).toEqual([]);
});

test('talk: цепочка мнение → пример → по-другому → сравни → итог, тема держится, без сети', async ({ page, context }) => {
  await boot(page);
  const ext = watchExternal(context);
  await send(page, 'расскажи о гравитации');
  await expect(last(page)).toContainText('Гравитация', { timeout: 20000 });
  const chain = [
    ['а ты как считаешь?', 'мнение'],
    ['дай пример', 'пример'],
    ['а как было бы по-другому?', 'другой вариант'],
    ['а сравни с фотосинтезом', '⚖️'],
    ['подведи итог', 'итог'],
  ];
  for (const [q, want] of chain) {
    await send(page, q);
    await expect(last(page)).toContainText(want, { timeout: 15000 });
    await expect(last(page)).toContainText('Гравитация');
  }
  await expect(last(page)).toContainText('Мы уже обсудили');
  await shot(page, 'chain');
  expect(ext).toEqual([]);
});

test('intents+: «где» по карточке, эмоции при открытой теме → тёплый ответ Care, не фреймы; без сети', async ({ page, context }) => {
  await boot(page);
  const ext = watchExternal(context);
  await send(page, 'где происходит фотосинтез');
  await expect(last(page)).toContainText('«где» про «Фотосинтез»', { timeout: 20000 });
  await shot(page, 'where');
  await send(page, 'я в бешенстве');
  await expect(last(page)).toContainText('😤', { timeout: 15000 });
  await expect(last(page)).not.toContainText('Фотосинтез');
  await send(page, 'мне нужна поддержка');
  await expect(last(page)).toContainText('🫂', { timeout: 15000 });
  await expect(last(page)).not.toContainText(NOT_IN_BASE);
  await shot(page, 'mood');
  expect(ext).toEqual([]);
});

test('care: кризисная фраза при открытой теме → 112 и TelefonSeelsorge, затем «нет» → 112 первым', async ({ page, context }) => {
  await boot(page);
  const ext = watchExternal(context);
  await send(page, 'расскажи о гравитации');
  await expect(last(page)).toContainText('Гравитация', { timeout: 20000 });
  await send(page, 'не хочу жить');
  for (const n of ['112', '0800 111 0 111', '0800 111 0 222', '116 123']) await expect(last(page)).toContainText(n, { timeout: 15000 });
  await expect(last(page)).not.toContainText('Гравитация');
  await shot(page, 'support');
  await send(page, 'нет');
  await expect(last(page)).toContainText('112', { timeout: 15000 });
  expect(ext).toEqual([]);
});
