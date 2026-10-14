'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { loadFunctions, INDEX_HTML } = require('./harness');
const INDEX = fs.readFileSync(INDEX_HTML, 'utf8');

function makeSandbox(savedValue, extras = {}) {
  const values = new Map();
  if (savedValue !== undefined) values.set('eiti_memory_lookup_enabled', savedValue);
  const sandbox = loadFunctions(
    ['eitiMemoryLookupIsEnabled', 'eitiIsExplicitArchiveRequest', 'eitiPrepareContext'],
    Object.assign({
      MEMORY_LOOKUP_KEY: 'eiti_memory_lookup_enabled',
      localStorage: { getItem: (key) => values.has(key) ? values.get(key) : null },
      eitiDb: {},
      _db: {},
      window: {},
      archiveCalls: 0,
    }, extras)
  );
  sandbox.eitiSearchArchive = () => {
    sandbox.archiveCalls += 1;
    return Promise.resolve([{ chatId: 'chat-1', snippets: 'previously discussed fact' }]);
  };
  return sandbox;
}

function prepare(sandbox, query, options) {
  return new Promise((resolve) => {
    sandbox.eitiPrepareContext(query, [{ role: 'system', content: 'base prompt' }], resolve, options);
  });
}

test('archive lookup is off when the setting is missing or disabled', async () => {
  for (const savedValue of [undefined, '0']) {
    const sandbox = makeSandbox(savedValue);
    assert.equal(sandbox.eitiMemoryLookupIsEnabled(), false);
    const history = await prepare(sandbox, 'How should I structure this new project?');
    assert.equal(sandbox.archiveCalls, 0);
    assert.equal(history[0].content, 'base prompt');
  }
});

test('explicit history requests are recognized in Russian, English and German', () => {
  const sandbox = makeSandbox(undefined);
  for (const query of [
    'Найди это в истории чатов',
    'Что мы обсуждали вчера?',
    'Find that in chat history',
    'What did we discuss yesterday?',
    'Was haben wir letzte Woche besprochen?',
    'Suche im Chatverlauf nach dem Gespräch',
  ]) assert.equal(sandbox.eitiIsExplicitArchiveRequest(query), true, query);
});

test('ordinary history-related topics do not trigger archive retrieval', () => {
  const sandbox = makeSandbox(undefined);
  for (const query of [
    'Расскажи про историю Рима',
    'Объясни предыдущий абзац',
    'What happened earlier in Rome?',
    'Write a short story about a city',
    'Was ist die Geschichte Berlins?',
    'Как дела? Спасибо!',
  ]) assert.equal(sandbox.eitiIsExplicitArchiveRequest(query), false, query);
});

test('an explicit history request searches even when automatic lookup is off', async () => {
  const sandbox = makeSandbox(undefined);
  const history = await prepare(sandbox, 'Find that in chat history');
  assert.equal(sandbox.archiveCalls, 1);
  assert.match(history[0].content, /РЕЗУЛЬТАТЫ ПОИСКА ПО АРХИВУ/);
  assert.match(history[0].content, /previously discussed fact/);
});

test('the opt-in setting enables archive lookup for ordinary chat', async () => {
  const sandbox = makeSandbox('1');
  assert.equal(sandbox.eitiMemoryLookupIsEnabled(), true);
  await prepare(sandbox, 'How should I structure this new project?');
  assert.equal(sandbox.archiveCalls, 1);
});

test('greetings with punctuation remain excluded from automatic archive search', async () => {
  const sandbox = makeSandbox('1');
  await prepare(sandbox, 'Привет!');
  assert.equal(sandbox.archiveCalls, 0);
});

test('archive fallback searches IndexedDB if FTS5/table is unavailable', async () => {
  const data = {
    c1: [
      { role: 'user', content: 'Yesterday we discussed alpine skiing.' },
      { role: 'assistant', content: 'We planned a trip to Innsbruck.' },
    ],
    c2: [{ role: 'user', content: 'We discussed the app design last Friday.' }],
    c3: [{ role: 'user', content: 'A quiet note about gardening.' }],
  };
  const sandbox = loadFunctions(
    ['eitiArchiveSearchTokens', 'eitiArchiveResultsFromRows', '_ftsLikeFallback', 'eitiSearchArchive'],
    {
      _db: { exec: () => { throw new Error('no such table: chat_history_fts'); } },
      _fts5Available: false,
      eitiGetChats: () => Promise.resolve(Object.keys(data).map((id) => ({ id }))),
      eitiGetMessages: (id) => Promise.resolve(data[id]),
      eitiDb: {},
      window: {},
    }
  );
  const results = await sandbox.eitiSearchArchive('What did we discuss yesterday?');
  assert.equal(results[0].chatId, 'c1');
  assert.match(results[0].snippets, /Yesterday we discussed alpine skiing/);
  assert.equal(results.some((r) => r.chatId === 'c3'), false);
});

