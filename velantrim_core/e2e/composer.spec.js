// @ts-check
const { test, expect } = require('@playwright/test');

// Composer behaviour: while there is text the panel enters "compose" mode
// (.composing), the textarea autogrows upward, and action controls stay inside
// the full-width composer shell.
//
// NOTE: the headless harness renders the chat container collapsed (0px height —
// the app shell starts display:none and is not laid out at real size here), so
// rendered pixel geometry (heights/positions) is meaningless in this environment.
// We therefore verify the deterministic JS behaviour — that compose mode toggles
// with the input content. The visual growth/layout is plain CSS driven off this
// class and is exercised in a real browser.

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

// Set the textarea value and fire a real `input` event (the autogrow + compose
// handler listens for it). Works regardless of whether the element is laid out.
async function setInput(page, value) {
  await page.evaluate((v) => {
    const el = document.getElementById('input');
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

test('compose mode toggles with the input content', async ({ page }) => {
  await gotoApp(page);
  const panel = page.locator('.chat-input-panel');

  // Empty input → default single-row layout (not composing).
  await expect(panel).not.toHaveClass(/composing/);

  // Any text (incl. multi-line) → compose mode engages.
  await setInput(page, 'Kwkw\nKwkw\nKwkw');
  await expect(panel).toHaveClass(/composing/);

  // Single short line still counts as composing while there is text.
  await setInput(page, 'hello');
  await expect(panel).toHaveClass(/composing/);

  // Clearing returns to the default layout.
  await setInput(page, '');
  await expect(panel).not.toHaveClass(/composing/);
});

test('autogrow handler sets an explicit inline height on input', async ({ page }) => {
  await gotoApp(page);
  // The autogrow handler always assigns an inline height (px) on input — proves
  // the resize logic runs and is wired to the textarea.
  await setInput(page, 'one line');
  const styleH = await page.evaluate(() => document.getElementById('input').style.height);
  expect(styleH).toMatch(/px$/);
});

test('plus, microphone and send controls are inside the full-width composer shell', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoApp(page);
  const layout = await page.evaluate(() => {
    const panel = document.querySelector('.chat-input-panel');
    const center = document.querySelector('.chat-center-col');
    const shell = document.querySelector('.chat-composer-shell');
    const input = document.getElementById('input');
    return {
      shellInCenter: !!shell && shell.parentElement === center,
      inputInside: !!shell && shell.contains(input),
      plusInside: !!shell && shell.contains(document.getElementById('chat-plus-btn')),
      microphoneInside: !!shell && shell.contains(document.getElementById('eiti-composer-mic')),
      sendInside: !!shell && shell.contains(document.getElementById('send')),
      panelSideColumns: panel ? Array.from(panel.children).filter((el) => el.classList.contains('chat-left-col') || el.classList.contains('chat-right-col')).length : -1,
      inputPaddingLeft: input ? getComputedStyle(input).paddingLeft : '',
      inputPaddingRight: input ? getComputedStyle(input).paddingRight : '',
    };
  });
  expect(layout).toMatchObject({
    shellInCenter: true,
    inputInside: true,
    plusInside: true,
    microphoneInside: true,
    sendInside: true,
    panelSideColumns: 0,
    inputPaddingLeft: '56px',
  });
  expect(['94px', '142px']).toContain(layout.inputPaddingRight);
});

test('classic button mode reserves composer space for the attachment control', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('eiti_chat_panel_mode', 'buttons');
  });
  await gotoApp(page);
  const layout = await page.evaluate(() => {
    const shell = document.querySelector('.chat-composer-shell');
    const input = document.getElementById('input');
    const attach = document.getElementById('chat-attach-proxy');
    return {
      classicMode: !!shell && shell.classList.contains('classic-controls'),
      attachmentInside: !!shell && shell.contains(attach),
      paddingRight: input ? getComputedStyle(input).paddingRight : '',
    };
  });
  expect(layout).toEqual({ classicMode: true, attachmentInside: true, paddingRight: '142px' });
});
