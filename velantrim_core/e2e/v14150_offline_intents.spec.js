// @ts-check
// v14.15.0: офлайн-интенты — зачин «ок, …», составные реплики, «а дальше-то», новые слоты; EITI Care — мягкий «не хочу умирать»
// (с Doweria), смех/скука без тревоги, «в книге герой покончил с собой» → «если речь о тебе» + номера. Без сети. Скриншоты 412×915.
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
  await page.screenshot({ path: SHOT + 'offline-v14150-' + name + '.png' });
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
function watchExternal(context) {
  const ext = [];
  context.on('request', (r) => { if (!/^http:\/\/127\.0\.0\.1:8099\//.test(r.url()) && !/^(data|blob):/.test(r.url())) ext.push(r.url()); });
  return ext;
}

test('frames: «ок, расскажи о гравитации» (зачин не мешает), «а дальше-то?», «Что такое гравитация. А зачем она?»', async ({ page, context }) => {
  await boot(page);
  const ext = watchExternal(context);
  await send(page, 'ок, расскажи о гравитации');
  await expect(last(page)).toContainText('Гравитация', { timeout: 20000 });
  await expect(last(page)).not.toContainText('Не знаю, этого нет в базе');
  let n = await page.locator('#messages .message.incoming').count();
  await send(page, 'а дальше-то?');
  await expect(page.locator('#messages .message.incoming')).toHaveCount(n + 1, { timeout: 15000 });
  await expect(last(page)).toContainText('Гравитация');
  await shot(page, 'lead');
  await send(page, 'Что такое гравитация. А зачем она?');
  await expect(last(page)).toContainText('Зачем', { timeout: 15000 });
  expect(ext).toEqual([]);
});

test('frames: составная реплика «Что такое гравитация. А зачем она?» → определение и «зачем» одним ответом', async ({ page, context }) => {
  await boot(page);
  const ext = watchExternal(context);
  await send(page, 'Что такое гравитация. А зачем она?');
  await expect(last(page)).toContainText('Гравитация', { timeout: 20000 });
  await shot(page, 'compound');
  expect(ext).toEqual([]);
});

test('care: «я не хочу умирать» — мягко (без 🚨) с 112, TelefonSeelsorge и Doweria; «умираю со смеху» — без номеров', async ({ page, context }) => {
  await boot(page);
  const ext = watchExternal(context);
  await send(page, 'я не хочу умирать');
  for (const s of ['Слышу тебя', '112', '0800 111 0 111', '030 440 308 454']) await expect(last(page)).toContainText(s, { timeout: 15000 });
  await expect(last(page)).not.toContainText('🚨');
  await send(page, 'умираю со смеху');
  await expect(last(page)).toContainText(/😄|😂/, { timeout: 15000 });
  await expect(last(page)).not.toContainText('112');
  await shot(page, 'care');
  expect(ext).toEqual([]);
});

test('care: «в книге герой покончил с собой почему» → «Если речь о тебе» + все номера, включая Doweria', async ({ page, context }) => {
  await boot(page);
  const ext = watchExternal(context);
  await send(page, 'в книге герой покончил с собой почему');
  for (const s of ['Если речь о тебе', '112', '0800 111 0 111', '0800 111 0 222', '116 123', '030 440 308 454']) await expect(last(page)).toContainText(s, { timeout: 15000 });
  await shot(page, 'info');
  expect(ext).toEqual([]);
});
