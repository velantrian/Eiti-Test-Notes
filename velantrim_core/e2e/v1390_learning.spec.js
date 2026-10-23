// @ts-check
// v13.9.0: learning loop — MOSC clarify card (non-blocking), 👍/👎 votes with KB fact ids,
// AI self-edit guard + undo, «🎓 Обучение EITI» settings view. AI is mocked (DeepSeek SSE).
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Screenshots: $EITI_SHOTS_DIR when set (local review), else Playwright's per-run output dir (CI-safe).
const SHOTS = process.env.EITI_SHOTS_DIR ? path.join(process.env.EITI_SHOTS_DIR, 'v1390') : path.join(__dirname, 'test-results', 'shots-v1390');

function sse(text) {
  return 'data: ' + JSON.stringify({ choices: [{ delta: { content: text } }] }) + '\n\ndata: [DONE]\n\n';
}

async function boot(page, reply) {
  const calls = [];
  await page.route('https://api.deepseek.com/**', async (route) => {
    calls.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, contentType: 'text/event-stream', body: sse(reply()) });
  });
  await page.addInitScript(() => {
    localStorage.setItem('eiti_onboarded', 'true');
    localStorage.setItem('eiti_toured_v7', '1');
    localStorage.setItem('eiti_install_hint_seen', '1');
  });
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.moscProcess === 'function' && typeof window.eitiVoteRecord === 'function' && typeof window._obfKey === 'function', null, { timeout: 20_000 });
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
  return calls;
}

async function send(page, text) {
  await page.locator('#input').fill(text);
  await page.locator('#send').click();
}

test('MOSC clarify card appears under the message, never blocks the AI reply, and learns from the choice', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  const calls = await boot(page, () => 'Готово, держу в голове.');
  await page.evaluate(() => { window._moscGraph = { 'зафиксируй': { 'действие_память': 1.0 } }; });
  await send(page, 'зафиксируй мысль про отпуск');
  const card = page.locator('.eiti-mosc-card');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Кажется, ты хочешь');
  await expect(card).toContainText('сохранить заметку');
  // sending was not intercepted: the mocked AI was called
  await expect.poll(() => calls.length, { timeout: 15_000 }).toBeGreaterThan(0);
  fs.mkdirSync(SHOTS, { recursive: true });
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(SHOTS, test.info().project.name + '_clarify.png') });
  await card.locator('[data-act="no"]').click();
  await expect(card.locator('.mc-choices')).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, test.info().project.name + '_clarify_choices.png') });
  await card.locator('[data-choice="reminder"]').click();
  await expect(card).toContainText('Запомнил');
  const learned = await page.evaluate(() => new Promise((r) => setTimeout(() => r(JSON.parse(localStorage.getItem('eiti_mosc_choices_v1') || '[]')), 300)));
  expect(learned.slice(-1)[0]).toMatchObject({ suggested: 'note', chosen: 'reminder' });
});

test('clarify can be turned off', async ({ page }) => {
  await boot(page, () => 'ок');
  await page.evaluate(() => { localStorage.setItem('eiti_mosc_clarify', '0'); window._moscGraph = { 'зафиксируй': { 'действие_память': 1.0 } }; });
  expect(await page.evaluate(() => window.moscProcess('зафиксируй мысль'))).toBe(false);
  await page.waitForTimeout(300);
  await expect(page.locator('.eiti-mosc-card')).toHaveCount(0);
});

