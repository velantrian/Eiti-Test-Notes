// @ts-check
const { test, expect } = require('@playwright/test');

// v13.7.23: ↶ Отменить / ↷ Повторить в шапке заметки (любые правки), Аб в меню ⋯,
// строка тегов без пустой полосы, заголовок с «…».

const SHOTS = process.env.EITI_SHOTS_DIR || '';
test.use({ locale: 'ru-RU' });

async function openNewNote(page, { ai = true, light = false } = {}) {
  await page.addInitScript(({ ai, light }) => {
    localStorage.setItem('eiti_onboarded', 'true');
    localStorage.setItem('eiti_notes_ai_enabled', ai ? '1' : '0');
    localStorage.setItem('eiti_notes_light_mode', light ? '1' : '0');
  }, { ai, light });
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.eitiNoteUndo === 'function' && typeof openView === 'function' && typeof eitiDb !== 'undefined' && !!eitiDb, null, { timeout: 20_000 });
  await page.evaluate(() => { const ob = document.getElementById('eiti-onboarding'); if (ob) ob.remove(); openView('notes'); });
  await page.click('#notesNewBtn');
  await expect(page.locator('#noteEditorOverlay')).toHaveClass(/active/);
}

const stored = (page) => page.evaluate(() => { const n = notesLoad().find((x) => x.id === notesCurrentId); return n ? n.body : null; });

async function contrast(page, sel) {
  return page.evaluate((s) => {
    const el = document.querySelector(s);
    const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return [0, 0, 0, 0]; const p = m[1].split(',').map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
    const layers = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c[3] > 0) { layers.push(c); if (c[3] >= 1) break; } }
    let bg = [255, 255, 255];
    for (let i = layers.length - 1; i >= 0; i--) { const [r, g, b, a] = layers[i]; bg = [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)]; }
    const cs = getComputedStyle(el);
    const op = Number(cs.opacity);
    const f = parse(cs.color); const a = f[3] * op;
    const fg = [0, 1, 2].map((i) => f[i] * a + bg[i] * (1 - a));
    const lum = (c) => { const v = c.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
    const L1 = lum(fg), L2 = lum(bg);
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  }, sel);
}

test('набор → ↶ → ↷: шаги, приглушённые кнопки, автосохранение', async ({ page }) => {
  await openNewNote(page);
  const undo = page.locator('#noteUndoBtn');
  const redo = page.locator('#noteRedoBtn');
  await expect(undo).toBeVisible();
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();
  await expect(undo).toHaveAttribute('title', 'Отменить');
  await expect(redo).toHaveAttribute('title', 'Повторить');
  // кнопки — перед 📋
  const xs = await page.evaluate(() => ['noteUndoBtn', 'noteRedoBtn', 'noteCopyAllBtn', 'noteMoreBtn'].map((id) => document.getElementById(id).getBoundingClientRect().x));
  expect([...xs].sort((a, b) => a - b)).toEqual(xs);

  const body = page.locator('#noteEditorBody');
  await body.click();
  await page.keyboard.type('Привет');
  await page.waitForTimeout(900);
  await page.keyboard.type(' мир');
  await expect(undo).toBeEnabled();
  await expect(redo).toBeDisabled();
  await page.waitForTimeout(1000); // автосохранение набора
  expect(await stored(page)).toBe('Привет мир');

  await undo.click();
  await expect(body).toHaveValue('Привет');
  expect(await stored(page)).toBe('Привет'); // ↶ сохраняется сразу
  await expect(redo).toBeEnabled();
  await undo.click();
  await expect(body).toHaveValue('');
  await expect(undo).toBeDisabled();
  await redo.click();
  await expect(body).toHaveValue('Привет');
  expect(await stored(page)).toBe('Привет');
  await expect(body).toBeFocused(); // фокус/клавиатура не теряются

  // новая правка очищает «повтор»
  await page.keyboard.type('!');
  await expect(redo).toBeDisabled();
  await expect(body).toHaveValue('Привет!');

  // приглушённая, но видимая
  const op = await redo.evaluate((el) => Number(getComputedStyle(el).opacity));
  expect(op).toBeGreaterThan(0.3);
  expect(op).toBeLessThan(0.6);
});

