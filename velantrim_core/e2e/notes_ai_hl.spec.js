// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ARTIFACTS = '/opt/cursor/artifacts';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('eiti_onboarded', 'true');
    localStorage.setItem('eiti_notes_ai_enabled', '1');
  });
});

async function openEditor(page, withPanel) {
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.eitiNotesHlToggle === 'function');
  await page.evaluate((openPanel) => {
    const overlay = document.getElementById('noteEditorOverlay');
    document.body.appendChild(overlay);
    overlay.classList.add('active');
    Object.assign(overlay.style, {
      display: 'flex', position: 'fixed', inset: '0', width: '100vw', height: '100vh', zIndex: '99999',
    });
    const title = document.getElementById('noteEditorTitle');
    if (title) title.value = 'Заголовок заметки';
    if (typeof window.eitiNotesAIOnEditorOpen === 'function') window.eitiNotesAIOnEditorOpen();
    if (typeof window.eitiNotesHlBindUI === 'function') window.eitiNotesHlBindUI();
    if (typeof window.eitiNotesHlOnEditorOpen === 'function') window.eitiNotesHlOnEditorOpen(null);
    if (typeof window.eitiNotesSyncKeyboardChrome === 'function') window.eitiNotesSyncKeyboardChrome();
    if (openPanel && typeof window.eitiNotesAITogglePanel === 'function') window.eitiNotesAITogglePanel(true);
  }, !!withPanel);
}

async function injectAiPair(page) {
  await page.evaluate(() => {
    const body = document.getElementById('noteEditorBody');
    const title = document.getElementById('noteEditorTitle');
    if (title) title.value = 'Заголовок заметки';
    if (body) body.value = 'после';
    window.eitiNotesHlOnAiChange('до', 'после');
    const extra = window.eitiNotesAiUndoRecord({}, 'до', 'после');
    window._eitiNotesAiUndoDraft = extra;
    window.eitiNotesAiUndoSyncButtons();
  });
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 360, height: 800 },
]) {
  test(`шапка ${viewport.width}x${viewport.height}: заголовок ≥120px, 📋 в шапке, формат из ⋯`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openEditor(page, false);

    const titleBox = await page.locator('#noteEditorTitle').boundingBox();
    expect(titleBox).not.toBeNull();
    expect(titleBox.width).toBeGreaterThanOrEqual(120);

    const topbar = page.locator('.note-editor-topbar');
    const copy = page.locator('#noteCopyAllBtn');
    await expect(copy).toBeVisible();
    const topbarBox = await topbar.boundingBox();
    const copyBox = await copy.boundingBox();
    expect(copyBox.y).toBeGreaterThan(topbarBox.y - 4);
    expect(copyBox.y).toBeLessThan(topbarBox.y + topbarBox.height);

    await expect(page.locator('.note-editor-topbar-actions #noteEditorDelete')).toHaveCount(0);
    await expect(page.locator('#noteEditorDelete')).toBeHidden();
    await expect(page.locator('.note-editor-topbar-actions .note-fmt-btn')).toHaveCount(0);
    await expect(page.locator('#noteFmtPopover')).toBeHidden();
    await expect(page.locator('#notesAiChip')).toHaveCount(0);

    const askBox = await page.locator('#notesAiAskBtn').boundingBox();
    expect(askBox).not.toBeNull();
    expect(askBox.width).toBeGreaterThanOrEqual(120);
    await expect(page.locator('#notesAiSearchBtn')).toBeVisible();
    await expect(page.locator('#notesAiEditBtn')).toBeVisible();
    await expect(page.locator('#noteEditorSave')).toHaveCount(0);
    await expect(page.locator('.note-editor-topbar-actions')).not.toContainText('💾');
    await expect(page.locator('#notesAiFabBar #noteSaveAsBtn')).toHaveCount(0);
    await expect(page.locator('#notesAiFabBar #noteShareBtn')).toHaveCount(0);
    await expect(page.locator('#noteSaveAsBtn')).toBeHidden();
    await expect(page.locator('#noteShareBtn')).toBeHidden();

    if (viewport.width === 390) {
      fs.mkdirSync(ARTIFACTS, { recursive: true });
      const overlay = page.locator('#noteEditorOverlay');
      await overlay.locator('.note-editor-topbar').screenshot({
        path: path.join(ARTIFACTS, 'note_header_390.png'),
      });
      await overlay.locator('#notesAiFabBar').screenshot({
        path: path.join(ARTIFACTS, 'note_editor_bottom_row_390.png'),
      });
    }

    await page.locator('#noteMoreBtn').click();
    const more = page.locator('#noteMoreMenu');
    await expect(more).toBeVisible();
    await expect(page.locator('#noteMoreMenu #noteFmtToggle')).toBeVisible();
    await expect(page.locator('#noteFmtToggle')).toHaveAttribute('aria-label', 'Формат и цвет');
    await expect(page.locator('#noteMoreMenu #noteSaveAsBtn')).toBeVisible();
    await expect(page.locator('#noteSaveAsBtn')).toHaveText(/Сохранить как файл/);
    await expect(page.locator('#noteMoreMenu #noteShareBtn')).toBeVisible();
    await expect(page.locator('#noteShareBtn')).toHaveText(/Отправить/);
    await expect(page.locator('#noteMoreMenu #noteEditorDelete')).toBeVisible();
    await expect(page.locator('#noteEditorDelete')).toHaveText(/Удалить заметку/);
    const moreLabels = (await page.locator('#noteMoreMenu button:visible').allTextContents())
      .map((t) => t.replace(/\s+/g, ' ').trim());
    expect(moreLabels).toEqual([
      'Аа Шрифт и цвет',
      '💾 Сохранить как файл',
      '📤 Отправить',
      '🔔 Напоминание',
      '☀️ Светлый режим',
      '🗑 Удалить заметку',
    ]);

    if (viewport.width === 390) {
      const overlay = page.locator('#noteEditorOverlay');
      await overlay.screenshot({ path: path.join(ARTIFACTS, 'note_more_menu_390.png') });
    }

    await page.locator('#noteFmtToggle').click();
    await expect(more).toBeHidden();
    await expect(page.locator('#noteFmtPopover')).toBeVisible();
    await expect(page.locator('#noteFmtPopover [data-fmt="bold"]')).toBeVisible();
    await expect(page.locator('#noteFmtPopover [data-fmt="italic"]')).toBeVisible();
    await expect(page.locator('#noteFmtPopover #noteColorRow')).toBeVisible();
    await expect(page.locator('#noteFmtPopover .note-color-dot').first()).toBeVisible();

    if (viewport.width === 390) {
      const overlay = page.locator('#noteEditorOverlay');
      await overlay.screenshot({ path: path.join(ARTIFACTS, 'note_fmt_popover_390.png') });
      await page.evaluate(() => {
        if (typeof window.eitiNotesFmtPopoverToggle === 'function') {
          const pop = document.getElementById('noteFmtPopover');
          if (pop && pop.classList.contains('open')) window.eitiNotesFmtPopoverToggle();
        }
      });
      await expect(page.locator('#noteFmtPopover')).toBeHidden();
      await overlay.screenshot({ path: path.join(ARTIFACTS, 'note_editor_bottom_390.png') });
    } else {
      await page.locator('#noteEditorOverlay').click({ position: { x: 20, y: 200 } });
      await expect(page.locator('#noteFmtPopover')).toBeHidden();
    }

    await page.evaluate(() => {
      if (typeof window.eitiNotesAITogglePanel === 'function') window.eitiNotesAITogglePanel(true);
    });
    await expect(page.locator('#notesAiChip')).toHaveCount(0);
    await expect(page.locator('#notesAiPanel')).toBeVisible();
    await expect(page.locator('#notesAiPanelHandle')).toBeVisible();
    await expect(page.locator('#notesAiPanelClose')).toBeVisible();

    if (viewport.width === 390) {
      await page.locator('#notesAiPanel').screenshot({
        path: path.join(ARTIFACTS, 'notes_ai_sheet_390.png'),
      });
    }

    await page.evaluate(() => {
      if (typeof window.eitiNotesAITogglePanel === 'function') window.eitiNotesAITogglePanel(false);
    });
    await expect(page.locator('#noteAiTools')).toBeHidden();
    await injectAiPair(page);
    await expect(page.locator('#noteAiTools')).toBeVisible();

    const toggle = page.locator('#noteHlToggle');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-label', 'Подсветка правок ИИ');
    await expect(toggle).toHaveAttribute('title', 'Подсветка правок ИИ');
    await expect(page.locator('#noteHlToggle .note-hl-glyph')).toHaveText('Аб');

    const titleAfter = await page.locator('#noteEditorTitle').boundingBox();
    expect(titleAfter.width).toBeGreaterThanOrEqual(120);
    const askAfter = await page.locator('#notesAiAskBtn').boundingBox();
    expect(askAfter.width).toBeGreaterThanOrEqual(120);
  });
}

