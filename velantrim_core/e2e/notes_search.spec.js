// @ts-check
const { test, expect } = require('@playwright/test');

// Functional E2E for two core EITI features that the pure-logic unit tests
// cannot reach: notes persistence (an IndexedDB round-trip that survives a
// page reload) and the search entry point. These drive the app's own global
// functions in-page rather than relying on brittle deep-UI selectors.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('eiti_onboarded', 'true');
  });
});

// Wait until the app's IndexedDB handle is ready (notes persistence needs it).
async function waitForDb(page) {
  await page.waitForFunction(() => typeof eitiDb !== 'undefined' && !!eitiDb, null,
    { timeout: 15_000 });
}

test('a note saved via notesSave persists across a reload (IndexedDB round-trip)', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForLoadState('networkidle');
  await waitForDb(page);

  const marker = 'E2E_note_' + Date.now();

  // Persist through the app's real save path, then confirm the IDB write
  // completed by reading the 'notes' object store back directly.
  const saved = await page.evaluate(async (mk) => {
    if (typeof notesSave !== 'function' || typeof notesLoad !== 'function') {
      return { ok: false, reason: 'notes API missing' };
    }
    const notes = notesLoad();
    notes.push({ id: mk, title: mk, body: 'body for ' + mk, created: Date.now(), updated: Date.now() });
    notesSave(notes);

    const fromStore = await new Promise((resolve, reject) => {
      const tx = eitiDb.transaction(['notes'], 'readonly');
      const req = tx.objectStore('notes').getAll();
      req.onsuccess = () => resolve(req.result.map((n) => n.id));
      req.onerror = () => reject(req.error);
    });
    return { ok: true, ids: fromStore };
  }, marker);

  expect(saved.ok, saved.reason).toBe(true);
  expect(saved.ids).toContain(marker);

  // After a reload the cache is rehydrated from IDB; the note must still be there.
  await page.reload();
  await page.waitForLoadState('networkidle');
  await waitForDb(page);

  const reloaded = await page.evaluate((mk) =>
    new Promise((resolve, reject) => {
      const tx = eitiDb.transaction(['notes'], 'readonly');
      const req = tx.objectStore('notes').getAll();
      req.onsuccess = () => resolve(req.result.map((n) => n.id).includes(mk));
      req.onerror = () => reject(req.error);
    }), marker);

  expect(reloaded).toBe(true);
});

test('search entry point runs without throwing', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForLoadState('networkidle');
  await waitForDb(page);

  // eitiSearch renders chat-search results into the DOM; here we only assert it
  // executes cleanly for both a hit-less query and an empty query (reset path).
  const result = await page.evaluate(async () => {
    if (typeof eitiSearch !== 'function') return { ok: false, reason: 'eitiSearch missing' };
    let threw = null;
    try {
      eitiSearch('zynqwphys_no_such_term');
      eitiSearch('');
      await new Promise((r) => setTimeout(r, 200));
    } catch (e) {
      threw = String(e);
    }
    return { ok: threw === null, reason: threw };
  });

  expect(result.ok, result.reason).toBe(true);
});

// v13.7.20: 💾 убран из шапки — заметка должна сохраняться сама (автосохранение).
test('note editor autosaves: no 💾 in header, text survives ← back + reload, empty note not created', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForLoadState('networkidle');
  await waitForDb(page);

  const marker = 'E2E_autosave_' + Date.now();
  const before = await page.evaluate(() => notesLoad().length);

  // Empty new note opened and closed → nothing created.
  await page.evaluate(() => { notesOpenEditor(null); notesCloseEditor(); });
  expect(await page.evaluate(() => notesLoad().length)).toBe(before);

  await page.evaluate(() => notesOpenEditor(null));
  await expect(page.locator('#noteEditorSave')).toHaveCount(0);
  await expect(page.locator('.note-editor-topbar-actions')).not.toContainText('💾');

  // Type through real input events, then leave via ← without any explicit save.
  await page.evaluate((mk) => {
    const t = document.getElementById('noteEditorTitle');
    const b = document.getElementById('noteEditorBody');
    t.value = mk; t.dispatchEvent(new Event('input', { bubbles: true }));
    b.value = 'autosave body ' + mk; b.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('noteEditorBack').click();
  }, marker);

  // Debounced path: edit the saved note and wait > 800 ms without closing.
  await page.evaluate((mk) => {
    const n = notesLoad().find((x) => x.title === mk);
    notesOpenEditor(n.id);
    const b = document.getElementById('noteEditorBody');
    b.value = 'debounced ' + mk; b.dispatchEvent(new Event('input', { bubbles: true }));
  }, marker);
  await page.waitForTimeout(1500);
  expect(await page.evaluate((mk) => notesLoad().filter((x) => x.title === mk).length, marker)).toBe(1);

  await page.reload();
  await page.waitForLoadState('networkidle');
  await waitForDb(page);
  const found = await page.evaluate((mk) =>
    new Promise((resolve, reject) => {
      const tx = eitiDb.transaction(['notes'], 'readonly');
      const req = tx.objectStore('notes').getAll();
      req.onsuccess = () => resolve(req.result.filter((n) => n.title === mk).map((n) => n.body));
      req.onerror = () => reject(req.error);
    }), marker);
  expect(found).toEqual(['debounced ' + marker]);
});
