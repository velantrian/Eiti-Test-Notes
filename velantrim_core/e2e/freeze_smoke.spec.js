// @ts-check
const { test, expect } = require('@playwright/test');

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('eiti_onboarded', 'true');
    localStorage.setItem('eiti_notes_ai_enabled', '1');
  });
});

async function waitForDb(page) {
  await page.waitForFunction(() => typeof eitiDb !== 'undefined' && !!eitiDb, null, { timeout: 20_000 });
}

async function seed(page) {
  return page.evaluate(async () => {
    const now = Date.now();
    const tx = eitiDb.transaction(['chats', 'messages', 'notes', 'kb'], 'readwrite');
    const chats = tx.objectStore('chats');
    const msgs = tx.objectStore('messages');
    chats.put({ id: 'chat_freeze_500', chatNum: '#F500', title: 'Freeze 500', updated: new Date().toISOString(), count: 500 });
    for (let i = 0; i < 500; i++) {
      msgs.put({
        id: 'msg_500_' + i, chat_id: 'chat_freeze_500',
        role: i % 2 ? 'assistant' : 'user',
        content: (i % 21 === 0 ? 'квантовая физика ' : 'сообщение ') + i,
        created: new Date(now - (500 - i) * 1000).toISOString()
      });
    }
    for (let c = 0; c < 90; c++) {
      const cid = 'chat_bulk_' + c;
      chats.put({ id: cid, chatNum: '#B' + c, title: 'Bulk ' + c, updated: new Date().toISOString(), count: 50 });
      for (let i = 0; i < 50; i++) {
        msgs.put({
          id: 'msg_b_' + c + '_' + i, chat_id: cid,
          role: 'user',
          content: (i === 3 ? 'квантовая заметка ' : 'bulk ') + c + '_' + i,
          created: new Date(now - i * 1000).toISOString()
        });
      }
    }
    const notes = tx.objectStore('notes');
    notes.put({
      id: 'note_seed_big', title: 'Большая', body: 'Я'.repeat(50000),
      created: now, updated: now, tags: ['seed']
    });
    for (let i = 0; i < 300; i++) {
      notes.put({
        id: 'note_seed_' + i, title: 'Заметка ' + i, body: 'тело ' + i,
        created: now - i, updated: now - i, tags: ['seed']
      });
    }
    const kb = tx.objectStore('kb');
    for (let i = 0; i < 1000; i++) {
      kb.put({ id: 'kb_seed_' + i, statement: 'Факт ' + i, category: 'other', ts: now });
    }
    await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
    return true;
  });
}

test('search, 500-message chat load-more, notes Ask AI', async ({ page, context }) => {
  test.setTimeout(120_000);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto('/index.html');
  await page.waitForLoadState('networkidle');
  await waitForDb(page);
  await seed(page);

  const search = await page.evaluate(async () => {
    const tasks = [];
    const po = new PerformanceObserver((list) => {
      list.getEntries().forEach((e) => {
        if (e.duration > 200) tasks.push(Math.round(e.duration));
      });
    });
    try { po.observe({ type: 'longtask' }); } catch (e) {}
    const t0 = performance.now();
    eitiSearch('квантовая');
    const start = performance.now();
    while (performance.now() - start < 12000) {
      const list = document.getElementById('eiti-chat-list');
      if (list && /совп|найдено/i.test(list.textContent || '')) break;
      await new Promise((r) => setTimeout(r, 30));
    }
    await new Promise((r) => setTimeout(r, 80));
    po.disconnect();
    return { ms: Math.round(performance.now() - t0), over200: tasks };
  });
  expect(search.over200, 'long tasks > 200ms during search: ' + JSON.stringify(search.over200)).toEqual([]);

  const chat = await page.evaluate(async () => {
    const idbCount = await new Promise((resolve) => {
      const req = eitiDb.transaction(['messages'], 'readonly').objectStore('messages').index('chat_id').getAll(IDBKeyRange.only('chat_freeze_500'));
      req.onsuccess = () => resolve((req.result || []).length);
      req.onerror = () => resolve(-1);
    });
    const tab = document.querySelector('.tab-item[data-view="chat"]');
    if (tab) tab.click();
    eitiCurrentChatId = 'chat_freeze_500';
    const loaded = await eitiLoadChatIntoView('chat_freeze_500');
    const before = [...document.querySelectorAll('#messages .message')].map((el) => el.getAttribute('data-msgid'));
    const afterCount = (typeof eitiLoadOlderMessages === 'function')
      ? eitiLoadOlderMessages()
      : document.querySelectorAll('#messages .message').length;
    const after = [...document.querySelectorAll('#messages .message')].map((el) => el.getAttribute('data-msgid'));
    const stillThere = before.every((id) => after.includes(id));
    return { idbCount, loaded, before: before.length, after: after.length, afterCount, stillThere };
  });
  expect(chat.idbCount).toBeGreaterThanOrEqual(500);
  expect(chat.before).toBeGreaterThanOrEqual(50);
  expect(chat.after).toBeGreaterThan(chat.before);
  expect(chat.stillThere).toBe(true);

  const notesAi = await page.evaluate(() => typeof window.eitiNotesAITogglePanel === 'function');
  expect(notesAi).toBe(true);
});
