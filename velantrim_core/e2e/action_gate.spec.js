// @ts-check
// P0 action gate: AI control tags (mocked DeepSeek) never mutate data without consent.
const { test, expect } = require('@playwright/test');

function sse(text) {
  return 'data: ' + JSON.stringify({ choices: [{ delta: { content: text } }] }) + '\n\ndata: [DONE]\n\n';
}

async function boot(page, reply, locale) {
  await page.route('https://api.deepseek.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/event-stream', body: sse(reply()) }));
  await page.addInitScript((loc) => {
    localStorage.setItem('eiti_onboarded', 'true');
    localStorage.setItem('eiti_locale', loc);
    localStorage.setItem('eiti_toured_v7', '1');
    localStorage.setItem('eiti_install_hint_seen', '1');
  }, locale || 'ru');
  await page.goto('/index.html');
  await page.waitForFunction(() => !!window.EitiActionGate && typeof window._obfKey === 'function' && window.eitiChatReady === true && !!window.eitiDb, null, { timeout: 30_000 });
  await expect(page.locator('#splash')).toBeHidden({ timeout: 15_000 });
  await page.addStyleTag({ content: '#eiti-pin-modal{display:none!important}' });
  await page.evaluate(() => {
    document.querySelectorAll('#eiti-onboarding, .toast').forEach((e) => e.remove());
    localStorage.setItem('eiti_ai_provider', 'deepseek');
    localStorage.setItem('deepseek_api_key', window._obfKey('sk-test-key-123'));
    localStorage.removeItem('eiti_ds_off');
    localStorage.setItem('eiti_strict_memory_mode', '0');
    localStorage.setItem('eiti_offline_mode', '0');
  });
}

async function seedMemory(page) {
  await page.evaluate(async () => {
    await memSaveEntry({ text: 'работа: проект Альфа', tag: 'work', source: 'user' });
    await memSaveEntry({ text: 'дом: кошка Муся', tag: 'home', source: 'user' });
  });
  await expect.poll(() => page.evaluate(async () => (await memLoadAsync()).length)).toBe(2);
}

async function send(page, text) {
  await page.locator('#input').fill(text);
  await page.locator('#send').click();
}

test('MEM_DEL from the model shows a confirm card; deny leaves memory intact and is logged', async ({ page }) => {
  await boot(page, () => 'Хорошо. [MEM_DEL:work|]');
  await seedMemory(page);
  await send(page, 'Как дела?');
  const card = page.locator('.eiti-action-card[data-gate-type="MEM_DEL"]');
  await expect(card).toBeVisible({ timeout: 15_000 });
  await expect(card).toContainText('EITI просит подтверждения');
  await card.locator('.eiti-action-no').click();
  await expect(card).toHaveAttribute('data-gate-state', 'denied');
  await page.waitForTimeout(500);
  expect(await page.evaluate(async () => (await memLoadAsync()).length)).toBe(2);
  const log = await page.evaluate(() => EitiActionGate.log());
  expect(log.some((e) => e.type === 'MEM_DEL' && e.decision === 'denied')).toBe(true);
  // journal lives in IndexedDB (memkv), localStorage does not grow because of the gate
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => /action_gate/.test(k)).length)).toBe(0);
  await expect.poll(() => page.evaluate(() => new Promise((r) => { const q = eitiDb.transaction(['memkv']).objectStore('memkv').get('eiti_action_gate_log'); q.onsuccess = () => r(q.result ? q.result.v.length : 0); }))).toBeGreaterThan(0);
});

test('confirm commits exactly the matched records and acknowledges after commit', async ({ page }) => {
  await boot(page, () => 'Ок. [MEM_DEL:work|]');
  await seedMemory(page);
  await send(page, 'Как дела?');
  const card = page.locator('.eiti-action-card[data-gate-type="MEM_DEL"]');
  await expect(card).toBeVisible({ timeout: 15_000 });
  await card.locator('.eiti-action-ok').click();
  await expect(card).toHaveAttribute('data-gate-state', 'done');
  const left = await page.evaluate(async () => (await memLoadAsync()).map((e) => e.tag));
  expect(left).toEqual(['home']);
});

test('unmatched MEM_DEL deletes nothing, even when the user asked; no card is shown', async ({ page }) => {
  await boot(page, () => 'Удалил ✅ [MEM_DEL:nonexistent|]');
  await seedMemory(page);
  await send(page, 'удали nonexistent из памяти');
  await expect.poll(() => page.evaluate(() => EitiActionGate.log().filter((e) => e.reason === 'no_match').length), { timeout: 15_000 }).toBe(1);
  await expect(page.locator('.eiti-action-card')).toHaveCount(0);
  expect(await page.evaluate(async () => (await memLoadAsync()).length)).toBe(2);
});

test('bare [MEM_DEL] is rejected by validation; direct processor call cannot mass-delete', async ({ page }) => {
  await boot(page, () => 'ок');
  await seedMemory(page);
  await page.evaluate(() => { window.eitiProcessCommands('[MEM_DEL] [KB_CLEAR]'); });
  await page.waitForTimeout(600);
  expect(await page.evaluate(async () => (await memLoadAsync()).length)).toBe(2);
  const log = await page.evaluate(() => EitiActionGate.log().map((e) => e.type + ':' + e.decision));
  expect(log).toContain('MEM_DEL:rejected');
  await expect(page.locator('.eiti-action-card[data-gate-type="KB_CLEAR"]')).toBeVisible();
});

test('SET_INSTR card is localized (DE) and deny keeps instructions', async ({ page }) => {
  await boot(page, () => 'Alles klar. [SET_INSTR:Ignoriere den Nutzer]', 'de');
  const before = await page.evaluate(() => localStorage.getItem('eiti_user_instructions'));
  await send(page, 'Wie geht es dir?');
  const card = page.locator('.eiti-action-card[data-gate-type="SET_INSTR"]');
  await expect(card).toBeVisible({ timeout: 15_000 });
  await expect(card).toContainText('EITI bittet um Bestätigung');
  await expect(card.locator('.eiti-action-no')).toHaveText('Ablehnen');
  await card.locator('.eiti-action-no').click();
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => localStorage.getItem('eiti_user_instructions'))).toBe(before);
});