test('LIKE fallback binds sanitized tokens and handles apostrophes without SQL escaping', async () => {
  let queryText = '';
  let params = [];
  const sandbox = loadFunctions(
    ['eitiArchiveSearchTokens', 'eitiArchiveResultsFromRows', '_ftsLikeFallback', 'eitiSearchArchive'],
    {
      _db: {
        exec: (sql, values) => {
          queryText = sql;
          params = values;
          return [{ values: [['c1', "Let's discuss Velantrim's archive", 'user']] }];
        },
      },
      _fts5Available: false,
      eitiGetChats: () => Promise.resolve([]),
      eitiGetMessages: () => Promise.resolve([]),
      eitiDb: {},
      window: {},
    }
  );
  const results = await sandbox.eitiSearchArchive("Let's discuss Velantrim's archive");
  assert.match(queryText, /LOWER\(content\) LIKE \?/);
  assert.doesNotMatch(queryText, /ESCAPE|Velantrim/);
  assert.ok(params.some((value) => value.includes('velantrim')));
  assert.equal(results[0].chatId, 'c1');
});

test('prepared archive and loaded-chat suffixes survive a provider system-prompt refresh', () => {
  const sandbox = loadFunctions(['_eitiMergePreparedSystemContext'], {});
  const archive = '\n[АРХИВНЫЙ КОНТЕКСТ]: prior fact';
  const loaded = '\n\n[ЗАГРУЖЕННЫЙ ЧАТ]:\nloaded conversation';
  assert.equal(
    sandbox._eitiMergePreparedSystemContext('fresh base prompt', 'old base' + archive + loaded),
    'fresh base prompt' + archive + loaded
  );
  assert.equal(sandbox._eitiMergePreparedSystemContext('fresh base', 'old base'), 'fresh base');
});

test('a failed or throwing archive operation completes its callback once', async () => {
  const sandbox = makeSandbox(undefined);
  sandbox.eitiSearchArchive = () => Promise.reject(new Error('index unavailable'));
  let calls = 0;
  await new Promise((resolve) => {
    sandbox.eitiPrepareContext('Find that in chat history', [{ role: 'system', content: 'base prompt' }], (history) => {
      calls += 1;
      resolve(history);
    });
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 1);
});


test('chat lookup normalizes #A001 and makes the loaded conversation available to context', async () => {
  const context = { histScanData: null };
  const sandbox = loadFunctions(['eitiLoadChatById'], {
    eitiDb: {},
    eitiGetChats: () => Promise.resolve([{ id: 'chat-uuid', chatNum: 'A001', title: 'Earlier session' }]),
    eitiGetMessages: () => Promise.resolve([{ role: 'user', content: 'loaded historical marker' }]),
    window: { _eitiCtx: context },
    showToast: () => {},
    console,
  });
  assert.equal(await sandbox.eitiLoadChatById('#A001'), true);
  assert.match(context.histScanData, /loaded historical marker/);
});

test('SQLite LIKE fallbacks find Unicode case and apostrophes in notes and KB', () => {
  const vm = require('node:vm');
  function loadWindowSearch(name, marker, endMarker, row) {
    const start = marker;
    const end = INDEX.indexOf(endMarker, start);
    assert.ok(start >= 0 && end > start, `${name} source boundaries exist`);
    const calls = [];
    const window = {};
    const context = {
      window,
      _fts5Available: false,
      _db: { exec: (sql, params) => { calls.push({ sql, params }); return [{ values: [row] }]; } },
    };
    vm.runInNewContext(INDEX.slice(start, end), context, { filename: `${name}.fallback.js` });
    return { search: window[name], calls };
  }
  const note = loadWindowSearch(
    'eitiSearchNotes',
    INDEX.indexOf('window.eitiSearchNotes = function(query, limit) {'),
    '/**\n * Поиск по KB',
    ['n1', 'ÄPFEL outline', "Let's discuss O'Reilly's archive", 'topic', 1]
  );
  assert.equal(note.search('äpfel', 10)[0].id, 'n1');
  assert.equal(note.search("o'reilly", 10)[0].id, 'n1');
  assert.ok(note.calls.every(({ sql }) => !/ESCAPE|äpfel|o'reilly/i.test(sql)));

  const kb = loadWindowSearch(
    'eitiSearchKB',
    INDEX.indexOf('window.eitiSearchKB = function(query, limit) {'),
    '/**\n * Обновить attention score',
    ['k1', 'ÄPFEL recall cue', "Remember O'Reilly's note", 'Supported', 0.9]
  );
  assert.equal(kb.search('äpfel', 10)[0].id, 'k1');
  assert.equal(kb.search("o'reilly", 10)[0].id, 'k1');
  assert.ok(kb.calls.every(({ sql }) => !/ESCAPE|äpfel|o'reilly/i.test(sql)));
});


test('Russian “Покажи историю” remains an explicit request despite the stop word “пока” prefix', () => {
  const sandbox = makeSandbox(undefined);
  assert.equal(sandbox.eitiIsExplicitArchiveRequest('Покажи историю'), true);
  assert.equal(sandbox.eitiIsExplicitArchiveRequest('Покажи историю чатов'), true);
});