test('mobile 390x844: подсветка, undo/redo и меню сохранения заметки', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openEditor(page, false);

  await expect(page.locator('#noteAiTools')).toBeHidden();
  await injectAiPair(page);

  const toggle = page.locator('#noteHlToggle');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => localStorage.getItem('eiti_notes_ai_highlight'))).toBe('0');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => localStorage.getItem('eiti_notes_ai_highlight'))).toBe('1');

  await expect(page.locator('#noteAiUndoBtn')).toBeEnabled();
  await page.locator('#noteAiUndoBtn').click();
  await expect(page.locator('#noteEditorBody')).toHaveValue('до');
  await expect(page.locator('#noteAiRedoBtn')).toBeEnabled();
  await page.locator('#noteAiRedoBtn').click();
  await expect(page.locator('#noteEditorBody')).toHaveValue('после');

  await page.locator('#noteMoreBtn').click();
  await expect(page.locator('#noteMoreMenu')).toBeVisible();
  await page.locator('#noteSaveAsBtn').click();
  await expect(page.locator('#noteMoreMenu')).toBeHidden();
  const menu = page.locator('#noteExportMenu');
  await expect(menu).toBeVisible();
  await expect(page.locator('#noteExportMenu [data-note-export="md"]')).toBeVisible();
  await expect(page.locator('#noteExportMenu [data-note-export="pdf"]')).toBeVisible();
  await expect(page.locator('#noteExportMenu [data-note-export="txt"]')).toBeVisible();

  await page.locator('#noteEditorOverlay').click({ position: { x: 20, y: 200 } });
  await expect(menu).toBeHidden();
  await page.locator('#noteMoreBtn').click();
  await expect(page.locator('#noteMoreMenu')).toBeVisible();
  await page.locator('#noteShareBtn').click();
  await expect(page.locator('#noteMoreMenu')).toBeHidden();
  await expect(menu).toBeVisible();
  await expect(page.locator('#noteExportMenu [data-note-export="md"]')).toBeVisible();
});