test('Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y; вставка и заголовок — отдельные шаги', async ({ page }) => {
  await openNewNote(page, { ai: false });
  const body = page.locator('#noteEditorBody');
  await body.click();
  await page.keyboard.type('раз');
  await page.evaluate(() => {
    const b = document.getElementById('noteEditorBody');
    b.setSelectionRange(b.value.length, b.value.length);
    const dt = new DataTransfer(); dt.setData('text/plain', ' ДВА');
    b.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await expect(body).toHaveValue('раз ДВА');
  await page.keyboard.press('Control+z');
  await expect(body).toHaveValue('раз');
  await page.keyboard.press('Control+Shift+z');
  await expect(body).toHaveValue('раз ДВА');
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+y');
  await expect(body).toHaveValue('раз ДВА');

  await page.locator('#noteEditorTitle').click();
  await page.keyboard.type('Заголовок');
  await page.keyboard.press('Control+z');
  await expect(page.locator('#noteEditorTitle')).toHaveValue('');
  await expect(body).toHaveValue('раз ДВА');
  await page.keyboard.press('Control+z');
  await expect(body).toHaveValue('раз');
});

test('правка ИИ — шаг ↶↷ с подсветкой; Аб — «Подсветка правок ИИ» в меню ⋯', async ({ page }) => {
  await openNewNote(page, { ai: true });
  await page.locator('#noteEditorBody').click();
  await page.keyboard.type('исходный текст');
  await page.evaluate(() => window.eitiNotesAIInsertIntoNote('ответ ИИ'));
  await expect(page.locator('#noteEditorBody')).toHaveValue('исходный текст\n\nответ ИИ');
  await expect(page.locator('#noteEditorHl')).toBeVisible();
  await page.locator('#noteUndoBtn').click();
  await expect(page.locator('#noteEditorBody')).toHaveValue('исходный текст');
  await expect(page.locator('#noteEditorHl')).toBeHidden();
  await page.locator('#noteRedoBtn').click();
  await expect(page.locator('#noteEditorBody')).toHaveValue('исходный текст\n\nответ ИИ');
  await expect(page.locator('#noteEditorHl')).toBeVisible();

  await expect(page.locator('#noteAiTools')).toHaveCount(0);
  await page.locator('#noteMoreBtn').click();
  const hl = page.locator('#noteHlToggle');
  await expect(hl).toBeVisible();
  await expect(hl).toContainText('Подсветка правок ИИ');
  await expect(page.locator('#noteHlState')).toHaveText('вкл');
  if (SHOTS) { await page.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove())); await page.screenshot({ path: `${SHOTS}/after-more-menu-ab.png` }); }
  await hl.click();
  await expect(page.locator('#noteEditorHl')).toBeHidden();
  await page.locator('#noteMoreBtn').click();
  await expect(page.locator('#noteHlState')).toHaveText('выкл');
});

for (const light of [true, false]) {
  test(`контраст ↶ ≥ 3:1, ↷ приглушена — ${light ? '☀️ светлый' : 'тёмный'}`, async ({ page }) => {
    await openNewNote(page, { light });
    await page.evaluate(() => {
      document.getElementById('noteEditorTitle').value = 'Сравнение ИИ: Luna vs Gemini vs Terra — длинный заголовок';
      const b = document.getElementById('noteEditorBody');
      b.value = 'Вот визуально структурированный аналитический отчёт.\n\n🧠 Сравнение ИИ: Luna vs Gemini vs Terra\n\nЭкспертная оценка по представленным ответам.';
      b.dispatchEvent(new Event('input', { bubbles: true }));
      b.blur();
      document.querySelectorAll('.toast').forEach((t) => t.remove());
    });
    await expect(page.locator('#noteUndoBtn')).toBeEnabled();
    await expect(page.locator('#noteRedoBtn')).toBeDisabled();
    expect(await contrast(page, '#noteUndoBtn')).toBeGreaterThanOrEqual(3);
    expect(await contrast(page, '#noteRedoBtn')).toBeGreaterThan(1.3); // видна
    // заголовок: «…» вне фокуса, ширина разумная
    const t = await page.evaluate(() => { const el = document.getElementById('noteEditorTitle'); const cs = getComputedStyle(el); return { to: cs.textOverflow, ov: el.scrollWidth > el.clientWidth, w: el.getBoundingClientRect().width }; });
    expect(t.to).toBe('ellipsis');
    expect(t.ov).toBe(true);
    expect(t.w).toBeGreaterThanOrEqual(150);
    await page.waitForTimeout(400);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/after-undo-${light ? 'light' : 'dark'}.png` });
  });
}

test('теги: без Notes AI прижаты к нижней навигации (≤ 2px), с AI — не закрыты панелью', async ({ page }) => {
  await openNewNote(page, { ai: false });
  await page.evaluate(() => { document.getElementById('noteEditorTags').value = 'работа, идеи'; document.activeElement && document.activeElement.blur(); });
  const off = await page.evaluate(() => {
    const row = document.querySelector('#noteEditorOverlay .note-tags-row').getBoundingClientRect();
    const nav = document.querySelector('.tab-bar').getBoundingClientRect();
    return { gap: nav.top - row.bottom, h: row.height };
  });
  expect(Math.abs(off.gap)).toBeLessThanOrEqual(2);
  expect(off.h).toBeLessThan(45);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/after-tags-ai-off.png` });

  await page.evaluate(() => { localStorage.setItem('eiti_notes_ai_enabled', '1'); window.eitiNotesAISyncControl && window.eitiNotesAISyncControl(); });
  await expect(page.locator('#notesAiAskBtn')).toBeVisible();
  const on = await page.evaluate(() => {
    const tags = document.getElementById('noteEditorTags').getBoundingClientRect();
    const bar = document.getElementById('notesAiFabBar').getBoundingClientRect();
    return { tagsBottom: tags.bottom, barTop: bar.top };
  });
  expect(on.tagsBottom).toBeLessThanOrEqual(on.barTop);
});
