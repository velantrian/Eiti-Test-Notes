// @ts-check
const { test, expect } = require('@playwright/test');

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('eiti_onboarded', 'true');
    localStorage.setItem('eiti_notes_ai_enabled', '1');
  });
});

async function openEditor(page) {
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.eitiNotesHlToggle === 'function');
  await page.evaluate(() => {
    const overlay = document.getElementById('noteEditorOverlay');
    document.body.appendChild(overlay);
    overlay.classList.add('active');
    Object.assign(overlay.style, {
      display: 'flex', position: 'fixed', inset: '0', width: '100vw', height: '100vh', zIndex: '99999',
    });
    if (typeof window.eitiNotesAIOnEditorOpen === 'function') window.eitiNotesAIOnEditorOpen();
    if (typeof window.eitiNotesHlBindUI === 'function') window.eitiNotesHlBindUI();
    if (typeof window.eitiNotesHlOnEditorOpen === 'function') window.eitiNotesHlOnEditorOpen(null);
  });
}

test('mobile: кнопка подсветки, undo/redo и меню сохранения заметки', async ({ page }) => {
  await openEditor(page);

  const toggle = page.locator('#noteHlToggle');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => localStorage.getItem('eiti_notes_ai_highlight'))).toBe('0');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => localStorage.getItem('eiti_notes_ai_highlight'))).toBe('1');

  await expect(page.locator('#noteAiUndoBtn')).toBeDisabled();
  await expect(page.locator('#noteAiRedoBtn')).toBeDisabled();

  await page.evaluate(() => {
    const body = document.getElementById('noteEditorBody');
    const title = document.getElementById('noteEditorTitle');
    if (title) title.value = 'Тест';
    if (body) body.value = 'после';
    window.eitiNotesHlOnAiChange('до', 'после');
    const extra = window.eitiNotesAiUndoRecord({}, 'до', 'после');
    window._eitiNotesAiUndoDraft = extra;
    window.eitiNotesAiUndoSyncButtons();
  });
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
