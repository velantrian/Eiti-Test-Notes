// @ts-check
// v14.13.0: «📌 В заметку» под офлайн-ответами — выбор заметки, липкая цель, чистая вставка, удалённая цель, настройка, EN/DE.
const { test, expect } = require('@playwright/test');

async function boot(page, extra) {
  await page.addInitScript((ex) => {
    localStorage.setItem('eiti_onboarded', 'true');
    localStorage.setItem('eiti_toured_v7', '1');
    localStorage.setItem('eiti_install_hint_seen', '1');
    localStorage.setItem('eiti_ai_provider', 'deepseek');
    localStorage.removeItem('deepseek_api_key');
    localStorage.removeItem('eiti_apikey_deepseek');
    Object.keys(ex || {}).forEach((k) => localStorage.setItem(k, ex[k]));
  }, extra || {});
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.EitiKBHost === 'object' && typeof window.EitiRelHost === 'object' && typeof window.notesSave === 'function');
  await expect(page.locator('#splash')).toBeHidden();
  await page.addStyleTag({ content: '#eiti-pin-modal{display:none!important}' });
  await page.evaluate(() => { document.querySelectorAll('#eiti-onboarding,#eiti-pin-modal,.toast').forEach((e) => e.remove()); localStorage.removeItem('eiti_ds_off'); localStorage.setItem('eiti_offline_mode', '0'); });
}
async function mount(page, q, id) {
  return page.evaluate(async ({ q, id }) => {
    const t = await EitiOffline.replyText(q);
    const d = document.createElement('div'); d.id = id; d.className = 'message incoming';
    d.innerHTML = eitiRenderMarkdown(t); document.getElementById('messages').appendChild(d);
    return t;
  }, { q, id });
}
const notes = (page) => page.evaluate(() => notesLoad().map((n) => ({ id: n.id, title: n.title, body: n.body })));

test('нет заметок → сразу новая; дальше липкая цель без вопросов', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => notesSave([]));
  await mount(page, 'ночной дозор рембрандт', 'a1');
  await page.locator('#a1 [data-w="save"]').click();
  await expect.poll(async () => (await notes(page)).length).toBe(1);
  let ns = await notes(page);
  expect(ns[0].body).toContain('📌 «Ночной дозор»');
  expect(ns[0].body).toContain('— Источник:');
  expect(ns[0].body).not.toMatch(/[⟦<]|Похожие|Рассуждение|Офлайн-ответ/);
  await expect(page.locator('#a1 [data-w="save"]')).toContainText('📌 В «');
  await expect(page.locator('#a1 [data-w="save"]')).not.toContainText('««'); // заголовок KB уже в кавычках
  await expect(page.locator('#a1 [data-w="pick"]')).toHaveText('сменить');
  await mount(page, 'расскажи сказку про колобка', 'a2');
  await page.locator('#a2 [data-w="save"]').click();
  await expect(page.locator('#eiti-save-picker')).toHaveCount(0);
  await expect.poll(async () => ((await notes(page))[0].body.match(/📌 /g) || []).length).toBe(2);
  expect((await notes(page)).length).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('eiti_save_target'))).toBe(ns[0].id);
});

test('первое нажатие → выбор заметки; «сменить»; удалённая цель → снова выбор', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { localStorage.removeItem('eiti_save_target'); notesSave([{ id: 'n1', title: 'История', body: 'Старое', created: 1, updated: 1, tags: [] }, { id: 'n2', title: 'Сказки', body: '', created: 2, updated: 2, tags: [] }]); });
  await mount(page, 'ночной дозор рембрандт', 'b1');
  await page.locator('#b1 [data-w="save"]').click();
  const pk = page.locator('#eiti-save-picker');
  await expect(pk).toBeVisible();
  await expect(pk.locator('.eiti-save-opt')).toHaveCount(3);
  await expect(pk.locator('.eiti-save-opt').first()).toContainText('➕ Новая заметка');
  await pk.locator('.eiti-save-opt[data-id="n1"]').click();
  await expect(pk).toHaveCount(0);
  let n1 = (await notes(page)).find((n) => n.id === 'n1');
  expect(n1.body.startsWith('Старое\n\n📌 ')).toBe(true);
  await expect(page.locator('#b1 [data-w="save"]')).toHaveText('📌 В «История»');
  // «сменить» → выбор → n2
  await page.locator('#b1 [data-w="pick"]').click();
  await pk.locator('.eiti-save-opt[data-id="n2"]').click();
  await expect(page.locator('#b1 [data-w="save"]')).toHaveText('📌 В «Сказки»');
  expect((await notes(page)).find((n) => n.id === 'n2').body).toContain('📌 ');
  // цель удалена → снова выбор
  await page.evaluate(() => { const all = notesLoad().filter((n) => n.id !== 'n2'); _idbNotesCache = all; });
  await page.locator('#b1 [data-w="save"]').click();
  await expect(pk).toBeVisible();
  await pk.locator('.eiti-save-opt').first().click();
  await expect.poll(async () => (await notes(page)).length).toBe(2);
});

test('настройка выключает кнопку; EN/DE подписи', async ({ page }) => {
  await boot(page, { eiti_save_to_note: '0' });
  await mount(page, 'ночной дозор рембрандт', 'c1');
  await expect(page.locator('#c1 [data-w="save"]')).toHaveCount(0);
  await expect(page.locator('#c1 [data-w="rel"]')).toHaveCount(1);
  await page.evaluate(() => eitiRelSet('save', true));
  expect(await page.evaluate(() => [EitiRelHost.bar('kb', 'kbl_x_1', 'en'), EitiRelHost.bar('tale', 'a.b', 'de'), EitiRelHost.bar('note', 'n1', 'ru')])).toEqual([
    expect.stringContaining('📌 To note'), expect.stringContaining('📌 In Notiz'), expect.not.stringContaining('data-w="save"')]);
});
