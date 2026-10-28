// L3 persistence boundary: positive control and reproducible KNOWN GAPS.
// This spec documents current behaviour; it does not introduce a persistent outbox.
// When an owner-approved durability policy is implemented, invert the loss assertions.
// The deletion-resurrection case has been inverted after combining with PR #57's fix.
const { test, expect } = require('@playwright/test');

async function boot(page) {
  await page.addInitScript(() => {
    localStorage.setItem('eiti_onboarded', 'true');
    localStorage.setItem('eiti_toured_v7', '1');
    localStorage.setItem('eiti_install_hint_seen', '1');
    localStorage.setItem('eiti_ai_provider', 'deepseek');
  });
  await page.goto('/index.html');
  await page.waitForFunction(
    () => window.eitiChatReady === true && !!window.eitiDb && typeof window.eitiL3AutoExtract === 'function',
    null, { timeout: 30000 }
  );
}

async function readFact(page, key) {
  // Read the actual committed IDB record, not _l3Cache or an optimistic toast.
  return page.evaluate((id) => new Promise((resolve, reject) => {
    const req = window.eitiDb.transaction(['l3'], 'readonly').objectStore('l3').get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  }), key);
}

async function reloadReady(page) {
  await page.reload();
  await page.waitForFunction(
    () => window.eitiChatReady === true && !!window.eitiDb && typeof window.eitiL3GetAll === 'function',
    null, { timeout: 30000 }
  );
}

test('L3 control: a committed IDB write survives a full page reload', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.eitiL3AutoExtract('меня зовут Аня'));
  await expect.poll(async () => (await readFact(page, 'name'))?.value).toBe('Аня');
  await reloadReady(page);
  expect((await readFact(page, 'name'))?.value).toBe('Аня');
});

test('KNOWN GAP: synchronous IDB failure remains RAM-only and is lost on tab close', async ({ page, context }) => {
  await boot(page);
  const warned = await page.evaluate(() => {
    const realDb = window.eitiDb;
    const warn = console.warn;
    let sawQueued = false;
    console.warn = function (...args) {
      if (String(args[0]).includes('Факт возвращён в очередь')) sawQueued = true;
      return warn.apply(this, args);
    };
    try {
      window.eitiDb = { transaction() { throw new Error('controlled L3 transaction failure'); } };
      window.eitiL3AutoExtract('меня зовут Аня');
    } finally {
      window.eitiDb = realDb;
      console.warn = warn;
    }
    return sawQueued;
  });
  expect(warned, 'failure must be reported as queued, not as a committed write').toBe(true);
  expect(await readFact(page, 'name')).toBeNull();

  // Closing the tab destroys the lexical _l3Pending queue; reuse the browser
  // context so the same origin's IndexedDB remains available.
  await page.close();
  const reopened = await context.newPage();
  try {
    await boot(reopened);
    expect(await readFact(reopened, 'name')).toBeNull(); // KNOWN DATA-LOSS BOUNDARY
  } finally {
    await reopened.close();
  }
});

test('KNOWN GAP: async IDB abort is requeued only in RAM and lost on reload', async ({ page }) => {
  await boot(page);
  const warned = await page.evaluate(() => {
    const realDb = window.eitiDb;
    const warn = console.warn;
    let sawQueued = false;
    console.warn = function (...args) {
      if (String(args[0]).includes('факт возвращён в очередь')) sawQueued = true;
      return warn.apply(this, args);
    };
    const fakeTx = {
      error: new Error('controlled abort'),
      objectStore() { return { get() { return {}; } }; },
    };
    try {
      window.eitiDb = { transaction() { return fakeTx; } };
      window.eitiL3AutoExtract('мой город Осло');
      if (typeof fakeTx.onabort !== 'function') throw new Error('abort handler was not attached');
      fakeTx.onabort({ target: { error: fakeTx.error } });
    } finally {
      window.eitiDb = realDb;
      console.warn = warn;
    }
    return sawQueued;
  });
  expect(warned, 'asynchronous abort must be reported').toBe(true);
  expect(await readFact(page, 'city')).toBeNull();
  await reloadReady(page);
  expect(await readFact(page, 'city')).toBeNull(); // KNOWN DATA-LOSS BOUNDARY
});

test('privacy control: skip and tentative statements are not queued during a DB failure', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const realDb = window.eitiDb;
    try {
      window.eitiDb = { transaction() { throw new Error('controlled L3 failure'); } };
      window.eitiL3AutoExtract('Не запоминай это: меня зовут Аня');
      window.eitiL3AutoExtract('Я ещё не решил, мой город Осло');
    } finally {
      window.eitiDb = realDb;
    }
    window.eitiL3FlushPending();
  });
  expect(await readFact(page, 'name')).toBeNull();
  expect(await readFact(page, 'city')).toBeNull();
  await reloadReady(page);
  expect(await readFact(page, 'name')).toBeNull();
  expect(await readFact(page, 'city')).toBeNull();
});

test('deletion cancels a pending write and retry cannot resurrect it (inverted after #57 fix)', async ({ page }) => {
  await boot(page);
  const deleted = await page.evaluate(async () => {
    const realDb = window.eitiDb;
    try {
      window.eitiDb = { transaction() { throw new Error('controlled L3 failure'); } };
      window.eitiL3AutoExtract('меня зовут Аня');
    } finally {
      window.eitiDb = realDb;
    }
    const ok = await window.eitiL3Delete('name');
    window.eitiL3FlushPending();
    return ok;
  });
  expect(deleted, 'IDB deletion must be confirmed by transaction completion').toBe(true);
  // Give any (incorrect) replayed write time to commit before asserting absence.
  await page.waitForTimeout(500);
  expect(await readFact(page, 'name')).toBeNull();
  // Formerly a KNOWN GAP (deleted fact resurrected on flush). With the
  // per-key revision/cancellation fix from PR #57 the expected record is null.
  await reloadReady(page);
  expect(await readFact(page, 'name')).toBeNull();
});
