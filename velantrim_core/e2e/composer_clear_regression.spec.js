// @ts-check
const { test, expect } = require('@playwright/test');

// Test the actual single-file PWA. The CI browser can have a collapsed chat
// panel, so deterministic DOM state is more reliable than pixel coordinates.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('eiti_onboarded', 'true');
    localStorage.setItem('eiti_toured_v7', '1');
    localStorage.setItem('eiti_install_hint_seen', '1');
    localStorage.removeItem('eiti_chat_panel_btns');
  });
  await page.goto('/index.html');
  await page.waitForFunction(() =>
    typeof window.eitiComposerClearInput === 'function' &&
    typeof window.eitiComposerUndo === 'function' &&
    typeof window.eitiWithOfflineTyping === 'function' &&
    !!document.getElementById('eiti-composer-clear'));
});

async function draft(page, value) {
  await page.evaluate((text) => {
    const input = document.getElementById('input');
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

test('clear switch persists, both controls stay in sync, and toggles never erase the draft', async ({ page }) => {
  await draft(page, 'НЕ СТИРАТЬ: исследовательская заметка');
  const settingsState = await page.evaluate(() => {
    document.getElementById('eiti-composer-clear-toggle').click();
    return {
      stored: localStorage.getItem('eiti_composer_clear'),
      checked: document.getElementById('eiti-composer-clear-toggle').getAttribute('aria-checked'),
      hidden: document.getElementById('eiti-composer-clear').hasAttribute('hidden'),
      draft: document.getElementById('input').value,
    };
  });
  expect(settingsState).toEqual({
    stored: '1', checked: 'true', hidden: false, draft: 'НЕ СТИРАТЬ: исследовательская заметка',
  });

  await page.evaluate(() => window.eitiChatPlusToggle());
  await expect(page.locator('#chat-plus-popup .cpi-clear-pin')).toHaveAttribute('aria-checked', 'true');
  await page.evaluate(() => document.querySelector('#chat-plus-popup .cpi-clear-pin').click());
  await expect(page.locator('#chat-plus-popup .cpi-clear-pin')).toHaveAttribute('aria-checked', 'false');
  expect(await page.evaluate(() => ({
    stored: localStorage.getItem('eiti_composer_clear'),
    hidden: document.getElementById('eiti-composer-clear').hasAttribute('hidden'),
    draft: document.getElementById('input').value,
  }))).toEqual({ stored: '0', hidden: true, draft: 'НЕ СТИРАТЬ: исследовательская заметка' });

  await page.evaluate(() => window.eitiComposerClearSetVisible(true));
  await page.reload();
  await page.waitForFunction(() => typeof window.eitiComposerClearSetVisible === 'function');
  expect(await page.evaluate(() => ({
    stored: localStorage.getItem('eiti_composer_clear'),
    checked: document.getElementById('eiti-composer-clear-toggle').getAttribute('aria-checked'),
    hidden: document.getElementById('eiti-composer-clear').hasAttribute('hidden'),
  }))).toEqual({ stored: '1', checked: 'true', hidden: false });

  await draft(page, 'ЧЕРНОВИК ОСТАЁТСЯ');
  const independent = await page.evaluate(() => {
    window.eitiComposerUndoSetVisible(false);
    const button = document.getElementById('eiti-composer-clear');
    return {
      buttonParent: button.parentElement.className,
      buttonDisplay: getComputedStyle(button).display,
      arrowsHidden: document.getElementById('chat-undo-col').hasAttribute('hidden'),
      buttonHidden: button.hasAttribute('hidden'),
      draft: document.getElementById('input').value,
    };
  });
  expect(independent.buttonParent).toContain('chat-composer-shell');
  expect(independent.buttonDisplay).not.toBe('none');
  expect(independent).toMatchObject({ arrowsHidden: true, buttonHidden: false, draft: 'ЧЕРНОВИК ОСТАЁТСЯ' });
});

test('instant clear retains pending text in undo, redo re-clears, and + menu uses same history', async ({ page }) => {
  const first = await page.evaluate(() => {
    window.eitiComposerClearSetVisible(true);
    const input = document.getElementById('input');
    input.value = 'Срочный текст, введённый менее 280 мс назад';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('eiti-composer-clear').click();
    return { after: input.value, undoEnabled: !document.getElementById('eiti-composer-undo').disabled };
  });
  expect(first).toEqual({ after: '', undoEnabled: true });
  await page.evaluate(() => window.eitiComposerUndo());
  await expect(page.locator('#input')).toHaveValue('Срочный текст, введённый менее 280 мс назад');
  await page.evaluate(() => window.eitiComposerRedo());
  await expect(page.locator('#input')).toHaveValue('');
  await page.evaluate(() => window.eitiComposerUndo());
  await page.evaluate(() => window.eitiChatPlusAction('_eitiClearInput'));
  await expect(page.locator('#input')).toHaveValue('');
  await page.evaluate(() => window.eitiComposerUndo());
  await expect(page.locator('#input')).toHaveValue('Срочный текст, введённый менее 280 мс назад');
});

test('offline gold typing survives version bump: fast, delayed and rejection paths', async ({ page }) => {
  await page.evaluate(async () => {
    const value = await window.eitiWithOfflineTyping(Promise.resolve('fast'), 420);
    if (value !== 'fast') throw new Error('fast path value changed');
    await new Promise((resolve) => setTimeout(resolve, 230));
  });
  await expect(page.locator('#eiti-offline-typing')).toHaveCount(0);

  await page.evaluate(() => {
    window.__slowResult = window.eitiWithOfflineTyping(
      new Promise((resolve) => { window.__resolveSlow = resolve; }), 420);
  });
  await expect(page.locator('#eiti-offline-typing .eiti-typing-dots.eiti-typing-offline span')).toHaveCount(3);
  const style = await page.locator('#eiti-offline-typing .eiti-typing-dots span').first()
    .evaluate((el) => ({ animation: getComputedStyle(el).animationName, background: getComputedStyle(el).backgroundImage }));
  expect(style.animation).toContain('eitiOfflineDotPulse');
  expect(style.background).toContain('radial-gradient');
  await page.evaluate(() => window.__resolveSlow('slow'));
  expect(await page.evaluate(() => window.__slowResult)).toBe('slow');
  await expect(page.locator('#eiti-offline-typing')).toHaveCount(0);

  await page.evaluate(() => {
    window.__errorResult = window.eitiWithOfflineTyping(
      new Promise((_, reject) => { window.__rejectSlow = reject; }), 420)
      .then(() => 'unexpected success', (err) => err.message);
  });
  await expect(page.locator('#eiti-offline-typing .eiti-typing-dots span')).toHaveCount(3);
  await page.evaluate(() => window.__rejectSlow(new Error('simulated failure')));
  expect(await page.evaluate(() => window.__errorResult)).toBe('simulated failure');
  await expect(page.locator('#eiti-offline-typing')).toHaveCount(0);
});
