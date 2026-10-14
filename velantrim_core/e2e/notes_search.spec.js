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
