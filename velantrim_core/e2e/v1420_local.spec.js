// @ts-check
// v14.2.0: EITI Local — offline calculator and questions about the user's own notes/files, answered before KB and offline dialogs.
const { test, expect } = require('@playwright/test');

async function boot(page, offlineMode) {
  await page.addInitScript((off) => {
    localStorage.setItem('eiti_onboarded', 'true');
    localStorage.setItem('eiti_toured_v7', '1');
    localStorage.setItem('eiti_install_hint_seen', '1');
    localStorage.setItem('eiti_ai_provider', 'deepseek');
    localStorage.removeItem('deepseek_api_key');
    localStorage.removeItem('eiti_apikey_deepseek');
    localStorage.setItem('eiti_offline_mode', off ? '1' : '0');
  }, !!offlineMode);
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.EitiLocalHost === 'object' && !!window.EitiLocalLib && typeof eitiDb !== 'undefined' && !!eitiDb && window.eitiChatReady === true, null, { timeout: 30000 });
  await expect(page.locator('#splash')).toBeHidden();
  await page.addStyleTag({ content: '#eiti-pin-modal{display:none!important}' });
  await page.evaluate(() => {
    document.querySelectorAll('#eiti-onboarding,#eiti-pin-modal,.toast').forEach((e) => e.remove());
    localStorage.removeItem('eiti_ds_off');
    const now = Date.now(), D = 86400000;
    const notes = notesLoad();
    notes.push({ id: 'e2e_cat', title: 'Кошка Муся', body: 'Мусе 3 года, ветеринар в среду.', created: now - D, updated: now - D, tags: ['кошка'] });
    notes.push({ id: 'e2e_trip', title: 'План поездки', body: 'Поезд в Прагу, не забыть паспорт.', created: now - 60000, updated: now - 60000, tags: ['путешествия'] });
    notesSave(notes);
  });
}

async function send(page, text) {
  await page.locator('#input').fill(text);
  await page.locator('#send').click();
}

test('без ключа: калькулятор словами и цифрами, деление на ноль, обычная фраза не перехвачена', async ({ page }) => {
  const kbReq = [];
  page.on('request', (r) => { if (/\/kb\/|\/offline\//.test(r.url())) kbReq.push(r.url()); });
  await boot(page, false);
  const msgs = page.locator('#messages .message.incoming');
  await send(page, 'два умножить на три');
  await expect(msgs.last()).toContainText('2 × 3 = 6', { timeout: 15000 });
  await send(page, 'двадцать процентов от трёхсот');
  await expect(msgs.last()).toContainText('20% от 300 = 60', { timeout: 15000 });
  await send(page, '(2+3)^2');
  await expect(msgs.last()).toContainText('= 25', { timeout: 15000 });
  await send(page, 'сто сорок разделить на ноль');
  await expect(msgs.last()).toContainText('на ноль делить нельзя', { timeout: 15000 });
  // калькулятор отвечает локально, не трогая библиотеку KB и офлайн-диалоги
  expect(kbReq.length).toBe(0);
  await send(page, 'привет, как дела?');
  await expect(msgs.last()).not.toContainText('🧮', { timeout: 15000 });
  await expect(msgs.last()).not.toContainText('🗂');
});

test('без ключа: вопросы о своих заметках и ссылка «открыть» открывает заметку', async ({ page }) => {
  await boot(page, false);
  const msgs = page.locator('#messages .message.incoming');
  const total = await page.evaluate(() => notesLoad().filter((n) => n.status !== 'deleted').length);
  await send(page, 'сколько у меня заметок');
  await expect(msgs.last()).toContainText('У тебя ' + total, { timeout: 15000 });
  await send(page, 'последняя заметка');
  await expect(msgs.last()).toContainText('План поездки', { timeout: 15000 });
  await send(page, 'что в заметках про кошку');
  await expect(msgs.last()).toContainText('Кошка Муся', { timeout: 15000 });
  const chip = msgs.last().locator('.eiti-local-note-chip[data-note-id="e2e_cat"]');
  await expect(chip).toBeVisible();
  await chip.click();
  await expect(page.locator('#noteEditorTitle')).toHaveValue('Кошка Муся', { timeout: 10000 });
});

test('офлайн-режим (роутер): EITI Local отвечает раньше остальных интентов', async ({ page }) => {
  await boot(page, true);
  const msgs = page.locator('#messages .message.incoming');
  await send(page, 'квадратный корень из 81');
  await expect(msgs.last()).toContainText('√81 = 9', { timeout: 15000 });
  await send(page, 'заметки с тегом путешествия');
  await expect(msgs.last()).toContainText('План поездки', { timeout: 15000 });
  await send(page, 'what did I write yesterday');
  await expect(msgs.last()).toContainText('Кошка Муся', { timeout: 15000 });
  const st = await page.evaluate(() => EitiLocalHost.stats);
  expect(st.hits).toBeGreaterThanOrEqual(3);
});
