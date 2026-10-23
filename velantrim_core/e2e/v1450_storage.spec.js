// v14.5.0: Settings → 💾 Chat size & storage — stats, clear history (notes survive), clear caches, reset dialogue, auto-trim.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function boot(page, loc) {
  await page.addInitScript((l) => {
    localStorage.setItem('eiti_onboarded', 'true'); localStorage.setItem('eiti_toured_v7', '1'); localStorage.setItem('eiti_install_hint_seen', '1');
    localStorage.setItem('eiti_ai_provider', 'deepseek'); localStorage.removeItem('deepseek_api_key'); localStorage.setItem('eiti_offline_mode', '0');
    localStorage.setItem('eiti_locale', l);
  }, loc);
  await page.goto('/index.html');
  await page.waitForFunction(() => !!window.eitiStorageRefresh && typeof eitiDb !== 'undefined' && !!eitiDb);
  await page.addStyleTag({ content: '#eiti-pin-modal{display:none!important}' });
  await page.evaluate(() => document.querySelectorAll('#eiti-onboarding,#eiti-pin-modal,.toast').forEach((e) => e.remove()));
  page.on('dialog', (d) => d.accept());
}
const count = (page, store) => page.evaluate((s) => new Promise((r) => { const q = eitiDb.transaction(s, 'readonly').objectStore(s).count(); q.onsuccess = () => r(q.result); }), store);
async function seed(page, n) {
  await page.evaluate(async (n) => {
    if (!eitiCurrentChatId) { const c = await eitiCreateChat('v1450'); eitiCurrentChatId = c.id; }
    for (let i = 0; i < n; i++) await eitiAddMessage(eitiCurrentChatId, i % 2 ? 'assistant' : 'user', 'сообщение ' + i);
    await new Promise((r) => { const tx = eitiDb.transaction('notes', 'readwrite'); tx.objectStore('notes').put({ id: 'n_v1450', title: 'Заметка', content: 'не удалять', created: new Date().toISOString(), updated: new Date().toISOString() }); tx.oncomplete = r; });
  }, n);
}
async function openSettings(page) {
  await page.locator('.tab-item[data-view="settings"]').click();
  await page.locator('#eiti-storage-group').scrollIntoViewIfNeeded();
  await expect(page.locator('#eiti-st-chat')).toContainText(/\d/, { timeout: 15000 });
}

test.describe('v14.5.0 storage settings', () => {
  test.setTimeout(180000);

  test('stats, clear history keeps notes, clear caches, reset dialogue', async ({ page }, info) => {
    await boot(page, 'ru');
    await seed(page, 6);
    await page.evaluate(() => EitiOffline.replyText('Хочу в Грузию весной'));
    const notes = await count(page, 'notes');
    await openSettings(page);
    await page.evaluate(() => eitiStorageRefresh());
    await expect(page.locator('#eiti-st-chat')).toContainText(/[1-9]\d* сообщ/);
    await expect(page.locator('#eiti-st-total')).toContainText(/B/);
    await expect(page.locator('#eiti-chat-limit')).toHaveValue('500');
    const dir = path.join(__dirname, 'test-results', 'v1450-screens'); fs.mkdirSync(dir, { recursive: true });
    await page.locator('#eiti-storage-group').screenshot({ path: path.join(dir, `storage-settings-${info.project.name}.png`) });

    await page.locator('#eiti-clear-chat-btn').click();
    await expect.poll(() => count(page, 'messages')).toBe(0);
    expect(await count(page, 'notes')).toBe(notes);
    expect(notes).toBeGreaterThan(0);

    await page.evaluate(() => caches.open('eiti-offline-test').then((c) => c.put('/offline/x.json', new Response('{"a":1}'))));
    await page.locator('#eiti-clear-cache-btn').click();
    await expect.poll(() => page.evaluate(() => caches.keys().then((k) => k.filter((x) => /^eiti-offline/.test(x)).length))).toBe(0);

    expect(await page.evaluate(() => !!EitiDialogHost.state().slots.place)).toBe(true);
    await page.locator('#eiti-reset-dialog-btn').click();
    await expect.poll(() => page.evaluate(() => EitiDialogHost.size() < 120 && !EitiDialogHost.state().slots.place)).toBe(true);
    expect(await count(page, 'notes')).toBe(notes);
  });

  test('auto-trim keeps the last N messages', async ({ page }) => {
    await boot(page, 'en');
    await openSettings(page);
    await expect(page.locator('#eiti-storage-group .settings-title')).toContainText('Chat size & storage');
    await page.locator('#eiti-chat-limit').selectOption('200');
    await seed(page, 230);
    await expect.poll(() => count(page, 'messages'), { timeout: 20000 }).toBeLessThanOrEqual(200);
    const kept = await page.evaluate(() => new Promise((r) => { const q = eitiDb.transaction('messages').objectStore('messages').getAll(); q.onsuccess = () => r(q.result.map((m) => m.content)); }));
    expect(kept).toContain('сообщение 229');
    expect(kept).not.toContain('сообщение 0');
    await page.locator('#eiti-chat-limit').selectOption('0');
    expect(await page.evaluate(() => localStorage.getItem('eiti_chat_limit'))).toBe('0');
  });
});
