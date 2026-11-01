// v14.16.2: universal offline reasoning for core, concept and lazy Wikidata longtail records.
const { test, expect } = require('@playwright/test');

test.use({ locale: 'ru-RU', timezoneId: 'Europe/Berlin' });

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
  await page.evaluate(() => {
    document.querySelectorAll('#eiti-onboarding,#eiti-pin-modal,.toast').forEach((e) => e.remove());
    localStorage.setItem('eiti_offline_mode', '0');
  });
}

async function send(page, text) {
  await page.locator('#input').fill(text);
  await page.locator('#send').click();
}
const last = (page) => page.locator('#messages .message.incoming').last();

 test('the «Рассуждение» button opens essence and detailed Moon phases offline', async ({ page, context }) => {
  await boot(page);
  await send(page, 'что такое фазы луны');
  await expect(last(page)).toContainText('Фазы Луны', { timeout: 20000 });
  const requests = [];
  page.on('request', (r) => requests.push(r.url()));
  await context.setOffline(true);
  const message = last(page);
  await message.locator('.eiti-rel-btn[data-w="why"]').click();
  const reasoning = message.locator('.eiti-rel-panel');
  await expect(reasoning).toContainText('Суть', { timeout: 15000 });
  await expect(reasoning).toContainText('Подробнее');
  await expect(reasoning).toContainText('Поля карточки');
  await expect(reasoning).toContainText(/Карточки с совпадающими полями|Похожие карточки для сравнения/);
  await expect(reasoning).not.toContainText('нет их снимков');
  await expect(reasoning).toContainText('29,5 суток');
  await expect(reasoning).toContainText('science.nasa.gov/moon/moon-phases');
  await expect(reasoning).toContainText('science.nasa.gov/moon/eclipses');
  await expect(reasoning).toContainText(/aa\.usno\.navy\.mil\/faq\/moon\\?_phases/);
  const detail = await reasoning.innerText();
  expect(detail.indexOf('Суть')).toBeLessThan(detail.indexOf('Подробнее'));
  expect(detail.length).toBeGreaterThan(1200);
  expect(requests).toEqual([]);
  await context.setOffline(false);
});

test('the two-layer reasoning works on a generated non-Moon KB record', async ({ page, context }) => {
  await boot(page);
  await send(page, 'почему небо голубое');
  await expect(last(page)).toContainText('KB', { timeout: 15000 });
  await expect(last(page)).toContainText('рэлеев');
  const requests = [];
  page.on('request', (r) => requests.push(r.url()));
  await context.setOffline(true);
  const message = last(page);
  await message.locator('.eiti-rel-btn[data-w="why"]').click();
  const reasoning = message.locator('.eiti-rel-panel');
  await expect(reasoning).toContainText('Суть', { timeout: 15000 });
  await expect(reasoning).toContainText('Подробнее');
  await expect(reasoning).toContainText('рэлеев');
  const detail = await reasoning.innerText();
  expect(detail.indexOf('Суть')).toBeLessThan(detail.indexOf('Подробнее'));
  expect(requests).toEqual([]);
  await context.setOffline(false);
});

test('lazy Wikidata longtail remains lazy and its reasoning opens with no network', async ({ page, context }) => {
  test.setTimeout(90000);
  await boot(page);
  const requests = [];
  page.on('request', (r) => requests.push(r.url()));

  await send(page, 'почему небо голубое');
  await expect(last(page)).toContainText('рэлеев', { timeout: 20000 });
  const tailPattern = /\/kb\/(?:idx\/longtail_|packs\/kb_longtail_)/;
  expect(requests.some((url) => tailPattern.test(url))).toBe(false);

  await send(page, 'что такое Tha Last Meal');
  await expect(last(page)).toContainText('Tha Last Meal', { timeout: 60000 });
  expect(requests.some((url) => tailPattern.test(url))).toBe(true);
  requests.length = 0;

  await context.setOffline(true);
  const message = last(page);
  await message.locator('.eiti-rel-btn[data-w="why"]').click();
  const reasoning = message.locator('.eiti-rel-panel');
  await expect(reasoning).toContainText('Суть', { timeout: 20000 });
  await expect(reasoning).toContainText('Подробнее');
  await expect(reasoning).toContainText('Wikidata (CC0)');
  await expect(reasoning).toContainText('дополнительные факты не придумываются');
  expect(requests).toEqual([]);
  await context.setOffline(false);
});

test('a KB follow-up from another chat cannot reuse the old card context', async ({ page }) => {
  await boot(page);
  await send(page, 'что такое фазы луны');
  await expect(last(page)).toContainText('Фазы Луны', { timeout: 20000 });
  await page.evaluate(() => { window.eitiCurrentChatId = 'different-chat-for-detail-test'; });
  await send(page, 'объясни подробнее');
  await expect(last(page)).toContainText('Сейчас нет свежей карточки знаний', { timeout: 15000 });
  await expect(last(page)).not.toContainText('29,5 суток');
});
