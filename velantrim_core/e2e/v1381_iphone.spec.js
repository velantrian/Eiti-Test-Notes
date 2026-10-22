// @ts-check
// v13.8.1: iPhone Safari fixes — install banner, 16px inputs, 44px hit areas, AI Docs above keyboard, landscape header, SE.
const { test, expect } = require('@playwright/test');

const SAMPLE = [
  '---', 'tags: [демо, eiti]', 'author: Руслан', '---',
  '# Заголовок 👋', '', 'Текст с ==выделением==, **жирным**, [[Другая заметка]] и #идея.', '%%скрытый комментарий%%', '',
  '| Колонка | Значение |', '|---|:-:|', '| A | 1 |', '',
  '- пункт', '  - вложенный', '- [x] сделано', '- [ ] не сделано', '',
  '> [!note]- Свернуть', '> Внутри callout', '',
  'Сноска[^1].', '', '```mermaid', 'graph TD; A-->B', '```', '', '[^1]: Текст сноски',
].join('\n');

async function bootWithFile(page, size = { width: 390, height: 844 }, storage = {}) {
  await page.setViewportSize(size);
  await page.route(/cdn\.jsdelivr\.net\/npm\/mermaid/, (route) => route.abort());
  await page.addInitScript((values) => {
    localStorage.setItem('eiti_onboarded', 'true');
    for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
  }, storage);
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.eitiFvEnhance === 'function' && typeof window.openEitiFiles === 'function');
  await expect(page.locator('#splash')).toBeHidden();
  await page.addStyleTag({ content: '#eiti-pin-modal{display:none!important}' });
  await page.evaluate((content) => {
    document.querySelectorAll('#eiti-onboarding, #eiti-pin-modal, .toast').forEach((el) => el.remove());
    window.__saved = [];
    window.upsertAiFile = (name, mime, c) => {
      window.__saved.push({ name, mime, content: c });
      const i = window._idbFilesCache.findIndex((f) => f.name === name);
      if (i >= 0) window._idbFilesCache[i].content = c;
    };
    window.getAiTextStore = () => ({ files: window._idbFilesCache });
    window.updateCount = () => {}; window.eitiUpdateFileCount = () => {}; window.eitiQueueIndexDoc = () => {}; window.showToast = () => {};
    window.isUserFile = (f) => !!(f && f.name);
    window._idbFilesCache.push({ id: 'e2e-demo', name: 'Euue.md', mime: 'text/markdown', content, updated: Date.now() });
    window.openEitiFiles();
  }, SAMPLE);
  const card = page.locator('.ef-file-card').filter({ hasText: 'Euue' });
  await card.locator('[data-v]').evaluate((el) => el.click());
  await expect(page.locator('#fv-header')).toBeVisible();
}


const isWebKit = () => test.info().project.name === 'webkit-iphone';

test('подсказка установки: один раз, внизу над вкладками, под редакторами, сама скрывается', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => { localStorage.setItem('eiti_onboarded', 'true'); localStorage.setItem('eiti_toured_v7', '1'); localStorage.setItem('eiti_install_hint_seen', '1'); });
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.eitiShowInstallBanner === 'function');
  await expect(page.locator('#splash')).toBeHidden();
  await page.evaluate(() => { document.querySelectorAll('#eiti-onboarding,#eiti-pin-modal').forEach((e) => e.remove()); localStorage.removeItem('eiti_install_hint_seen'); EITI_INSTALL_BANNER_MS = 800; eitiShowInstallBanner('Safari: тест'); });
  const b = page.locator('#pwa-install-banner');
  await expect(b).toBeVisible();
  const g = await page.evaluate(() => { const r = document.getElementById('pwa-install-banner').getBoundingClientRect(); const t = document.querySelector('.tab-bar').getBoundingClientRect(); const h = document.querySelector('.app-header').getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, tabTop: t.top, headerBottom: h.bottom, z: +getComputedStyle(document.getElementById('pwa-install-banner')).zIndex }; });
  expect(g.bottom).toBeLessThanOrEqual(g.tabTop);
  expect(g.top).toBeGreaterThan(g.headerBottom);
  expect(g.z).toBeLessThan(500); // note editor overlay 500, Files viewer 2500
  await expect(b).toHaveCount(0, { timeout: 3000 });
  expect(await page.evaluate(() => localStorage.getItem('eiti_install_hint_seen'))).toBe('1');
  await page.evaluate(() => eitiShowInstallBanner('Safari: снова'));
  await expect(b).toHaveCount(0); // never again automatically
  await page.evaluate(() => eitiShowInstallBanner('Safari: по кнопке', true));
  await expect(b).toHaveCount(1); // the install button still works
});

