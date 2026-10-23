// v14.10.0: one compact row of message actions, single-line empty input, full EN/DE UI (no Cyrillic leftovers).
const { test, expect } = require('@playwright/test');

const CYR = /[А-Яа-яЁё]/;
// endonyms in the language picker and the «Аб» button glyph are intentionally Russian
const ALLOW = [/^(🇷🇺 )?Русский$/, /«Аб»/];

async function boot(page, loc) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((l) => {
    localStorage.setItem('eiti_onboarded', 'true'); localStorage.setItem('eiti_toured_v7', '1'); localStorage.setItem('eiti_install_hint_seen', '1');
    localStorage.setItem('eiti_ai_provider', 'deepseek'); localStorage.removeItem('deepseek_api_key'); localStorage.setItem('eiti_offline_mode', '0');
    localStorage.setItem('eiti_locale', l); localStorage.setItem('eiti_ai_reply_lang', 'auto');
  }, loc);
  await page.goto('/index.html');
  await page.waitForFunction(() => window.eitiChatReady === true, null, { timeout: 30000 });
  await page.addStyleTag({ content: '#eiti-pin-modal{display:none!important}' });
  await page.evaluate(() => document.querySelectorAll('#eiti-onboarding,#eiti-pin-modal,.toast').forEach((e) => e.remove()));
}
async function ask(page, q) {
  const msgs = page.locator('#messages .message.incoming');
  const n = await msgs.count();
  await page.locator('#input').fill(q);
  await page.locator('#send').click();
  await expect.poll(() => msgs.count(), { timeout: 45000 }).toBeGreaterThan(n);
  await expect.poll(() => msgs.last().locator('.eiti-typing-dots').count(), { timeout: 20000 }).toBe(0);
}

test('every message has exactly one action set, laid out as a row under the text', async ({ page }) => {
  await boot(page, 'ru');
  await ask(page, 'привет');
  await ask(page, 'расскажи сказку');
  await ask(page, 'дальше');
  await page.waitForTimeout(300); // let any deferred (old: 50 ms) post-render hooks run
  const info = await page.evaluate(() => [...document.querySelectorAll('#messages .message')].map((m) => {
    const sets = m.querySelectorAll('.message-controls, .msg-bottom-controls');
    const c = sets[0], body = m.querySelector('.message-body');
    const btns = c ? [...c.querySelectorAll('.msg-btn')] : [];
    const tops = btns.map((b) => Math.round(b.getBoundingClientRect().top));
    return {
      sets: sets.length, n: btns.length, sameRow: tops.every((t) => Math.abs(t - tops[0]) <= 2),
      // the row may sit beside the time/Trace line, but never over the message text
      below: c && body ? [...body.children].filter((el) => !el.matches('.message-time, .eiti-trace-btn, [class*="trace"]') && el.getClientRects().length)
        .every((el) => { const a = el.getBoundingClientRect(), b = c.getBoundingClientRect(); const ok = a.bottom <= b.top + 1 || a.right <= b.left || a.left >= b.right; return ok; }) : true,
      minSize: Math.min(...btns.map((b) => Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height))),
      bodyW: body ? body.getBoundingClientRect().width : 0, rowW: body ? body.parentElement.getBoundingClientRect().width : 0,
    };
  }));
  expect(info.length).toBeGreaterThanOrEqual(6);
  for (const m of info.filter((x) => x.sets)) {
    expect(m.sets).toBe(1);
    expect(m.n).toBeGreaterThanOrEqual(1);
    expect(m.sameRow).toBe(true);
    expect(m.below).toBe(true);
    expect(m.minSize).toBeGreaterThanOrEqual(32);
    expect(m.bodyW).toBeGreaterThanOrEqual(m.rowW - 1); // the actions no longer take a column of text width
  }
});

