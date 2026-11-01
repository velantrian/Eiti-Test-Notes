// @ts-check
// v14.15.3: EITI Care в браузере — регион номеров (вне DE без немецких номеров), «там/в городе», длинные сообщения >600 символов.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..');
test.use({ locale: 'ru-RU', timezoneId: 'Europe/Moscow' });

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
function watchExternal(context) {
  const ext = [];
  context.on('request', (r) => { if (!/^http:\/\/127\.0\.0\.1:8099\//.test(r.url()) && !/^(data|blob):/.test(r.url())) ext.push(r.url()); });
  return ext;
}

test('care вне Германии: личный кризис со словом «там» → crisis + 112/местный номер, без немецких номеров; follow-up жив', async ({ page, context }) => {
  await boot(page);
  const ext = watchExternal(context);
  await send(page, 'я хочу умереть, там всё плохо');
  await expect(last(page)).toContainText('Ты сейчас в безопасности?', { timeout: 15000 });
  await expect(last(page)).toContainText('112');
  await expect(last(page)).toContainText('findahelpline.com');
  for (const n of ['0800 111 0 111', '116 123', '030 440 308 454']) await expect(last(page)).not.toContainText(n);
  await send(page, 'нет');
  await expect(last(page)).toContainText(/112/, { timeout: 15000 });
  await expect(last(page)).not.toContainText('0800');
  expect(ext).toEqual([]);
});

test('care: длинное сообщение (>600 символов) с сигналом в конце → кризисный ответ', async ({ page, context }) => {
  await boot(page);
  const ext = watchExternal(context);
  const pad = 'Сегодня был обычный день, я ходил в магазин и читал книгу про космос. '.repeat(12);
  await send(page, pad + 'Я больше не хочу жить.');
  await expect(last(page)).toContainText('Ты сейчас в безопасности?', { timeout: 15000 });
  await expect(last(page)).toContainText('112');
  expect(ext).toEqual([]);
});
