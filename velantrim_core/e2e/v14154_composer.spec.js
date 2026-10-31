// v14.15.4: ChatGPT-like composer card (field full width, compact row below), undo/redo of the input,
// «♻ в поле» switch in the «+» menu, and the reply scroll anchor (a new assistant reply is shown from its start).
const { test, expect } = require('@playwright/test');

async function boot(page, { w = 390, h = 844, loc = 'ru', offline = '1', stream = false } = {}) {
  await page.setViewportSize({ width: w, height: h });
  await page.addInitScript(({ l, off }) => {
    localStorage.setItem('eiti_onboarded', 'true'); localStorage.setItem('eiti_toured_v7', '1'); localStorage.setItem('eiti_install_hint_seen', '1');
    localStorage.setItem('eiti_offline_mode', off); localStorage.setItem('eiti_locale', l); localStorage.setItem('eiti_ai_reply_lang', 'auto');
  }, { l: loc, off: offline });
  if (stream) {
    // slow SSE stream through the app's real streaming path (chunks every 120 ms)
    await page.addInitScript(() => {
      const orig = window.fetch;
      window.__streamChunks = 40;
      window.fetch = function (url, opts) {
        if (String(url).indexOf('api.deepseek.com') === -1) return orig.apply(this, arguments);
        const enc = new TextEncoder(); let i = 0;
        const body = new ReadableStream({ pull(c) {
          return new Promise((r) => setTimeout(r, 120)).then(() => {
            if (i >= window.__streamChunks) { c.enqueue(enc.encode('data: [DONE]\n\n')); c.close(); return; }
            const t = (i === 0 ? 'НАЧАЛО ОТВЕТА. ' : '') + 'Строка ' + i + ' длинного потокового ответа, чтобы он был выше экрана.\n\n'; i++;
            c.enqueue(enc.encode('data: ' + JSON.stringify({ choices: [{ delta: { content: t } }] }) + '\n\n'));
          });
        } });
        return Promise.resolve(new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }));
      };
    });
  }
  await page.goto('/index.html');
  await page.waitForFunction(() => window.eitiChatReady === true, null, { timeout: 30000 });
  await page.addStyleTag({ content: '#eiti-pin-modal{display:none!important}' });
  await page.evaluate(() => document.querySelectorAll('#eiti-onboarding,#eiti-pin-modal,.toast').forEach((e) => e.remove()));
}
const rect = (page, id) => page.evaluate((i) => { const e = document.getElementById(i); const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height, vis: getComputedStyle(e).display !== 'none' && r.width > 0 }; }, id);
async function hits(page, id) { // the element itself receives a tap at its centre
  return page.evaluate((i) => { const e = document.getElementById(i), r = e.getBoundingClientRect(); const x = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!x && (x === e || e.contains(x)); }, id);
}
const ROW = ['chat-plus-btn', 'eiti-composer-undo', 'eiti-composer-redo', 'clearInputBtn', 'eiti-composer-mic', 'send'];

for (const w of [360, 390, 430]) {
  test(`layout ${w}px: field full width on top, + / undo / redo / ♻ / mic / send in one row below, inside the card`, async ({ page }) => {
    await boot(page, { w });
    await page.evaluate(() => window.eitiInlineClearSet(true));
    const card = await rect(page, 'eiti-composer-card'), inp = await rect(page, 'input');
    expect(inp.w).toBeGreaterThanOrEqual(card.w - 12);
    const rs = []; for (const id of ROW) rs.push(await rect(page, id));
    rs.forEach((r, k) => {
      expect(r.vis, ROW[k]).toBe(true);
      expect(r.t, ROW[k]).toBeGreaterThanOrEqual(inp.b - 1);         // below the field
      expect(r.b, ROW[k]).toBeLessThanOrEqual(card.b + 1);          // inside the card
      expect(r.l, ROW[k]).toBeGreaterThanOrEqual(card.l - 1); expect(r.r, ROW[k]).toBeLessThanOrEqual(card.r + 1);
      expect(r.h, ROW[k]).toBeGreaterThanOrEqual(40);
      expect(r.w, ROW[k]).toBeGreaterThanOrEqual(['eiti-composer-undo', 'eiti-composer-redo', 'clearInputBtn'].includes(ROW[k]) ? 32 : 40);
      if (k) expect(r.l, ROW[k] + ' after ' + ROW[k - 1]).toBeGreaterThanOrEqual(rs[k - 1].r - 0.5); // order, no overlap
    });
    expect(Math.abs(rs[0].t + rs[0].h / 2 - (rs[5].t + rs[5].h / 2))).toBeLessThanOrEqual(2); // one row
    for (const id of ROW) expect(await hits(page, id), id).toBe(true);
  });
}

