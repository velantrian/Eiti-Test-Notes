// L3 key-level mutation privacy and commit acknowledgements (no persistent outbox).
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

function readFact(page, key) {
  return page.evaluate((key) => new Promise((resolve, reject) => {
    const req = window.eitiDb.transaction(['l3'], 'readonly').objectStore('l3').get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  }), key);
}

test('delete revokes a failed pending write before flush (regression for PR #56)', async ({ page }) => {
  await boot(page);
  const deleted = await page.evaluate(async () => {
    const db = window.eitiDb;
    try {
      window.eitiDb = { transaction() { throw new Error('controlled save failure'); } };
      window.eitiL3AutoExtract('меня зовут Аня');
    } finally { window.eitiDb = db; }
    const result = await window.eitiL3Delete('name');
    window.eitiL3FlushPending();
    return result;
  });
  expect(deleted).toBe(true);
  expect(await readFact(page, 'name')).toBeNull();
  await page.reload();
  await page.waitForFunction(() => !!window.eitiDb && window.eitiChatReady === true);
  expect(await readFact(page, 'name')).toBeNull();
});

test('delete revokes a pre-open pending fact even if the database is unavailable', async ({ page }) => {
  await boot(page);
  const unconfirmed = await page.evaluate(async () => {
    const db = window.eitiDb;
    window.eitiDb = null;
    window.eitiL3AutoExtract('меня зовут Аня');
    const result = await window.eitiL3Delete('name');
    window.eitiDb = db;
    window.eitiL3FlushPending();
    return result;
  });
  expect(unconfirmed).toBe(false); // no false delete acknowledgement when IDB is absent
  expect(await readFact(page, 'name')).toBeNull();
});

test('delete wins over an already started write transaction', async ({ page }) => {
  await boot(page);
  const result = await page.evaluate(() => {
    window.eitiL3AutoExtract('меня зовут Аня');
    return window.eitiL3Delete('name');
  });
  expect(result).toBe(true);
  expect(await readFact(page, 'name')).toBeNull();
  expect(await page.evaluate(() => window._l3Last?.key === 'name')).toBe(false);
});

test('new user correction wins over a stale queued value for the same key', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const db = window.eitiDb;
    try {
      window.eitiDb = { transaction() { throw new Error('controlled stale write'); } };
      window.eitiL3AutoExtract('меня зовут Аня');
    } finally { window.eitiDb = db; }
    window.eitiL3AutoExtract('я ошибся, меня зовут Оля');
    window.eitiL3FlushPending();
  });
  await expect.poll(async () => (await readFact(page, 'name'))?.value).toBe('Оля');
  expect((await readFact(page, 'name'))?.value).not.toBe('Аня');
});

test('async failure of an older write does not requeue over a newer correction', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const db = window.eitiDb;
    const fake = {
      error: new Error('delayed abort'),
      objectStore() { return { get() { return {}; } }; }
    };
    window.eitiDb = { transaction() { return fake; } };
    try { window.eitiL3AutoExtract('меня зовут Аня'); }
    finally { window.eitiDb = db; }
    window.eitiL3AutoExtract('меня зовут Оля');
    fake.onabort({ target: { error: fake.error } });
    window.eitiL3FlushPending();
  });
  await expect.poll(async () => (await readFact(page, 'name'))?.value).toBe('Оля');
});

test('an immediate category-free correction replaces a pre-commit attempt', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const db = window.eitiDb;
    window.eitiDb = null;
    try { window.eitiL3AutoExtract('меня зовут Аня'); }
    finally { window.eitiDb = db; }
    window.eitiL3AutoExtract('я ошибся, Оля');
    window.eitiL3FlushPending();
  });
  await expect.poll(async () => (await readFact(page, 'name'))?.value).toBe('Оля');
});

test('do-not-remember revokes a pending fact with a matching key', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const db = window.eitiDb;
    try {
      window.eitiDb = { transaction() { throw new Error('controlled pending write'); } };
      window.eitiL3AutoExtract('меня зовут Аня');
    } finally { window.eitiDb = db; }
    window.eitiL3AutoExtract('Не запоминай это: меня зовут Аня');
    window.eitiL3FlushPending();
  });
  expect(await readFact(page, 'name')).toBeNull();
});