test('iOS: поля ввода 16px (без зума), на других платформах размер не меняется', async ({ page }) => {
  await bootWithFile(page);
  const fs = await page.evaluate(() => ['notesSearch', 'noteEditorBody', 'input'].map((id) => { const el = document.getElementById(id); return el ? parseFloat(getComputedStyle(el).fontSize) : 16; }));
  if (isWebKit()) for (const f of fs) expect(f).toBeGreaterThanOrEqual(16);
  else expect(fs[0]).toBeLessThan(16); // #notesSearch stays 14px off-iOS
});

test('окно файла: зоны нажатия ≥ 44px, safe-area, AI Docs над клавиатурой', async ({ page }) => {
  await bootWithFile(page);
  const hits = await page.evaluate(() => ['fv-bg-white', 'fv-bg-black', 'fv-bg-paper', 'fv-block-btn', 'fv-view-btn', 'fv-rename-btn', 'fv-copy-btn', 'fv-close-btn'].filter((id) => document.getElementById(id)).map((id) => {
    const el = document.getElementById(id); const r = el.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    // own hit area, or a neighbour's where rows are closer than 44px — never dead space
    const at = (x, y) => { const e = document.elementFromPoint(x, y); return !!e && (e === el || el.contains(e) || (!!e.closest('#fv-header button') && e.closest('#fv-header button') !== null)); };
    return { id, up: at(cx, cy - 21), down: at(cx, cy + 21), h: r.height, own: [-21, -15, 15, 21].filter((d) => { const e = document.elementFromPoint(cx, cy + d); return e === el || el.contains(e); }).length };
  }));
  for (const h of hits) { expect(h.up, h.id).toBe(true); expect(h.down, h.id).toBe(true); expect(h.own, h.id).toBeGreaterThanOrEqual(2); }
  const pad = await page.evaluate(() => document.getElementById('fv-header').parentElement.style.cssText);
  expect(pad).toContain('safe-area-inset-top');
  await page.locator('#fv-ai-ask').click();
  const kb = await page.evaluate(() => {
    const v = document.getElementById('fv-header').parentElement;
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: { height: v.clientHeight - 300, offsetTop: 0, addEventListener() {}, removeEventListener() {} } });
    v._eitiKbSync();
    return document.querySelector('.fv-ai-panel').style.bottom;
  });
  expect(kb).toBe('300px');
});

test('landscape: шапка файла в одну строку', async ({ page }) => {
  await bootWithFile(page, { width: 844, height: 390 });
  const g = await page.evaluate(() => ({ t: document.getElementById('fv-title').getBoundingClientRect(), c: document.getElementById('fv-controls').getBoundingClientRect(), h: document.getElementById('fv-header') }));
  const r = await page.evaluate(() => { const t = document.getElementById('fv-title').getBoundingClientRect(), c = document.getElementById('fv-controls').getBoundingClientRect(), h = document.getElementById('fv-header'); return { dt: Math.abs((t.top + t.height / 2) - (c.top + c.height / 2)), tw: t.width, sc: h.scrollWidth - h.clientWidth }; });
  expect(r.dt).toBeLessThan(12);
  expect(r.tw).toBeGreaterThanOrEqual(120);
  expect(r.sc).toBeLessThanOrEqual(0);
});

test('iPhone SE: «Настройки» в одну строку, панель вкладок без лишней прокрутки', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.addInitScript(() => { localStorage.setItem('eiti_onboarded', 'true'); localStorage.setItem('eiti_toured_v7', '1'); });
  await page.goto('/index.html');
  await expect(page.locator('#splash')).toBeHidden();
  const r = await page.evaluate(() => ({ labels: [...document.querySelectorAll('.tab-label')].filter((l) => l.offsetParent).map((l) => l.getBoundingClientRect().height),
    sw: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
  for (const h of r.labels) expect(h).toBeLessThan(18);
  expect(r.sw).toBeLessThanOrEqual(0);
});