test('empty input is one line at 390px, grows per line up to ~6 lines, resets after send', async ({ page }) => {
  await boot(page, 'ru');
  const input = page.locator('#input');
  await expect(input).toHaveAttribute('placeholder', 'Сообщение…');
  const h0 = (await input.boundingBox()).height;
  await input.fill('x'); await input.dispatchEvent('input');
  const h1 = (await input.boundingBox()).height;
  expect(Math.abs(h0 - h1)).toBeLessThanOrEqual(3);
  expect(h0).toBeLessThanOrEqual(44); expect(h0).toBeGreaterThanOrEqual(40); // pill; was ~74 px (two-line placeholder)
  const geo = await page.evaluate(() => { const r = (id) => document.getElementById(id).getBoundingClientRect(); const i = r('input'), cs = getComputedStyle(document.getElementById('input'));
    return { i: { t: i.top, b: i.bottom, l: i.left, r: i.right, h: i.height }, mic: r('eiti-composer-mic'), plus: r('chat-plus-btn'), send: r('send'), fs: parseFloat(cs.fontSize), pt: parseFloat(cs.paddingTop), pb: parseFloat(cs.paddingBottom), rad: parseFloat(cs.borderTopLeftRadius) }; });
  expect(geo.fs).toBeGreaterThanOrEqual(16); // iOS: no zoom on focus
  expect(Math.abs(geo.pt - geo.pb)).toBeLessThanOrEqual(1); // placeholder vertically centred
  expect(geo.rad).toBeGreaterThanOrEqual(geo.i.h / 2 - 1); // pill
  for (const b of [geo.mic, geo.plus, geo.send]) { expect(b.width).toBeGreaterThanOrEqual(40); expect(b.height).toBeGreaterThanOrEqual(40); }
  expect(geo.mic.left).toBeGreaterThanOrEqual(geo.i.l); expect(geo.mic.right).toBeLessThanOrEqual(geo.i.r + 1); // mic inside the pill
  expect(geo.mic.top).toBeGreaterThanOrEqual(geo.i.t - 1); expect(geo.mic.bottom).toBeLessThanOrEqual(geo.i.b + 1);
  expect(Math.abs(geo.plus.height - geo.i.h)).toBeLessThanOrEqual(4); expect(Math.abs(geo.send.height - geo.i.h)).toBeLessThanOrEqual(4);
  await input.fill('1\n2\n3'); await input.dispatchEvent('input');
  const h3 = (await input.boundingBox()).height;
  expect(h3).toBeGreaterThan(h1 + 20);
  await input.fill('1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12'); await input.dispatchEvent('input');
  const hMax = (await input.boundingBox()).height;
  expect(hMax).toBeLessThan(h1 * 6 + 10);
  expect(await input.evaluate((el) => getComputedStyle(el).overflowY)).toBe('auto');
  await input.fill('два плюс два'); await page.locator('#send').click();
  await expect(input).toHaveValue('');
  await expect.poll(async () => Math.round((await input.boundingBox()).height)).toBeLessThanOrEqual(Math.round(h1) + 2);
});

for (const loc of ['en', 'de']) {
  test(`${loc.toUpperCase()} UI: no Cyrillic left on the main screens`, async ({ page }) => {
    test.setTimeout(120000);
    await boot(page, loc);
    await expect(page.locator('#input')).toHaveAttribute('placeholder', loc === 'en' ? 'Message…' : 'Nachricht…');
    const left = {};
    for (const v of ['chat', 'journal', 'history', 'player', 'files', 'notes', 'settings']) {
      await page.evaluate((v) => openView(v), v);
      await page.waitForTimeout(500);
      const found = await page.evaluate(() => {
        const C = /[А-Яа-яЁё]/, res = new Set();
        const skip = (el) => el.closest('#messages .message.outgoing .message-body, [data-i18n-skip], script, style, code, pre, .note-card-body, #noteEditorBody');
        const vis = (el) => { const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && el.getClientRects().length > 0; };
        const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let n; while ((n = w.nextNode())) { const t = n.nodeValue.trim(), el = n.parentElement; if (t && C.test(t) && el && !skip(el) && vis(el)) res.add(t); }
        document.querySelectorAll('[placeholder],[title],[aria-label]').forEach((el) => {
          if (skip(el) || !vis(el)) return;
          for (const a of ['placeholder', 'title', 'aria-label']) { const t = (el.getAttribute(a) || '').trim(); if (t && C.test(t)) res.add(a + ': ' + t); }
        });
        return [...res];
      });
      const bad = found.filter((t) => !ALLOW.some((re) => re.test(t)));
      if (bad.length) left[v] = bad;
    }
    expect(left).toEqual({});
  });
}
