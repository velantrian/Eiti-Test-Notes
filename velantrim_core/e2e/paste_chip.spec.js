// @ts-check
const { test, expect } = require('@playwright/test');

// Paste-as-chip: pasting a large block of text into the chat input should not
// flood the textarea — it collapses into a small "Pasted content" chip, and the
// full text is re-injected only when the message is actually sent. Multiple
// large pastes accumulate as SEPARATE chips (v13.5+). This is the behaviour the
// backup paste-hook installs (with Android fallbacks); the test drives the real
// `paste` event through the page.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('eiti_onboarded', 'true');
  });
});

async function gotoApp(page) {
  await page.goto('/index.html');
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => !!document.getElementById('input'), null, { timeout: 15_000 });
}

// Dispatch a real `paste` event carrying clipboard text into #input.
async function pasteText(page, text) {
  await page.evaluate((t) => {
    const input = document.getElementById('input');
    input.focus();
    const dt = new DataTransfer();
    dt.setData('text/plain', t);
    input.dispatchEvent(new ClipboardEvent('paste', {
      clipboardData: dt, bubbles: true, cancelable: true,
    }));
  }, text);
}

test('pasting a large block collapses into a chip instead of filling the input', async ({ page }) => {
  await gotoApp(page);

  const big = 'A'.repeat(1200); // well over the 300-char threshold
  await pasteText(page, big);

  // The chip appears and the textarea is NOT flooded with the pasted text.
  const chip = page.locator('.eiti-paste-chip');
  await expect(chip).toHaveCount(1);
  await expect(chip).toContainText('Pasted content');
  const inputVal = await page.evaluate(() => document.getElementById('input').value);
  expect(inputVal).not.toContain('AAAA');

  // The full text is buffered for send-time injection.
  const buffered = await page.evaluate(() => (window._eitiPastedTextBuffer || '').length);
  expect(buffered).toBe(big.length);
});

test('a small paste is left inline (no chip)', async ({ page }) => {
  await gotoApp(page);

  await pasteText(page, 'short note');

  await expect(page.locator('.eiti-paste-chip')).toHaveCount(0);
});

test('clicking the chip opens a preview modal with the full text', async ({ page }) => {
  await gotoApp(page);

  const big = 'Длинный вставленный текст. '.repeat(60);
  await pasteText(page, big);

  await page.locator('.eiti-paste-chip').first().click();
  const modal = page.locator('#eiti-paste-modal');
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('Длинный вставленный текст');
});

test('multiple large pastes accumulate as separate chips', async ({ page }) => {
  await gotoApp(page);

  const a = 'A'.repeat(1200);
  const b = 'B'.repeat(1500);
  await pasteText(page, a);
  await pasteText(page, b);

  // Two distinct chips, numbered "Вставка 1" / "Вставка 2".
  const chips = page.locator('.eiti-paste-chip');
  await expect(chips).toHaveCount(2);
  await expect(chips.nth(0)).toContainText('Вставка 1');
  await expect(chips.nth(1)).toContainText('Вставка 2');

  // The send-time buffer is the two blocks joined (a + "\n\n" + b).
  const buffered = await page.evaluate(() => (window._eitiPastedTextBuffer || '').length);
  expect(buffered).toBe(a.length + 2 + b.length);

  // Removing the first chip leaves the second and shrinks the buffer to b.
  await page.locator('.eiti-paste-chip').first().locator('button').click();
  await expect(page.locator('.eiti-paste-chip')).toHaveCount(1);
  const bufferedAfter = await page.evaluate(() => (window._eitiPastedTextBuffer || '').length);
  expect(bufferedAfter).toBe(b.length);
});
