// @ts-check
// v14.15.1: «Меньше иконки (small icons)» — компактные нижний таб-бар и верхние панели.
// По умолчанию вид как раньше (таб-бар 110 px, шапка 88 px); галочка в «Настройке табов» сжимает их,
// контент забирает место без наложений; применяется сразу и после перезагрузки (до первой отрисовки).
const { test, expect } = require('@playwright/test');
const path = require('path');

const SHOTS = process.env.EITI_SHOTS_DIR || '';
const CYR = /[а-яё]/i;
const VIEW = { width: 412, height: 915 };

async function boot(page, { small = false, storage = {} } = {}) {
  await page.setViewportSize(VIEW);
  await page.addInitScript(([s, values]) => {
    if (sessionStorage.getItem('__eiti_si_booted')) return; // перезагрузка — оставить то, что сохранило приложение
    sessionStorage.setItem('__eiti_si_booted', '1');
    localStorage.setItem('eiti_onboarded', 'true'); localStorage.setItem('eiti_toured_v7', '1'); localStorage.setItem('eiti_install_hint_seen', '1');
    if (s) localStorage.setItem('eiti_small_icons', '1');
    for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
  }, [small, storage]);
  await page.goto('/index.html');
  await page.waitForFunction(() => window.eitiChatReady === true, null, { timeout: 30000 });
  await clean(page);
}
async function clean(page) {
  await page.addStyleTag({ content: '#eiti-pin-modal,#pwa-install-banner{display:none!important}' });
  await page.evaluate(() => document.querySelectorAll('#eiti-onboarding,#eiti-pin-modal,.toast').forEach((e) => e.remove()));
}
const box = (page, sel) => page.locator(sel).first().evaluate((el) => {
  const r = el.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, h: r.height };
});
async function shot(page, name) {
  if (!SHOTS) return;
  await clean(page);
  await page.screenshot({ path: path.join(SHOTS, 'small-icons-' + name + '.png') });
}

async function measureAll(page, mode) {
  const m = {};
  m.header = await box(page, '.app-header');
  m.tabbar = await box(page, '.tab-bar');
  m.tab = await box(page, '.tab-item[data-view="chat"]');
  m.input = await box(page, '.chat-input-panel');
  m.messages = await box(page, '#messages');
  await shot(page, 'chat-' + mode);

  await page.evaluate(() => openView('notes'));
  await expect(page.locator('.notes-header')).toBeVisible();
  m.notesHeader = await box(page, '.notes-header');
  m.notesList = await box(page, '#notesList');
  await shot(page, 'notes-' + mode);

  await page.evaluate(() => notesOpenEditor(null));
  await expect(page.locator('.note-editor-topbar')).toBeVisible();
  m.editorTop = await box(page, '.note-editor-topbar');
  m.undo = await box(page, '#noteUndoBtn');
  m.tags = await box(page, '.note-tags-row');
  m.editorTab = await box(page, '.tab-bar');
  await shot(page, 'editor-' + mode);
  await page.evaluate(() => document.getElementById('noteEditorBack').click());

  await page.evaluate(() => openView('files'));
  await expect(page.locator('#view-files .files-grid')).toBeVisible();
  await shot(page, 'files-' + mode);

  await page.evaluate(() => openTabsMode());
  await expect(page.locator('#eiti-small-icons-toggle')).toBeVisible();
  m.subview = await box(page, '#view-tabs-mode .subview-header');
  await shot(page, 'settings-' + mode);
  await page.evaluate(() => openView('chat'));
  return m;
}

test('по умолчанию: вид как раньше (110 / 88 px), галочка снята', async ({ page }) => {
  await boot(page);
  expect(await page.evaluate(() => document.documentElement.classList.contains('eiti-small-icons'))).toBe(false);
  const m = await measureAll(page, 'default');
  expect(Math.round(m.tabbar.h)).toBe(110);
  expect(Math.round(m.header.h)).toBe(88);
  expect(Math.round(m.tabbar.bottom)).toBe(VIEW.height);
  expect(Math.abs(m.input.bottom - m.tabbar.top)).toBeLessThanOrEqual(1);
  expect(Math.abs(m.tags.bottom - m.editorTab.top)).toBeLessThanOrEqual(2);
  await page.evaluate(() => openTabsMode());
  await expect(page.locator('#eiti-small-icons-toggle')).not.toBeChecked();
  test.info().annotations.push({ type: 'heights', description: JSON.stringify(m) });
});

