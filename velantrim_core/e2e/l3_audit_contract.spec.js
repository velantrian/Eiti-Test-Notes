// @ts-check
// L3 Memory Contract — AUDIT ONLY (docs/l3_memory_inventory.md).
// These tests pin the CURRENT behaviour of the L3 / personal-memory paths so a future
// MemoryRecord v1 migration can be checked against it. They do not change runtime code.
// Assertions marked "KNOWN GAP" describe today's behaviour, not the desired one.
const { test, expect } = require('@playwright/test');

async function boot(page, seed) {
  await page.addInitScript((seed) => {
    // instrument localStorage reads that happen before `load` (synchronous startup reads)
    const reads = {}; window.__lsStartupReads = reads; let loaded = false;
    window.addEventListener('load', () => { loaded = true; });
    const orig = Storage.prototype.getItem;
    Storage.prototype.getItem = function (k) { const v = orig.call(this, k); if (!loaded && this === window.localStorage) reads[k] = (reads[k] || 0) + 1; return v; };
    if (!sessionStorage.getItem('__seeded')) {
      sessionStorage.setItem('__seeded', '1');
      localStorage.setItem('eiti_onboarded', 'true');
      localStorage.setItem('eiti_toured_v7', '1');
      localStorage.setItem('eiti_install_hint_seen', '1');
      localStorage.setItem('eiti_ai_provider', 'deepseek');
      Object.keys(seed || {}).forEach((k) => localStorage.setItem(k, seed[k]));
    }
  }, seed || {});
  await page.goto('/index.html');
  await page.waitForFunction(() => window.eitiChatReady === true && !!window.eitiDb && typeof window.eitiL3AutoExtract === 'function', null, { timeout: 30000 });
  await page.evaluate(() => document.querySelectorAll('#eiti-onboarding,#eiti-pin-modal').forEach((e) => e.remove()));
}

function lsReport(page) {
  return page.evaluate(() => {
    const keys = []; let total = 0;
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); const v = localStorage.getItem(k) || ''; const b = 2 * (k.length + v.length); total += b; keys.push({ k, bytes: b }); }
    keys.sort((a, b) => b.bytes - a.bytes);
    return { total, count: keys.length, top: keys.slice(0, 15), startupReads: Object.keys(window.__lsStartupReads).sort() };
  });
}

const l3 = (page) => page.evaluate(() => window.eitiL3GetAll());
const settle = (page) => page.waitForTimeout(300);

test('localStorage at startup: clean profile — documented size and synchronous reads', async ({ page }, info) => {
  await boot(page);
  const r = await lsReport(page);
  await info.attach('ls_clean.json', { body: JSON.stringify(r, null, 2), contentType: 'application/json' });
  console.log('[L3-AUDIT] ls clean', JSON.stringify({ total: r.total, count: r.count, reads: r.startupReads.length, top: r.top.slice(0, 5) }));
  // current: a fresh profile stays far below the proposed 100 KB budget
  expect(r.total).toBeLessThan(100 * 1024);
  console.log('[L3-AUDIT] startup reads', JSON.stringify(r.startupReads));
  // current: the L3 compat keys are NOT read before `load` (read lazily on first prompt / settings)
  expect(r.startupReads).not.toContain('eiti_user_profile_v1');
  expect(r.startupReads).not.toContain('eiti_learned_v1');
  expect(r.startupReads.length).toBeGreaterThan(10);
});

test('localStorage at startup: heavy personal memory (200 learned facts + profile) — KNOWN GAP: lives in localStorage', async ({ page }, info) => {
  const facts = Array.from({ length: 200 }, (_, i) => ({ fact: 'Факт о пользователе №' + i + ' — ' + 'x'.repeat(180), ts: 1700000000000 + i, salience: 1, id: 'fact_' + i }));
  const arch = Array.from({ length: 500 }, (_, i) => ({ fact: 'Архив ' + i + ' ' + 'y'.repeat(180), ts: i, salience: 1, id: 'a_' + i }));
  await boot(page, { eiti_learned_v1: JSON.stringify(facts), eiti_learned_archive_v1: JSON.stringify(arch), eiti_user_profile_v1: JSON.stringify({ name: 'Аня', city: 'Копенгаген', about: 'z'.repeat(4000) }) });
  const r = await lsReport(page);
  await info.attach('ls_heavy.json', { body: JSON.stringify(r, null, 2), contentType: 'application/json' });
  console.log('[L3-AUDIT] ls heavy', JSON.stringify({ total: r.total, top: r.top.slice(0, 5) }));
  const big = r.top.filter((x) => x.bytes > 50 * 1024).map((x) => x.k);
  // KNOWN GAP: learned facts + their archive are stored (and parsed) from localStorage, > 50 KB each
  expect(big).toEqual(expect.arrayContaining(['eiti_learned_v1', 'eiti_learned_archive_v1']));
  expect(r.total).toBeGreaterThan(100 * 1024);
});

