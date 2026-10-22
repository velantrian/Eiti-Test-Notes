// @ts-check
const { test, expect } = require('@playwright/test');

// v13.7.21: светлый режим заметки (☀️) — контраст ключевых элементов,
// сохранение выбора, вставка «как есть», тело без trim, превью pre-line.

const SHOTS = process.env.EITI_SHOTS_DIR || '';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('eiti_onboarded', 'true');
    localStorage.setItem('eiti_notes_ai_enabled', '1');
  });
  await page.setViewportSize({ width: 412, height: 915 });
});

async function openNewNote(page) {
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.eitiNoteToggleLight === 'function' && typeof openView === 'function' && typeof eitiDb !== 'undefined' && !!eitiDb, null, { timeout: 20_000 });
  await page.evaluate(() => {
    const ob = document.getElementById('eiti-onboarding'); if (ob) ob.remove();
    openView('notes');
  });
  await page.click('#notesNewBtn');
  await expect(page.locator('#noteEditorOverlay')).toHaveClass(/active/);
}

async function setLight(page, on) {
  await page.evaluate((want) => {
    const ov = document.getElementById('noteEditorOverlay');
    if (ov.classList.contains('note-light-mode') !== want) window.eitiNoteToggleLight();
  }, on);
}

// Контраст WCAG: цвет текста против эффективного фона (композиция фонов предков).
async function contrastOf(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { sel, missing: true };
    const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return [0, 0, 0, 0]; const p = m[1].split(',').map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
    const layers = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c[3] > 0) { layers.push(c); if (c[3] >= 1) break; }
    }
    let bg = [255, 255, 255];
    for (let i = layers.length - 1; i >= 0; i--) { const [r, g, b, a] = layers[i]; bg = [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)]; }
    const cs = getComputedStyle(el);
    const fgc = parse(cs.webkitTextFillColor && cs.webkitTextFillColor !== 'rgba(0, 0, 0, 0)' ? cs.webkitTextFillColor : cs.color);
    const fg = [0, 1, 2].map((i) => fgc[i] * fgc[3] + bg[i] * (1 - fgc[3]));
    const lum = (c) => { const v = c.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
    const L1 = lum(fg), L2 = lum(bg);
    return { sel, ratio: (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05), fg: cs.color, bg: bg.map(Math.round).join(',') };
  }, selector);
}

async function expectContrast(page, selectors, min) {
  for (const sel of selectors) {
    const r = await contrastOf(page, sel);
    expect(r.missing, sel + ' exists').toBeFalsy();
    expect(r.ratio, `${sel}: ${r.fg} on rgb(${r.bg})`).toBeGreaterThanOrEqual(min);
  }
}

test('☀️: иконки шапки, меню ⋯, экспорт, Ask AI и подсветка читаемы (контраст ≥ 3:1)', async ({ page }) => {
  await openNewNote(page);
  await setLight(page, true);
  await expectContrast(page, ['#noteMoreBtn', '#noteCopyAllBtn', '.note-editor-back', '#noteEditorTitle', '#noteEditorBody', '#noteEditorTags', '#notesAiAskBtn', '#notesAiSearchBtn'], 3);
  if (SHOTS) await page.screenshot({ path: SHOTS + '/after-light-editor.png' });

  await page.click('#noteMoreBtn');
  await expect(page.locator('#noteMoreMenu')).toBeVisible();
  await expectContrast(page, ['#noteFmtToggle', '#noteSaveAsBtn', '#noteShareBtn', '#noteReminderBtn', '#noteLightBtn', '#noteEditorDelete'], 3);
  const menuBg = await page.locator('#noteMoreMenu').evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(menuBg).toBe('rgb(245, 240, 231)');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/after-light-more-menu.png' });

  await page.click('#noteFmtToggle');
  await expect(page.locator('#noteFmtPopover')).toBeVisible();
  await expectContrast(page, ['#noteFmtPopover .note-fmt-btn'], 3);
  if (SHOTS) await page.screenshot({ path: SHOTS + '/after-light-fmt-popover.png' });
  await page.mouse.click(200, 500);

  await page.click('#noteMoreBtn');
  await page.click('#noteSaveAsBtn');
  await expect(page.locator('#noteExportMenu')).toBeVisible();
  await expectContrast(page, ['#noteExportMenu [data-note-export="md"]', '#noteExportMenu [data-note-export="pdf"]', '#noteExportMenu [data-note-export="txt"]'], 3);
  if (SHOTS) await page.screenshot({ path: SHOTS + '/after-light-export-menu.png' });
  await page.mouse.click(200, 500);

  await page.evaluate(() => window.eitiNotesAITogglePanel(true));
  await expect(page.locator('#notesAiPanel')).toBeVisible();
  await expectContrast(page, ['[data-notes-ai-q="summarize"]', '[data-notes-ai-q="rewrite"]', '[data-notes-ai-q="questions"]', '#notesAiEmojiToggle', '#notesAiPanelClose', '#notesAiInput', '#notesAiModelChip'], 3);
  const handle = await page.locator('.notes-ai-panel-handle span').evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(handle).toBe('rgb(28, 26, 23)');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/after-light-askai.png' });
  await page.evaluate(() => window.eitiNotesAITogglePanel(false));

  await page.evaluate(() => {
    document.getElementById('noteEditorBody').value = 'после правки текст';
    window.eitiNotesHlOnAiChange('до правки текст', 'после правки текст');
    window._eitiNotesAiUndoDraft = window.eitiNotesAiUndoRecord({}, 'до правки текст', 'после правки текст');
    window.eitiNotesAiUndoSyncButtons();
    window.eitiNoteUndoRecord('ai');
  });
  await expect(page.locator('#noteEditorHl')).toBeVisible();
  await expectContrast(page, ['#noteEditorHl'], 4.5);
  await expect(page.locator('#noteUndoBtn')).toBeEnabled();
  await expectContrast(page, ['#noteUndoBtn'], 3);
  await page.locator('#noteMoreBtn').click();
  await expectContrast(page, ['#noteHlToggle .note-hl-glyph'], 3);
  await page.locator('#noteMoreBtn').click(); // закрыть ⋯
  if (SHOTS) await page.screenshot({ path: SHOTS + '/after-light-hl-overlay.png' });
  await page.evaluate(() => window.eitiNotesHlClear());

  // тёмный режим без изменений
  await setLight(page, false);
  const dark = await page.evaluate(() => ({
    more: getComputedStyle(document.getElementById('noteMoreBtn')).color,
    menu: getComputedStyle(document.getElementById('noteMoreMenu')).backgroundColor,
    chip: getComputedStyle(document.querySelector('[data-notes-ai-q="summarize"]')).backgroundColor,
    body: getComputedStyle(document.getElementById('noteEditorBody')).backgroundColor,
  }));
  expect(dark).toEqual({ more: 'rgb(245, 230, 211)', menu: 'rgb(43, 30, 22)', chip: 'rgb(90, 70, 50)', body: 'rgb(32, 20, 13)' });
  if (SHOTS) await page.screenshot({ path: SHOTS + '/after-dark-editor.png' });
});