test('♻ switch sits in the «Очистить ввод» item of the «+» menu: default off, on shows ♻ in the row, persists after reload', async ({ page }) => {
  await boot(page, { w: 360 });
  expect((await rect(page, 'clearInputBtn')).vis).toBe(false); // default OFF — input looks as usual
  await page.locator('#chat-plus-btn').click();
  const item = page.locator('#chat-plus-popup .chat-plus-item', { has: page.locator('#eiti-inline-clear-switch') });
  await expect(item).toHaveCount(1);
  await expect(item.locator('.cpi-label')).toHaveText('Очистить ввод');
  const sw = page.locator('#eiti-inline-clear-switch');
  await expect(sw).toHaveAttribute('role', 'switch');
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await expect(sw).toHaveAttribute('aria-label', 'Кнопка очистки в поле');
  const sb = await sw.boundingBox(); expect(sb.height).toBeGreaterThanOrEqual(40);
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#chat-plus-popup')).toBeVisible(); // the menu stays open, the item action did not fire
  expect(await page.evaluate(() => localStorage.getItem('eiti_inline_clear'))).toBe('1');
  await page.keyboard.press('Escape'); await page.mouse.click(200, 300);
  expect((await rect(page, 'clearInputBtn')).vis).toBe(true);
  // tap ♻ in the row clears the whole field (and it can be undone)
  await page.locator('#input').fill('стереть всё это');
  await page.locator('#clearInputBtn').click();
  await expect(page.locator('#input')).toHaveValue('', { timeout: 3000 });
  await page.locator('#eiti-composer-undo').click();
  await expect(page.locator('#input')).toHaveValue('стереть всё это');
  // persists after reload, applied before first paint (class set by the <head> script)
  await page.reload();
  await page.waitForFunction(() => window.eitiChatReady === true, null, { timeout: 30000 });
  expect(await page.evaluate(() => document.documentElement.classList.contains('eiti-inline-clear-on'))).toBe(true);
  expect((await rect(page, 'clearInputBtn')).vis).toBe(true);
  // OFF again → hidden; the menu item «Очистить ввод» still clears as before
  await page.evaluate(() => document.querySelectorAll('#eiti-onboarding,#eiti-pin-modal,.toast').forEach((e) => e.remove()));
  await page.locator('#chat-plus-btn').click();
  await page.locator('#eiti-inline-clear-switch').click();
  await expect(page.locator('#eiti-inline-clear-switch')).toHaveAttribute('aria-checked', 'false');
  expect((await rect(page, 'clearInputBtn')).vis).toBe(false);
  await page.locator('#input').fill('текст');
  await page.locator('#chat-plus-popup .chat-plus-item', { has: page.locator('#eiti-inline-clear-switch') }).locator('.cpi-label').click();
  await expect(page.locator('#input')).toHaveValue('');
});

