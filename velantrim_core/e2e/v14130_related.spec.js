// @ts-check
// v14.13.0: «Похожие / Рассуждение» — KB answer and tale in chat (no key), notes editor row, settings toggles, AI mode split.
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
  await page.waitForFunction(() => typeof window.EitiKBHost === 'object' && typeof window.EitiRelHost === 'object' && typeof window.EitiRelated === 'object');
  await expect(page.locator('#splash')).toBeHidden();
  await page.addStyleTag({ content: '#eiti-pin-modal{display:none!important}' });
  await page.evaluate(() => { document.querySelectorAll('#eiti-onboarding,#eiti-pin-modal,.toast').forEach((e) => e.remove()); localStorage.removeItem('eiti_ds_off'); localStorage.setItem('eiti_offline_mode', '0'); });
}

// render an offline reply the way the chat does and mount it into a test bubble
async function mount(page, q) {
  return page.evaluate(async (q) => {
    const t = await EitiOffline.replyText(q);
    const d = document.createElement('div'); d.id = 'relTest'; d.className = 'message incoming';
    d.innerHTML = eitiRenderMarkdown(t); document.getElementById('messages').appendChild(d);
    return t;
  }, q);
}

test('KB-ответ: кнопки, похожие из пакета, офлайн-карточка с фактами', async ({ page }) => {
  await boot(page);
  const t = await mount(page, 'ночной дозор рембрандт');
  expect(t).toMatch(/⟦EITIREL:kb:kbl_paintings_[0-9a-f]+⟧/);
  const bar = page.locator('#relTest .eiti-rel-bar').first();
  await expect(bar.locator('.eiti-rel-btn')).toHaveCount(3);
  await expect(bar.locator('[data-w="save"]')).toHaveText('📌 В заметку');
  await bar.locator('[data-w="rel"]').first().click();
  const chips = bar.locator('.eiti-rel-panel').first().locator('.eiti-rel-chip');
  await expect(chips.first()).toBeVisible();
  expect(await chips.count()).toBeGreaterThanOrEqual(3);
  await expect(bar.locator('.eiti-rel-panel')).toContainText('Даная'); // same author (Wikidata fact «Автор»)
  await chips.first().click(); // opens the related item in the panel (card + its own buttons)
  const top = bar.locator('.eiti-rel-panel').first();
  await expect(top).toContainText('Раздел');
  await expect(top).toContainText('Рембрандт');
  await expect(top.locator('.eiti-rel-bar')).toHaveCount(1);
  await bar.locator('[data-w="why"]').first().click();
  const panel = top;
  await expect(panel).toContainText('Факты');
  await expect(panel).toContainText('Автор');
  await expect(panel).toContainText('Wikidata (CC0)');
  await expect(panel).toContainText('Офлайн-рассуждение');
});

test('сказка: похожие по традиции/персонажам и карточка', async ({ page }) => {
  await boot(page);
  const t = await mount(page, 'расскажи сказку про колобка');
  expect(t).toMatch(/⟦EITIREL:tale:[a-z]+\.[\w-]+⟧/);
  const bar = page.locator('#relTest .eiti-rel-bar').first();
  await bar.locator('[data-w="rel"]').first().click();
  await expect(bar.locator('.eiti-rel-panel .eiti-rel-chip').first()).toBeVisible();
  await bar.locator('[data-w="why"]').first().click();
  await expect(bar.locator('.eiti-rel-panel')).toContainText('Традиция');
});

test('настройки: выключение скрывает кнопки, режим сохраняется; EN/DE подписи', async ({ page }) => {
  await boot(page);
  await expect(page.locator('#eiti-rel-show')).toBeChecked();
  await expect(page.locator('#eiti-rel-mode')).toHaveValue('offline');
  await page.evaluate(() => { eitiRelSet('related', false); eitiRelSet('reasoning', false); eitiRelSet('save', false); eitiRelSet('mode', 'ai'); });
  const t = await mount(page, 'ночной дозор рембрандт');
  expect(t).not.toContain('⟦EITIREL');
  expect(await page.evaluate(() => [localStorage.getItem('eiti_related_show'), localStorage.getItem('eiti_reasoning_mode')])).toEqual(['0', 'ai']);
  const html = await page.evaluate(() => { eitiRelSet('related', true); return EitiRelHost.bar('kb', 'kbl_x_1', 'de'); });
  expect(html).toContain('Ähnliche');
  expect(html).not.toContain('Begründung');
  expect(await page.evaluate(() => EITI_I18N._dict.en['Показывать похожие'])).toBe('Show related');
});

test('режим «С ИИ»: проверенные факты отдельно от текста ИИ; заметки — без Notes AI офлайн', async ({ page }) => {
  await boot(page, { eiti_reasoning_mode: 'ai', deepseek_api_key: 'sk-test' });
  await page.route('https://api.deepseek.com/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content: 'ОБЪЯСНЕНИЕ ИИ' } }] }) }));
  await mount(page, 'ночной дозор рембрандт');
  const bar = page.locator('#relTest .eiti-rel-bar').first();
  await bar.locator('[data-w="why"]').first().click();
  const panel = bar.locator('.eiti-rel-panel');
  await expect(panel).toContainText('ОБЪЯСНЕНИЕ ИИ');
  const txt = await panel.innerText();
  expect(txt.indexOf('Проверенные факты')).toBeLessThan(txt.indexOf('Автор'));
  expect(txt.indexOf('Автор')).toBeLessThan(txt.indexOf('Объяснение ИИ'));
  expect(txt.indexOf('Объяснение ИИ')).toBeLessThan(txt.indexOf('ОБЪЯСНЕНИЕ ИИ'));
  // a note without Notes AI consent never reaches the AI
  let calls = 0;
  await page.unroute('https://api.deepseek.com/**');
  await page.route('https://api.deepseek.com/**', (r) => { calls++; r.fulfill({ status: 200, contentType: 'application/json', body: '{"choices":[{"message":{"content":"X"}}]}' }); });
  const h = await page.evaluate(async () => {
    localStorage.setItem('eiti_notes_ai_enabled', '0');
    const notes = [{ id: 'nrel1', title: 'Борщ', body: 'свекла капуста борщ', created: 1, updated: 1 }, { id: 'nrel2', title: 'Борщ зелёный', body: 'щавель борщ', created: 1, updated: 1 }];
    notesSave(notes);
    return EitiRelHost.reasoning('note', 'nrel1', 'ru');
  });
  expect(h).toContain('Борщ');
  expect(h).not.toContain('Объяснение ИИ');
  expect(calls).toBe(0);
});

test('заметки: строка кнопок в редакторе, похожие заметки открываются', async ({ page }) => {
  await boot(page);
  const ok = await page.evaluate(() => {
    const notes = [{ id: 'nrel1', title: 'Рецепт борща', body: 'свекла капуста картофель борщ', created: 1, updated: 1 }, { id: 'nrel2', title: 'Зелёный борщ', body: 'щавель картофель борщ', created: 1, updated: 1 }];
    notesSave(notes);
    return typeof notesOpenEditor === 'function';
  });
  expect(ok).toBe(true);
  const r = await page.evaluate(async () => {
    const t = await EitiRelHost.related('note', 'nrel1', 'ru');
    return t;
  });
  expect(r).toContain('data-id="nrel2"');
});
