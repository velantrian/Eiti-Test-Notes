// v14.16.2: full offline detail card and chat-bound follow-up context.
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

test('Moon phases → «объясни подробнее» renders the full grounded card without network', async ({ page, context }) => {
  await boot(page);
  await send(page, 'что такое фазы луны');
  await expect(last(page)).toContainText('Фазы Луны', { timeout: 20000 });
  const requests = [];
  page.on('request', (r) => requests.push(r.url()));
  await context.setOffline(true);
  await send(page, 'объясни подробнее');
  await expect(last(page)).toContainText('Подробное объяснение', { timeout: 15000 });
  await expect(last(page)).toContainText('Поля карточки');
  await expect(last(page)).toContainText(/Карточки с совпадающими полями|Похожие карточки для сравнения/);
  await expect(last(page)).not.toContainText('нет их снимков');
  await expect(last(page)).toContainText('29,5 суток');
  await expect(last(page)).toContainText('science.nasa.gov/moon/moon-phases');
  await expect(last(page)).toContainText(/aa\.usno\.navy\.mil\/faq\/moon\\?_phases/);
  const detail = await last(page).innerText();
  expect(detail.length).toBeGreaterThan(1200);
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