test('small icons: таб-бар и шапки ниже, таб ≥36px, без наложений и щелей', async ({ page }) => {
  await boot(page, { small: true });
  expect(await page.evaluate(() => document.documentElement.classList.contains('eiti-small-icons'))).toBe(true);
  const m = await measureAll(page, 'small');
  expect(Math.round(m.tabbar.h)).toBe(50);
  expect(Math.round(m.header.h)).toBe(44);
  expect(m.tab.h).toBeGreaterThanOrEqual(36);
  expect(m.tab.top).toBeGreaterThanOrEqual(m.tabbar.top - 0.5);
  expect(m.tab.bottom).toBeLessThanOrEqual(m.tabbar.bottom + 0.5);
  expect(Math.round(m.tabbar.bottom)).toBe(VIEW.height);
  // чат: сообщения → поле ввода → таб-бар встык
  expect(Math.abs(m.messages.top - m.header.bottom)).toBeLessThanOrEqual(1);
  expect(Math.abs(m.input.top - m.messages.bottom)).toBeLessThanOrEqual(1);
  expect(Math.abs(m.input.bottom - m.tabbar.top)).toBeLessThanOrEqual(1);
  expect(m.messages.h).toBeGreaterThan(661 + 90); // +104 px под переписку при 412x915
  // заметки: компактная шапка, строка тегов встык с таб-баром
  expect(m.notesHeader.h).toBeLessThan(149);
  expect(Math.abs(m.notesList.top - m.notesHeader.bottom)).toBeLessThanOrEqual(1);
  expect(m.editorTop.h).toBeLessThan(55);
  expect(m.undo.h).toBeGreaterThanOrEqual(32);
  expect(Math.abs(m.tags.bottom - m.editorTab.top)).toBeLessThanOrEqual(2);
  expect(m.subview.h).toBeLessThan(66);
  test.info().annotations.push({ type: 'heights', description: JSON.stringify(m) });
});

test('галочка: мгновенно, без перезагрузки; сохраняется после reload; снятие возвращает 110 px', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => openTabsMode());
  const cb = page.locator('#eiti-small-icons-toggle');
  await cb.check();
  await expect.poll(() => box(page, '.tab-bar').then((b) => Math.round(b.h))).toBe(50);
  expect(await page.evaluate(() => localStorage.getItem('eiti_small_icons'))).toBe('1');

  await page.reload();
  await page.waitForFunction(() => window.eitiChatReady === true, null, { timeout: 30000 });
  expect(await page.evaluate(() => document.documentElement.classList.contains('eiti-small-icons'))).toBe(true);
  expect(Math.round((await box(page, '.tab-bar')).h)).toBe(50);
  await clean(page);
  await page.evaluate(() => openTabsMode());
  await expect(cb).toBeChecked();
  await cb.uncheck();
  await expect.poll(() => box(page, '.tab-bar').then((b) => Math.round(b.h))).toBe(110);
  expect(await page.evaluate(() => localStorage.getItem('eiti_small_icons'))).toBe(null);
  await page.evaluate(() => openView('chat'));
  expect(Math.round((await box(page, '.app-header')).h)).toBe(88);
});

test('класс стоит до первой отрисовки (ранний скрипт в <head>)', async ({ page }) => {
  await page.setViewportSize(VIEW);
  await page.addInitScript(() => {
    localStorage.setItem('eiti_onboarded', 'true'); localStorage.setItem('eiti_small_icons', '1');
    document.addEventListener('readystatechange', () => {
      if (document.readyState === 'interactive') window.__siAtInteractive = document.documentElement.classList.contains('eiti-small-icons');
    });
  });
  await page.goto('/index.html');
  await page.waitForFunction(() => window.__siAtInteractive !== undefined);
  expect(await page.evaluate(() => window.__siAtInteractive)).toBe(true);
});

for (const [loc, label] of [['en', 'Small icons'], ['de', 'Kleine Symbole']]) {
  test(`светлая тема + ${loc.toUpperCase()}: подпись «${label}» без кириллицы, размеры те же`, async ({ page }) => {
    await boot(page, { small: true, storage: { eiti_locale: loc, theme: 'paper-light' } });
    expect(await page.evaluate(() => document.body.classList.contains('theme-paper-light'))).toBe(true);
    expect(Math.round((await box(page, '.tab-bar')).h)).toBe(50);
    expect(Math.round((await box(page, '.app-header')).h)).toBe(44);
    await page.evaluate(() => openTabsMode());
    const row = page.locator('label.eiti-si-row');
    await expect(row).toContainText(label);
    expect(await row.innerText()).not.toMatch(CYR);
    expect(await page.locator('#view-tabs-mode .subview-title').innerText()).not.toMatch(CYR);
    if (loc === 'en') await shot(page, 'settings-small-en-light');
  });
}

