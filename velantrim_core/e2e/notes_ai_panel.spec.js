// @ts-check
const { test, expect } = require('@playwright/test');

test('mobile Notes AI panel opens at half height, keeps drag size for the session, and resets on reopen', async ({ page }) => {
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
  const helper = page.locator('#notesAiMsgs .notes-ai-empty-hint');
  await expect(panel).toBeVisible();
  await expect(handle).toBeVisible();
  await expect(helper).toBeVisible();
  const before = await panel.boundingBox();
  const grip = await handle.boundingBox();
  expect(before).not.toBeNull();
  expect(grip).not.toBeNull();
  const initialContainerHeight = await panel.evaluate((el) => el.parentElement.clientHeight);
  expect(Math.abs(before.height - initialContainerHeight / 2)).toBeLessThan(4);
  expect(Math.abs((grip.x + grip.width / 2) - (before.x + before.width / 2))).toBeLessThan(2);

  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2 - 120, { steps: 6 });
  await page.mouse.up();

  const after = await panel.boundingBox();
  expect(after).not.toBeNull();
  expect(after.height).toBeGreaterThan(before.height + 100);
  await page.evaluate(() => window.eitiNotesAITogglePanel(true));
  const afterRepeatedOpen = await panel.boundingBox();
  expect(Math.abs(afterRepeatedOpen.height - after.height)).toBeLessThan(2);
  const persistedHeight = await page.evaluate(() => localStorage.getItem('eiti_notes_ai_height_px'));
  expect(persistedHeight).toBeNull();

  await page.dblclick('#notesAiPanelHandle', { delay: 70 });
  await expect(panel).toHaveClass(/notes-ai-fullscreen/);
  const toolbarDisplays = await page.evaluate(() => ({
    topbar: getComputedStyle(document.querySelector('.note-editor-topbar')).display,
    toolbar: getComputedStyle(document.querySelector('.note-editor-toolbar')).display,
  }));
  expect(toolbarDisplays).toEqual({ topbar: 'none', toolbar: 'none' });
  await expect(helper).toBeHidden();
  const fullscreenHeight = await panel.evaluate((el) => el.getBoundingClientRect().height);
  expect(fullscreenHeight).toBeGreaterThan(after.height + 100);

  await page.dblclick('#notesAiPanelHandle', { delay: 70 });
  await expect(panel).not.toHaveClass(/notes-ai-fullscreen/);
  await expect(page.locator('.note-editor-topbar')).toBeVisible();
  await expect(helper).toBeVisible();
  const restoredHeight = await panel.evaluate((el) => el.getBoundingClientRect().height);
  expect(Math.abs(restoredHeight - after.height)).toBeLessThan(2);

  const downStart = await handle.boundingBox();
  await page.mouse.move(downStart.x + downStart.width / 2, downStart.y + downStart.height / 2);
  await page.mouse.down();
  await page.mouse.move(downStart.x + downStart.width / 2, downStart.y + downStart.height / 2 + 80, { steps: 5 });
  await page.mouse.up();
  const lowered = await panel.boundingBox();
  expect(lowered.height).toBeLessThan(restoredHeight - 60);
  expect(await page.evaluate(() => localStorage.getItem('eiti_notes_ai_height_px'))).toBeNull();

  await page.evaluate(() => {
    window.eitiNotesAITogglePanel(false);
    window.eitiNotesAITogglePanel(true);
  });
  await page.waitForFunction(() => {
    const el = document.getElementById('notesAiPanel');
    return el && Math.abs(el.getBoundingClientRect().height - el.parentElement.clientHeight / 2) < 4;
  });
  const reopenedHeight = await panel.evaluate((el) => el.getBoundingClientRect().height);
  const reopenedContainerHeight = await panel.evaluate((el) => el.parentElement.clientHeight);
  expect(Math.abs(reopenedHeight - reopenedContainerHeight / 2)).toBeLessThan(4);
});

test('mobile Notes AI panel stays flush with the keyboard when the editor card is shorter than the window', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('eiti_onboarded', 'true');
    localStorage.setItem('eiti_notes_ai_enabled', '1');
  });
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.eitiNotesAISetPanelHeight === 'function');

  const layout = await page.evaluate(() => {
    const originalViewport = window.visualViewport;
    if (!originalViewport) throw new Error('visualViewport is unavailable');

    const overlay = document.getElementById('noteEditorOverlay');
    document.body.appendChild(overlay);
    overlay.classList.add('active');
    Object.assign(overlay.style, {
      display: 'flex', position: 'fixed', top: '0', left: '0', width: '100vw', height: '600px', zIndex: '99999',
    });
    window.eitiNotesAIOnEditorOpen();
    window.eitiNotesAITogglePanel(true);

    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: { height: 400, offsetTop: 0 },
    });
    originalViewport.dispatchEvent(new Event('resize'));

    const panel = document.getElementById('notesAiPanel');
    return {
      parentHeight: panel.parentElement.clientHeight,
      panelBottom: panel.getBoundingClientRect().bottom,
      panelBottomStyle: panel.style.bottom,
      visibleBottom: window.visualViewport.height + window.visualViewport.offsetTop,
    };
  });

  expect(layout.parentHeight).toBe(600);
  expect(layout.panelBottomStyle).toBe('200px');
  expect(Math.abs(layout.panelBottom - layout.visibleBottom)).toBeLessThan(1);
});