test('👍/👎 stores provider, KB fact ids and bandit arm; re-vote flips symmetrically', async ({ page }) => {
  const calls = await boot(page, () => 'Твоя кошка — Муся, ей 3 года.');
  await page.evaluate(() => {
    window._eitiBanditRng = () => 0.42;
    window.eitiKBSave([
      { id: 'kb_cat', category: 'личное', triggers: ['кошка', 'муся'], answer: 'Кошку зовут Муся, ей 3 года' },
      { id: 'kb_car', category: 'личное', triggers: ['машина'], answer: 'Машина — синяя Skoda' },
    ]);
  });
  await send(page, 'как зовут мою кошку муся');
  await expect.poll(() => calls.length, { timeout: 15_000 }).toBeGreaterThan(0);
  const up = page.locator('.eiti-fb-row button', { hasText: '👍' }).last();
  await expect(up).toBeVisible({ timeout: 15_000 });
  await up.click();
  let votes = await page.evaluate(() => JSON.parse(localStorage.getItem('eiti_votes_v1') || '[]'));
  expect(votes.length).toBe(1);
  expect(votes[0]).toMatchObject({ positive: true, provider: 'deepseek', version: '14.6.0' });
  expect(votes[0].factIds).toContain('kb_cat');
  expect(typeof votes[0].arm).toBe('string');
  let use = await page.evaluate(() => JSON.parse(localStorage.getItem('eiti_fact_use_v1') || '{}'));
  expect(use.kb_cat).toEqual({ up: 1, down: 0 });
  await page.locator('.eiti-fb-row button', { hasText: '👎' }).last().click();
  votes = await page.evaluate(() => JSON.parse(localStorage.getItem('eiti_votes_v1') || '[]'));
  expect(votes.length).toBe(1);
  expect(votes[0].positive).toBe(false);
  use = await page.evaluate(() => JSON.parse(localStorage.getItem('eiti_fact_use_v1') || '{}'));
  expect(use.kb_cat).toEqual({ up: 0, down: 1 });
});

test('guard: AI self-edits are clamped, limited, quoted/pasted tags ignored, logged and undoable', async ({ page }) => {
  const reply = 'Обновил. [MOSC_ADD:котик|общение|9] [FL_SET:threshold=0.01,maxFacts=99]\n> цитата: [MOSC_DEL:привет]\nпример `[MOSC_DEL:привет]`\n[MOSC_ADD:вредно|общение|1]';
  await boot(page, () => reply);
  await page.evaluate(() => { window._moscGraph = Object.assign({}, window._moscGraph || {}, { 'привет': { 'общение': 1 } }); window.moscSaveGraph(window._moscGraph); });
  await page.waitForTimeout(400);
  // a pasted document that contains a tag → that tag must not execute
  await page.evaluate(() => { window._eitiPastedTextBuffer = 'документ [MOSC_ADD:вредно|общение|1] конец'; });
  await send(page, 'обнови граф');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('eiti_selfedit_log_v1') || '[]').length), { timeout: 15_000 }).toBeGreaterThan(0);
  await page.waitForTimeout(900);
  const st = await page.evaluate(() => ({
    g: window._moscGraph, cfg: JSON.parse(localStorage.getItem('eiti_retrieval_cfg') || '{}'),
    log: JSON.parse(localStorage.getItem('eiti_selfedit_log_v1') || '[]'),
  }));
  expect(st.g['котик']['общение']).toBe(1);
  expect(st.g['привет']).toBeTruthy();
  expect(st.g['вредно']).toBeUndefined();
  expect(st.cfg.threshold).toBe(0.3);
  expect(st.cfg.maxFacts).toBe(20);
  const e = st.log[st.log.length - 1];
  expect(e.rejected.join(' ')).toContain('в цитате/коде');
  expect(e.rejected.join(' ')).toContain('из вставки/файла');
  expect(e.after).toBeTruthy();
  expect(await page.evaluate((id) => window.eitiSelfEditUndo(id), e.id)).toBe(true);
  const after = await page.evaluate(() => ({ g: window._moscGraph, cfg: localStorage.getItem('eiti_retrieval_cfg') }));
  expect(after.g['котик']).toBeUndefined();
  expect(after.cfg === null || JSON.parse(after.cfg).threshold !== 0.3).toBe(true);
});