test('do-not-remember cancels an in-flight matching write', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    window.eitiL3AutoExtract('меня зовут Аня');
    window.eitiL3AutoExtract('Не запоминай это: меня зовут Аня');
    window.eitiL3FlushPending();
  });
  expect(await readFact(page, 'name')).toBeNull();
});

test('success toast and _l3Last are set only after commit', async ({ page }) => {
  await boot(page);
  const immediate = await page.evaluate(() => {
    window._l3Last = null;
    document.querySelectorAll('.toast').forEach((el) => el.remove());
    window.eitiL3AutoExtract('меня зовут Аня');
    return {
      last: window._l3Last,
      success: [...document.querySelectorAll('.toast')].some((el) => el.textContent.includes('L3 запомнил'))
    };
  });
  expect(immediate.last).toBeNull();
  expect(immediate.success).toBe(false);
  await expect.poll(async () => (await readFact(page, 'name'))?.value).toBe('Аня');
  await expect.poll(async () => page.evaluate(() => window._l3Last?.key)).toBe('name');
  await expect.poll(async () => page.evaluate(() =>
    [...document.querySelectorAll('.toast')].some((el) => el.textContent.includes('L3 запомнил'))
  )).toBe(true);
});

test('failed save never acknowledges success or records _l3Last', async ({ page }) => {
  await boot(page);
  const result = await page.evaluate(() => {
    const db = window.eitiDb;
    window._l3Last = null;
    document.querySelectorAll('.toast').forEach((el) => el.remove());
    try {
      window.eitiDb = { transaction() { throw new Error('controlled IDB rejection'); } };
      window.eitiL3AutoExtract('меня зовут Аня');
    } finally { window.eitiDb = db; }
    return {
      last: window._l3Last,
      messages: [...document.querySelectorAll('.toast')].map((el) => el.textContent)
    };
  });
  expect(result.last).toBeNull();
  expect(result.messages.some((t) => t.includes('L3 запомнил'))).toBe(false);
  expect(result.messages.some((t) => t.includes('ждёт повтора'))).toBe(true);
  expect(await readFact(page, 'name')).toBeNull();
});

test('a deliberate new fact after confirmed deletion is allowed', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.eitiL3AutoExtract('меня зовут Аня'));
  await expect.poll(async () => (await readFact(page, 'name'))?.value).toBe('Аня');
  expect(await page.evaluate(() => window.eitiL3Delete('name'))).toBe(true);
  expect(await readFact(page, 'name')).toBeNull();
  await page.evaluate(() => window.eitiL3AutoExtract('меня зовут Оля'));
  await expect.poll(async () => (await readFact(page, 'name'))?.value).toBe('Оля');
});

test('write, correction, and delete interleaved on one key: deletion wins', async ({ page }) => {
  await boot(page);
  const deleted = await page.evaluate(() => {
    window.eitiL3AutoExtract('меня зовут Аня');
    window.eitiL3AutoExtract('я ошибся, меня зовут Оля');
    return window.eitiL3Delete('name');
  });
  expect(deleted).toBe(true);
  await page.evaluate(() => window.eitiL3FlushPending());
  expect(await readFact(page, 'name')).toBeNull();
  await page.reload();
  await page.waitForFunction(() => !!window.eitiDb && window.eitiChatReady === true);
  expect(await readFact(page, 'name')).toBeNull();
});

test('failed deletion is visibly unconfirmed and never reports completed deletion', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.eitiL3AutoExtract('меня зовут Аня'));
  await expect.poll(async () => (await readFact(page, 'name'))?.value).toBe('Аня');
  const ok = await page.evaluate(async () => {
    const db = window.eitiDb;
    try {
      window.eitiDb = { transaction() { throw new Error('controlled delete rejection'); } };
      return await window.eitiL3Delete('name');
    } finally { window.eitiDb = db; }
  });
  expect(ok).toBe(false);
  expect((await readFact(page, 'name'))?.value).toBe('Аня');
});

test('category-free do-not-remember revokes every fact from the latest multi-key message', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const db = window.eitiDb;
    window.eitiDb = null;
    try {
      window.eitiL3AutoExtract('меня зовут Аня, живу в Берлине');
      window.eitiL3AutoExtract('Не запоминай это');
    } finally { window.eitiDb = db; }
    window.eitiL3FlushPending();
  });
  expect(await readFact(page, 'name')).toBeNull();
  expect(await readFact(page, 'city')).toBeNull();
});