test('undo/redo: disabled when empty, word steps, programmatic changes (dictation/paste), reset after send', async ({ page }) => {
  await boot(page);
  const u = page.locator('#eiti-composer-undo'), r = page.locator('#eiti-composer-redo'), inp = page.locator('#input');
  await expect(u).toBeDisabled(); await expect(r).toBeDisabled();
  await inp.click();
  await page.keyboard.type('один два три', { delay: 20 });
  await expect(u).toBeEnabled();
  await u.click(); await expect(inp).toHaveValue('один два');
  await u.click(); await expect(inp).toHaveValue('один');
  await expect(r).toBeEnabled();
  await r.click(); await expect(inp).toHaveValue('один два');
  await r.click(); await expect(inp).toHaveValue('один два три'); await expect(r).toBeDisabled();
  // programmatic change (as dictation/paste-chip/clear do) is one undo step
  await page.evaluate(() => { const el = document.getElementById('input'); el.value = 'надиктовано'; el.value = 'надиктовано голосом'; });
  await expect(u).toBeEnabled(); await u.click(); await expect(inp).toHaveValue('один два три');
  await r.click(); await expect(inp).toHaveValue('надиктовано голосом');
  // keyboard shortcuts
  await inp.focus(); await page.keyboard.press('Control+z'); await expect(inp).toHaveValue('один два три');
  await page.keyboard.press('Control+Shift+z'); await expect(inp).toHaveValue('надиктовано голосом');
  // focus stays in the field after tapping undo (mobile keyboard does not close)
  await u.click(); expect(await page.evaluate(() => document.activeElement && document.activeElement.id)).toBe('input');
  // after send history restarts
  await inp.fill('привет'); await page.locator('#send').click();
  await expect(inp).toHaveValue('');
  await expect(u).toBeDisabled(); await expect(r).toBeDisabled();
  expect(await page.evaluate(() => window.eitiComposerHistory().size)).toBe(1);
});

for (const [loc, un, re] of [['en', 'Undo', 'Redo'], ['de', 'Rückgängig', 'Wiederholen']]) {
  test(`${loc.toUpperCase()}: undo/redo/switch labels translated`, async ({ page }) => {
    await boot(page, { loc });
    await expect(page.locator('#eiti-composer-undo')).toHaveAttribute('aria-label', un);
    await expect(page.locator('#eiti-composer-redo')).toHaveAttribute('aria-label', re);
    await page.locator('#chat-plus-btn').click();
    await expect(page.locator('#eiti-inline-clear-switch')).toHaveAttribute('aria-label', loc === 'en' ? 'Clear button in the field' : 'Löschtaste im Eingabefeld');
  });
}

test('classic «buttons» panel mode: classic buttons sit in the bottom row of the card', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { localStorage.setItem('eiti_chat_panel_mode', 'buttons'); window.eitiApplyChatPanelMode && window.eitiApplyChatPanelMode(); });
  const inp = await rect(page, 'input'), card = await rect(page, 'eiti-composer-card'), cb = await rect(page, 'chat-classic-btns'), send = await rect(page, 'send');
  expect(cb.vis).toBe(true); expect(cb.t).toBeGreaterThanOrEqual(inp.b - 1); expect(cb.b).toBeLessThanOrEqual(card.b + 1);
  expect(send.t).toBeGreaterThanOrEqual(inp.b - 1);
  expect(await hits(page, 'send')).toBe(true);
});

// ── scroll anchor ──
async function sendAndWait(page, q) {
  const msgs = page.locator('#messages .message.incoming');
  const n = await msgs.count();
  await page.locator('#input').fill(q); await page.locator('#send').click();
  await expect.poll(() => msgs.count(), { timeout: 45000 }).toBeGreaterThan(n);
  await expect.poll(() => msgs.last().locator('.eiti-typing-dots').count(), { timeout: 20000 }).toBe(0);
  await page.waitForTimeout(700);
}
const geo = (page) => page.evaluate(() => {
  const ms = document.getElementById('messages'), all = [...ms.querySelectorAll('.message')];
  let k = all.length - 1; while (k >= 0 && !all[k].classList.contains('outgoing')) k--;
  const first = all[k + 1], mr = ms.getBoundingClientRect();
  return { top: first ? first.getBoundingClientRect().top - mr.top : null, h: first ? first.getBoundingClientRect().height : 0,
    st: ms.scrollTop, max: ms.scrollHeight - ms.clientHeight, ch: ms.clientHeight, txt: first ? first.textContent.slice(0, 60) : '' };
});