// Ревью #61 [P1]: на iOS кнопки шапки центрируются в безопасной части (под вырезом), а не во всей шапке 44px+inset.
// env() в Chromium = 0 → подменяем --eiti-si-safe-top/bottom на <html> (единственное место, где small icons читает env()).
for (const inset of [47, 59]) {
  test(`iOS + small icons, safe-area ${inset}px: кнопки шапки не заходят в вырез`, async ({ page }) => {
    await boot(page, { small: true });
    await page.evaluate((i) => {
      const d = document.documentElement; d.classList.add('is-ios');
      d.style.setProperty('--eiti-si-safe-top', i + 'px'); d.style.setProperty('--eiti-si-safe-bottom', '34px');
      document.getElementById('btn-pwa-install').style.display = 'flex';
    }, inset);
    const header = await box(page, '.app-header');
    const btn = await box(page, '#btn-pwa-install');
    const actions = await box(page, '.app-header .header-actions');
    expect(Math.round(header.h)).toBe(44 + inset);
    expect(Math.round(btn.h)).toBe(32); // графика компактная
    expect(actions.top).toBeGreaterThanOrEqual(inset);
    expect(btn.top).toBeGreaterThanOrEqual(inset);
    expect(btn.bottom).toBeLessThanOrEqual(header.bottom);
    expect(Math.abs((btn.top + btn.bottom) / 2 - (inset + 22))).toBeLessThanOrEqual(1); // по центру безопасной части
    expect(Math.round((await box(page, '.tab-bar')).h)).toBe(50 + 34);
    await shot(page, 'ios-inset-' + inset);
  });
}

// Ревью #61 [P2]: компактная графика, но зона нажатия ≥44px по высоте (и по ширине у одиночных кнопок).
test('small icons: зоны нажатия ≥44px, кнопки и панели визуально не выросли', async ({ page }) => {
  await boot(page, { small: true });
  const hits = (sel) => page.evaluate((s) => {
    const el = document.querySelector(s); const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const at = (x, y) => { const e = document.elementFromPoint(x, y); return !!e && (e === el || el.contains(e)); };
    return { w: r.width, h: r.height, up: at(cx, cy - 21), down: at(cx, cy + 21), left: at(cx - 21, cy), right: at(cx + 21, cy) };
  }, sel);
  await page.evaluate(() => { document.getElementById('btn-pwa-install').style.display = 'flex'; });
  let h = await hits('#btn-pwa-install');
  expect([Math.round(h.w), Math.round(h.h)]).toEqual([32, 32]);
  expect(h).toMatchObject({ up: true, down: true, left: true, right: true });
  expect(Math.round((await box(page, '.app-header')).h)).toBe(44);

  await page.evaluate(() => openView('notes'));
  await expect(page.locator('.notes-header')).toBeVisible();
  for (const sel of ['#notesBackBtn', '.notes-new-btn']) {
    h = await hits(sel);
    expect(Math.round(h.h)).toBe(32);
    // снизу на 5px ниже идёт ряд колонок — там приоритет у соседней кнопки (зона не перекрывает чужие контролы)
    expect(h, sel).toMatchObject({ up: true, left: true, right: true });
  }
  // плотный ряд колонок: по высоте 44, по ширине — до середины зазора, соседняя кнопка остаётся своей
  const col = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('#view-notes .notes-col-btn')].filter((b) => b.offsetParent);
    const a = btns[0], b = btns[1], ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const cy = ra.top + ra.height / 2, own = (el, x, y) => { const e = document.elementFromPoint(x, y); return e === el || el.contains(e); };
    return { h: ra.height, up: own(a, ra.left + ra.width / 2, cy - 21), down: own(a, ra.left + ra.width / 2, cy + 21),
      neighbourEdge: own(b, rb.left + 1, cy), gapMidLeft: own(a, (ra.right + rb.left) / 2 - 1.5, cy), gapMidRight: own(b, (ra.right + rb.left) / 2 + 1.5, cy), zoneH: getComputedStyle(a, '::after').height };
  });
  expect(Math.round(col.h)).toBe(28);
  expect(col).toMatchObject({ up: true, down: true, neighbourEdge: true, gapMidLeft: true, gapMidRight: true });
  expect(col.zoneH).toBe('44px');

  await page.evaluate(() => openView('settings'));
  await page.evaluate(() => openTabsMode());
  h = await hits('#view-tabs-mode .subview-back');
  expect(Math.round(h.h)).toBe(32);
  expect(h).toMatchObject({ up: true, down: true, left: true, right: true });
});
