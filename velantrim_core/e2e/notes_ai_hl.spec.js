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
  test(`шапка ${viewport.width}x${viewport.height}: заголовок ≥120px, нет чипа, aria-label подсветки`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openEditor(page, true);

    const titleBox = await page.locator('#noteEditorTitle').boundingBox();
    expect(titleBox).not.toBeNull();
    expect(titleBox.width).toBeGreaterThanOrEqual(120);

    await expect(page.locator('#notesAiChip')).toHaveCount(0);
    await expect(page.locator('#notesAiPanel')).toBeVisible();
    await expect(page.locator('#notesAiPanelHandle')).toBeVisible();
    await expect(page.locator('#notesAiPanelClose')).toBeVisible();
    await expect(page.locator('.notes-ai-chip')).toHaveCount(0);

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

    if (viewport.width === 390) {
      fs.mkdirSync(ARTIFACTS, { recursive: true });
      const overlay = page.locator('#noteEditorOverlay');
      await overlay.locator('.note-editor-topbar').screenshot({
        path: path.join(ARTIFACTS, 'note_header_390.png'),
      });
      await page.locator('#notesAiPanel').screenshot({
        path: path.join(ARTIFACTS, 'notes_ai_sheet_390.png'),
      });
    }
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

  await page.locator('#noteSaveAsBtn').click();
  const menu = page.locator('#noteExportMenu');
  await expect(menu).toBeVisible();
  await expect(page.locator('#noteExportMenu [data-note-export="md"]')).toBeVisible();
  await expect(page.locator('#noteExportMenu [data-note-export="pdf"]')).toBeVisible();
  await expect(page.locator('#noteExportMenu [data-note-export="txt"]')).toBeVisible();
});