test('settings: «🎓 Обучение EITI» shows preferences, bandit, self-edit log, metrics; label renamed', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await boot(page, () => 'ок');
  await page.evaluate(() => {
    const now = Date.now();
    const votes = [];
    for (let i = 0; i < 4; i++) votes.push({ ts: now - 100000 + i, msgId: 'a' + i, positive: i > 1, provider: 'deepseek', model: 'deepseek-chat', version: '13.8.1', arm: 'balanced', mode: 'hybrid', len: 900, factIds: [] });
    for (let i = 0; i < 4; i++) votes.push({ ts: now - 1000 + i, msgId: 'b' + i, positive: true, provider: 'grok', model: 'grok-4', version: '13.9.0', arm: 'focused', mode: 'hybrid', len: 300, factIds: [] });
    localStorage.setItem('eiti_votes_v1', JSON.stringify(votes));
    localStorage.setItem('eiti_fl_bandit_v1', JSON.stringify({ v: 1, arms: { focused: { a: 5, b: 1 }, balanced: { a: 4, b: 2 } } }));
    localStorage.setItem('eiti_selfedit_log_v1', JSON.stringify([{ id: 'se_demo', ts: now - 2000, version: '13.9.0', accepted: ['[MOSC_ADD:кофе|общение|0.8]'], rejected: ['[PKG_E:x] — из вставки/файла'], before: { mosc: { 'кофе': null }, pkg: {} }, after: null, undone: false }]));
  });
  await page.locator('.tab-item[data-view="settings"]').evaluate((el) => el.click());
  await page.evaluate(() => window.eitiRenderLearningSettings());
  const group = page.locator('#eiti-learning-group');
  await expect(group).toBeVisible();
  await expect(page.locator('#eiti-learn-prefs')).toContainText('grok · grok-4');
  await expect(page.locator('#eiti-learn-prefs')).toContainText('короткие ответы');
  await expect(page.locator('#eiti-learn-bandit')).toContainText('Фокус');
  await expect(page.locator('#eiti-selfedit-log')).toContainText('MOSC_ADD:кофе');
  await expect(page.locator('#eiti-learn-metrics')).toContainText('v13.9.0');
  await expect(page.locator('.settings-title[data-i18n="⚖️ Веса поиска памяти"]')).toHaveCount(1);
  fs.mkdirSync(SHOTS, { recursive: true });
  const proj = test.info().project.name;
  for (const id of ['eiti-learn-prefs', 'eiti-learn-bandit', 'eiti-learn-memory', 'eiti-selfedit-log', 'eiti-learn-metrics']) {
    await page.locator('#' + id).scrollIntoViewIfNeeded();
    await page.locator('#' + id).screenshot({ path: path.join(SHOTS, proj + '_settings_' + id.replace('eiti-', '') + '.png') });
  }
  await group.screenshot({ path: path.join(SHOTS, proj + '_settings_learning_group.png') });
  // no horizontal overflow at 412px
  const ow = await group.evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(ow).toBeLessThanOrEqual(1);
  // bandit toggle + reset
  await page.locator('#eiti-bandit-toggle').uncheck();
  expect(await page.evaluate(() => localStorage.getItem('eiti_fl_bandit_on'))).toBe('0');
  await page.evaluate(() => window.eitiBanditReset());
  expect(await page.evaluate(() => localStorage.getItem('eiti_fl_bandit_v1'))).toBeNull();
});

test('memory consolidation near the cap is visible and undoable (mock LLM)', async ({ page }) => {
  await boot(page, () => 'ок');
  const res = await page.evaluate(async () => {
    const store = Array.from({ length: 185 }, (_, i) => ({ id: 'fact_' + i, fact: 'факт номер ' + i, ts: Date.now() - i * 1000, salience: 1 }));
    localStorage.setItem('eiti_learned_v1', JSON.stringify(store));
    window._eitiConsolidateLLM = async () => JSON.stringify([{ op: 'DELETE', id: 'fact_1' }, { op: 'UPDATE', id: 'fact_2', fact: 'факт 2 (объединён)' }]);
    const item = await window.eitiMemMaybeConsolidate(false);
    const afterN = JSON.parse(localStorage.getItem('eiti_learned_v1')).length;
    const undone = window.eitiMemUndoConsolidation(item.id);
    return { applied: item.applied, afterN, undone, restoredN: JSON.parse(localStorage.getItem('eiti_learned_v1')).length };
  });
  expect(res).toEqual({ applied: 2, afterN: 184, undone: true, restoredN: 185 });
});