test('offline replies: a long reply is shown from its start, a short one fully; own messages still scroll down', async ({ page }) => {
  test.setTimeout(120000);
  await boot(page, { h: 560 }); // keyboard-height viewport → the tale is taller than the chat area
  for (const q of ['привет', 'как дела', 'что такое луна']) await sendAndWait(page, q);
  await sendAndWait(page, 'расскажи сказку');
  let g = await geo(page);
  expect(g.h).toBeGreaterThan(g.ch); // long
  expect(g.top).toBeGreaterThanOrEqual(-2); expect(g.top).toBeLessThanOrEqual(40); // top of the reply at the top of the chat area
  expect(g.st).toBeLessThan(g.max - 20); // not jumped to the end
  // own message: scrolls to the bottom as before
  await page.locator('#input').fill('спасибо'); await page.locator('#send').click();
  await expect.poll(() => page.evaluate(() => { const ms = document.getElementById('messages'); const o = [...ms.querySelectorAll('.message.outgoing')].pop(); return o && o.textContent.includes('спасибо') && o.getBoundingClientRect().bottom <= ms.getBoundingClientRect().bottom + 2; })).toBe(true);
  await expect.poll(async () => (await geo(page)).top !== null, { timeout: 30000 }).toBe(true);
  await page.waitForTimeout(1500);
  g = await geo(page);
  if (g.h < g.ch - 30) { // short reply → fully visible
    expect(g.top).toBeGreaterThanOrEqual(-2); expect(g.top + g.h).toBeLessThanOrEqual(g.ch + 2);
  }
});

test('streaming reply: start stays in view, user scrolling up is not taken over, bottom releases the anchor', async ({ page }) => {
  test.setTimeout(120000);
  await boot(page, { offline: '0', stream: true });
  await page.evaluate(() => {
    localStorage.setItem('eiti_ai_provider', 'deepseek'); localStorage.setItem('deepseek_api_key', window._obfKey('sk-test-key-123'));
    localStorage.removeItem('eiti_ds_off'); localStorage.setItem('eiti_strict_memory_mode', '0');
  });
  await page.locator('#input').fill('расскажи подробно'); await page.locator('#send').click();
  await expect.poll(() => page.evaluate(() => document.getElementById('messages').textContent.includes('Строка 12')), { timeout: 30000 }).toBe(true);
  let g = await geo(page);
  expect(g.txt + '').toContain('НАЧАЛО');
  expect(g.top).toBeGreaterThanOrEqual(-2);
  // either pinned near the top, or the list simply can't scroll further yet (reply still shorter than the view)
  expect(g.top <= 40 || g.st >= g.max - 2).toBe(true);
  // user scrolls up a bit → stream keeps going, position is not stolen
  await page.mouse.move(195, 300); await page.mouse.wheel(0, -60); await page.waitForTimeout(300);
  const st0 = await page.evaluate(() => document.getElementById('messages').scrollTop);
  await expect.poll(() => page.evaluate(() => document.getElementById('messages').textContent.includes('Строка 24')), { timeout: 30000 }).toBe(true);
  expect(Math.abs((await page.evaluate(() => document.getElementById('messages').scrollTop)) - st0)).toBeLessThanOrEqual(4);
  // user scrolls to the bottom → follows the end again (as before)
  await page.mouse.wheel(0, 100000); await page.waitForTimeout(300);
  expect((await page.evaluate(() => window.eitiScrollAnchorState())).anchored).toBe(false);
  await expect.poll(() => page.evaluate(() => document.getElementById('messages').textContent.includes('Строка 39')), { timeout: 30000 }).toBe(true);
  await page.waitForTimeout(800);
  const end = await page.evaluate(() => { const ms = document.getElementById('messages'); return ms.scrollHeight - ms.clientHeight - ms.scrollTop; });
  expect(end).toBeLessThanOrEqual(40);
});