test('L3 auto-extract: «не запоминай» / variants — nothing is stored', async ({ page }) => {
  await boot(page);
  for (const t of ['Не запоминай это, пожалуйста: меня зовут Аня', 'не сохраняй: я живу в Копенгагене', "Don't remember this: my name is Anna"]) {
    await page.evaluate((t) => window.eitiL3AutoExtract(t), t);
  }
  await settle(page);
  expect(await l3(page)).toEqual([]);
});

test('L3 auto-extract: «я ещё не решил» — tentative goal is not stored as a fact', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.eitiL3AutoExtract('Я ещё не решил, но моя цель переехать в Берлин'));
  await page.evaluate(() => window.eitiL3AutoExtract("I haven't decided yet, my goal is to move to Berlin"));
  await settle(page);
  expect((await l3(page)).find((f) => f.id === 'goal')).toBeFalsy();
  // a normal statement right after is still remembered
  await page.evaluate(() => window.eitiL3AutoExtract('меня зовут Аня'));
  await settle(page);
  expect((await l3(page)).find((f) => f.id === 'name')?.value).toBe('Аня');
});

test('L3 correction: a new value overwrites the old one by category — no correction history', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.eitiL3AutoExtract('меня зовут Аня'));
  await settle(page);
  await page.evaluate(() => window.eitiL3AutoExtract('я ошибся, меня зовут Оля'));
  await settle(page);
  const names = (await l3(page)).filter((f) => f.id === 'name');
  expect(names).toHaveLength(1);
  expect(names[0].value).toBe('Оля');
  expect(JSON.stringify(names[0])).not.toContain('Аня'); // old value is gone (only `source` keeps the new sentence)
});

test('archive export is byte-identical when nothing changed (except the `exported` timestamp)', async ({ page }) => {
  await boot(page, { eiti_learned_v1: JSON.stringify([{ fact: 'Любит чай', ts: 1, salience: 1, id: 'fact_1' }]), eiti_user_profile_v1: JSON.stringify({ name: 'Аня' }) });
  await page.evaluate(() => window.eitiL3AutoExtract('меня зовут Аня'));
  await settle(page);
  // KB defaults/packs are written to IDB `kb` asynchronously after boot — wait until the store is quiescent
  await page.waitForFunction(() => new Promise((res) => {
    const c = () => new Promise((r) => { const q = window.eitiDb.transaction('kb').objectStore('kb').count(); q.onsuccess = () => r(q.result); });
    c().then((a) => setTimeout(() => c().then((b) => res(a === b && a > 0)), 2500));
  }), null, { timeout: 60000, polling: 3000 });
  const dumps = await page.evaluate(async () => {
    const out = []; const orig = URL.createObjectURL;
    URL.createObjectURL = (b) => { out.push(b); return 'blob:x'; };
    HTMLAnchorElement.prototype.click = function () {};
    eitiArchiveExport(); await new Promise((r) => setTimeout(r, 1500));
    eitiArchiveExport(); await new Promise((r) => setTimeout(r, 1500));
    URL.createObjectURL = orig;
    const t = await Promise.all(out.map((b) => b.text()));
    return t.filter((x) => x.indexOf('eiti.archive') !== -1);
  });
  expect(dumps).toHaveLength(2);
  { const a = JSON.parse(dumps[0]), b = JSON.parse(dumps[1]); console.log('[L3-AUDIT] export diff keys', JSON.stringify(Object.keys(a).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k])).map((k)=>[k, JSON.stringify(a[k]).length, JSON.stringify(b[k]).length]))); }
  const norm = (t) => t.replace(/"exported": "[^"]*"/, '"exported": "<ts>"');
  expect(norm(dumps[0])).toBe(norm(dumps[1]));
  const d = JSON.parse(dumps[0]);
  expect(d.version).toBe('eiti.archive.v1');
  expect(d.profile).toBe(JSON.stringify({ name: 'Аня' }));
  expect(JSON.parse(d.learned)[0].fact).toBe('Любит чай');
  expect(d.idbL3.find((f) => f.id === 'name').value).toBe('Аня');
  expect(Array.isArray(d.idbKB)).toBe(true);
  // KNOWN GAP: `kb` reads the legacy localStorage key eiti_kb_v3 (KB lives in IndexedDB `kb` → exported separately as idbKB)
  expect(d.kb).toBe('[]');
});