test('☀️: выбор сохраняется в localStorage и переживает перезагрузку', async ({ page }) => {
  await openNewNote(page);
  await setLight(page, true);
  expect(await page.evaluate(() => localStorage.getItem('eiti_notes_light_mode'))).toBe('1');
  await page.reload();
  await page.waitForFunction(() => typeof window.eitiNoteToggleLight === 'function');
  await expect(page.locator('#noteEditorOverlay')).toHaveClass(/note-light-mode/);
  await expect(page.locator('#noteLightBtn')).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => window.eitiNoteToggleLight());
  expect(await page.evaluate(() => localStorage.getItem('eiti_notes_light_mode'))).toBe('0');
  await page.reload();
  await page.waitForFunction(() => typeof window.eitiNoteToggleLight === 'function');
  await expect(page.locator('#noteEditorOverlay')).not.toHaveClass(/note-light-mode/);
});

test('вставка «как есть»: точный текст, без trim при сохранении, превью pre-line', async ({ page }) => {
  await openNewNote(page);
  await setLight(page, true);
  const sample = '# Заголовок\r\n\r\n**жирный** *курсив* `code` <b>tag</b> & &amp; > цитата\r\n- [ ] задача\r\n\tтаб\u00a0nbsp\u200bzw 👨‍👩‍👧 😀 ✓ → ≠ ½\r\n```js\nconst a = 2 * 3 < 7 && 1;\n```\n  ведущие и хвостовые   \n\n';
  await page.locator('#noteEditorBody').focus();
  const result = await page.evaluate((s) => {
    const el = document.getElementById('noteEditorBody');
    const dt = new DataTransfer();
    dt.setData('text/plain', s);
    const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
    return { value: el.value, prevented: ev.defaultPrevented };
  }, sample);
  expect(result.prevented).toBe(true);
  expect(result.value).toBe(sample);

  await page.fill('#noteEditorTitle', 'Тест <i>символы</i> & *md*');
  await page.evaluate(() => window.notesAutoSaveFlush());
  const stored = await page.evaluate(() => { const n = notesLoad(); return n.find((x) => x.id === notesCurrentId); });
  expect(stored.body).toBe(sample); // тело без trim
  expect(stored.title).toBe('Тест <i>символы</i> & *md*');
  // повторное сохранение без правок — без новой записи (сравнение «сырых» значений)
  expect(await page.evaluate(() => window.notesAutoSaveFlush())).toBe('nochange');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/after-light-pasted.png' });

  await page.click('#noteEditorBack');
  const preview = page.locator('.note-card-preview').first();
  await expect(preview).toBeVisible();
  const pv = await preview.evaluate((el) => ({ ws: getComputedStyle(el).whiteSpace, text: el.textContent, html: el.innerHTML }));
  expect(pv.ws).toBe('pre-line');
  expect(pv.text.startsWith('# Заголовок')).toBe(true);
  expect(pv.html).toContain('&lt;b&gt;tag&lt;/b&gt;');
  expect(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(pv.text)).toBe(false);
  if (SHOTS) { await page.waitForTimeout(700); await page.screenshot({ path: SHOTS + '/after-light-notes-list.png' }); }
});
