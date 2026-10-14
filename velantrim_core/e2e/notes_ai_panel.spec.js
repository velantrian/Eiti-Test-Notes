// @ts-check
const { test, expect } = require('@playwright/test');

test('mobile Notes AI panel follows drag, remembers height, and toggles fullscreen on double tap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('eiti_onboarded', 'true');
    localStorage.setItem('eiti_notes_ai_enabled', '1');
  });
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.eitiNotesAISetPanelHeight === 'function');

  await page.evaluate(() => {
    const overlay = document.getElementById('noteEditorOverlay');
    document.body.appendChild(overlay);
    overlay.classList.add('active');
    Object.assign(overlay.style, {
      display: 'flex', position: 'fixed', inset: '0', width: '100vw', height: '100vh', zIndex: '99999',
    });
    window.eitiNotesAIOnEditorOpen();
    window.eitiNotesAITogglePanel(true);
  });

  const panel = page.locator('#notesAiPanel');
  const handle = page.locator('#notesAiPanelHandle');
  await expect(panel).toBeVisible();
  await expect(handle).toBeVisible();
  const before = await panel.boundingBox();
  const grip = await handle.boundingBox();
  expect(before).not.toBeNull();
  expect(grip).not.toBeNull();
  expect(Math.abs((grip.x + grip.width / 2) - (before.x + before.width / 2))).toBeLessThan(2);

  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2 - 120, { steps: 6 });
  await page.mouse.up();

  const after = await panel.boundingBox();
  expect(after).not.toBeNull();
  expect(after.height).toBeGreaterThan(before.height + 100);
  const savedHeight = await page.evaluate(() => Number(localStorage.getItem('eiti_notes_ai_height_px')));
  expect(savedHeight).toBeGreaterThan(before.height + 100);
  expect(Math.abs(after.height - savedHeight)).toBeLessThan(2);

  await page.dblclick('#notesAiPanelHandle', { delay: 70 });
  await expect(panel).toHaveClass(/notes-ai-fullscreen/);
  const toolbarDisplays = await page.evaluate(() => ({
    topbar: getComputedStyle(document.querySelector('.note-editor-topbar')).display,
    toolbar: getComputedStyle(document.querySelector('.note-editor-toolbar')).display,
  }));
  expect(toolbarDisplays).toEqual({ topbar: 'none', toolbar: 'none' });
  const fullscreenHeight = await panel.evaluate((el) => el.getBoundingClientRect().height);
  expect(fullscreenHeight).toBeGreaterThan(after.height + 100);

  await page.dblclick('#notesAiPanelHandle', { delay: 70 });
  await expect(panel).not.toHaveClass(/notes-ai-fullscreen/);
  await expect(page.locator('.note-editor-topbar')).toBeVisible();
  const restoredHeight = await panel.evaluate((el) => el.getBoundingClientRect().height);
  expect(Math.abs(restoredHeight - savedHeight)).toBeLessThan(2);

  const downStart = await handle.boundingBox();
  await page.mouse.move(downStart.x + downStart.width / 2, downStart.y + downStart.height / 2);
  await page.mouse.down();
  await page.mouse.move(downStart.x + downStart.width / 2, downStart.y + downStart.height / 2 + 80, { steps: 5 });
  await page.mouse.up();
  const lowered = await panel.boundingBox();
  expect(lowered.height).toBeLessThan(restoredHeight - 60);
  const loweredSavedHeight = await page.evaluate(() => Number(localStorage.getItem('eiti_notes_ai_height_px')));
  expect(Math.abs(lowered.height - loweredSavedHeight)).toBeLessThan(2);

  await page.evaluate(() => {
    window.eitiNotesAITogglePanel(false);
    window.eitiNotesAITogglePanel(true);
  });
  const reopenedHeight = await panel.evaluate((el) => el.getBoundingClientRect().height);
  expect(Math.abs(reopenedHeight - loweredSavedHeight)).toBeLessThan(2);
});
