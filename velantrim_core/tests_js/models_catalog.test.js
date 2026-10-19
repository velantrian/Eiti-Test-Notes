'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { loadFunctions, INDEX_HTML } = require('./harness');

const INDEX = fs.readFileSync(INDEX_HTML, 'utf8');

function makeLS(init) {
  const store = Object.assign({}, init);
  return {
    store,
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
  };
}

function loadCatalog(lsInit, extra) {
  const ls = lsInit && lsInit.getItem ? lsInit : makeLS(lsInit || {});
  const sb = loadFunctions([
    'eitiModelCatalog',
    'eitiMigrateSavedModel',
    'eitiGetORModel',
    'eitiGetOpenAIModel',
    'eitiFetchWithTimeout',
    'eitiNormalizeGeminiModel',
    'eitiGetGeminiModel',
    'eitiNormalizeDsSelection',
    'eitiGetDsSelection',
    'eitiGetDsModel',
  ], Object.assign({
    localStorage: ls,
    AbortController,
    setTimeout,
    clearTimeout,
  }, extra || {}));
  sb._ls = ls;
  return sb;
}

function assertUnique(ids, label) {
  assert.ok(Array.isArray(ids) && ids.length > 0, label + ' должен быть непустым массивом');
  assert.equal(new Set(ids).size, ids.length, label + ' содержит дубликаты: ' + ids.join(', '));
}

test('каталог моделей: уникальные ID и defaults входят в списки', () => {
  const s = loadCatalog({});
  const cat = s.eitiModelCatalog();

  assertUnique(cat.deepseek.selections, 'deepseek.selections');
  assertUnique(cat.deepseek.apiIds, 'deepseek.apiIds');
  assert.ok(cat.deepseek.selections.includes(cat.deepseek.defaultSel));
  assert.ok(cat.deepseek.apiIds.includes('deepseek-flash'));
  assert.ok(cat.deepseek.apiIds.includes('deepseek-v4-pro'));

  assertUnique(cat.gemini.ids, 'gemini.ids');
  assert.ok(cat.gemini.ids.includes(cat.gemini.defaultId));

  assertUnique(cat.openrouter.presets, 'openrouter.presets');
  assert.ok(cat.openrouter.presets.includes(cat.openrouter.defaultId));

  assertUnique(cat.notesAI.ids, 'notesAI.ids');
  assert.ok(cat.notesAI.ids.includes(cat.notesAI.defaultId));
  cat.openrouter.presets.forEach((id) => {
    assert.ok(cat.notesAI.ids.includes(id), 'Notes AI должен включать пресет OpenRouter ' + id);
  });

  assertUnique(cat.openai.ids, 'openai.ids');
  assert.ok(cat.openai.ids.includes(cat.openai.defaultId));

  assertUnique(cat.anthropic.ids, 'anthropic.ids');
  assert.ok(cat.anthropic.ids.includes(cat.anthropic.defaultId));

  assertUnique(cat.grokVision.ids, 'grokVision.ids');
  assert.ok(cat.grokVision.ids.includes(cat.grokVision.defaultId));

  assertUnique(cat.qwen.ids, 'qwen.ids');
  assert.ok(cat.qwen.ids.includes(cat.qwen.defaultId));
  assert.ok(cat.qwen.ids.includes('qwen-long'));

  assertUnique(cat.embeddings.ids, 'embeddings.ids');
  assert.ok(cat.embeddings.ids.includes(cat.embeddings.defaultId));
  assert.ok(cat.embeddings.ids.includes('jina-v5'));
});

test('пикеры HTML совпадают с каталогом и не содержат retired onclick', () => {
  const s = loadCatalog({});
  const cat = s.eitiModelCatalog();
  cat.gemini.ids.forEach((id) => {
    assert.match(INDEX, new RegExp("eitiSetGeminiModel\\('" + id.replace(/\./g, '\\.') + "'\\)"));
  });
  cat.openrouter.presets.forEach((id) => {
    assert.match(INDEX, new RegExp("eitiSetORModel\\('" + id.replace(/[./]/g, '\\$&') + "'\\)"));
  });
  assert.doesNotMatch(INDEX, /eitiSetORModel\('anthropic\/claude-sonnet-4-6'\)/);
  assert.doesNotMatch(INDEX, /eitiSetORModel\('openai\/gpt-4o'\)/);
  assert.doesNotMatch(INDEX, /eitiSetGeminiModel\('gemini-2\.5-flash'\)/);
  assert.doesNotMatch(INDEX, /eitiSetGeminiModel\('gemini-3\.5-flash'\)/);
  assert.match(INDEX, /eitiSetORModel\('anthropic\/claude-sonnet-5\.5'\)/);
  assert.match(INDEX, /eitiSetORModel\('openai\/gpt-6\.1-sol'\)/);
  assert.match(INDEX, /jina-embeddings-v5-text-small/);
  assert.match(INDEX, /voyage-4-lite/);
  assert.match(INDEX, /gemini-embedding-001/);
  assert.match(INDEX, /model: 'deepseek\/deepseek-v4\.1-flash'/);
});

test('retired ID мигрируют, актуальные сохранённые ID не ломаются', () => {
  const s = loadCatalog({});
  const cat = s.eitiModelCatalog();

  assert.equal(s.eitiMigrateSavedModel('deepseek', 'deepseek-chat'), 'deepseek-flash');
  assert.equal(s.eitiMigrateSavedModel('deepseek', 'deepseek-reasoner'), 'deepseek-v4-pro-high');
  assert.equal(s.eitiMigrateSavedModel('deepseek', null), cat.deepseek.defaultSel);
  assert.equal(s.eitiMigrateSavedModel('deepseek', ''), cat.deepseek.defaultSel);

  assert.equal(s.eitiMigrateSavedModel('gemini', 'gemini-2.5-flash'), 'gemini-3.6-flash');
  assert.equal(s.eitiMigrateSavedModel('gemini', 'gemini-3.5-flash'), 'gemini-3.6-flash');
  assert.equal(s.eitiMigrateSavedModel('gemini', 'gemini-3.7-flash'), 'gemini-3.8-flash');
  assert.equal(s.eitiMigrateSavedModel('gemini', 'gemini-3.1-pro-preview'), 'gemini-3.1-pro-preview');
  assert.equal(s.eitiMigrateSavedModel('gemini', null), cat.gemini.defaultId);

  assert.equal(s.eitiMigrateSavedModel('openrouter', 'openai/gpt-4o'), 'openai/gpt-6.1-sol');
  assert.equal(s.eitiMigrateSavedModel('openrouter', 'anthropic/claude-sonnet-4-6'), 'anthropic/claude-sonnet-5.5');
  assert.equal(s.eitiMigrateSavedModel('openrouter', 'anthropic/claude-sonnet-4.6'), 'anthropic/claude-sonnet-5.5');
  assert.equal(s.eitiMigrateSavedModel('openrouter', 'openai/gpt-5.5'), 'openai/gpt-5.5');
  assert.equal(s.eitiMigrateSavedModel('openrouter', 'meta-llama/llama-3.3-70b-instruct'), 'meta-llama/llama-3.3-70b-instruct');

  assert.equal(s.eitiMigrateSavedModel('notesAI', 'openai/gpt-4o'), 'openai/gpt-6.1-sol');
  assert.equal(s.eitiMigrateSavedModel('notesAI', 'openai/gpt-5.5'), 'openai/gpt-5.5');
  assert.equal(s.eitiMigrateSavedModel('notesAI', 'same'), 'same');

  assert.equal(s.eitiMigrateSavedModel('openai', 'gpt-4o'), 'gpt-6-luna');
  assert.equal(s.eitiMigrateSavedModel('openai', 'gpt-5.5'), 'gpt-5.5');
  assert.equal(s.eitiMigrateSavedModel('anthropic', 'claude-sonnet-4-6'), 'claude-sonnet-5-5');
  assert.equal(s.eitiMigrateSavedModel('grokVision', 'grok-2-vision-1212'), 'grok-4.7');
  assert.equal(s.eitiMigrateSavedModel('qwen', 'qwq-32b'), 'qwen3.8-flash');
  assert.equal(s.eitiMigrateSavedModel('qwen', 'qwen3-235b-a22b'), 'qwen3.8-max');
  assert.equal(s.eitiMigrateSavedModel('qwen', 'qwen-plus-latest'), 'qwen-plus-latest');
});

test('getters сохраняют мигрированный ID в localStorage', () => {
  const or = loadCatalog({ eiti_or_model: 'openai/gpt-4o' });
  assert.equal(or.eitiGetORModel(), 'openai/gpt-6.1-sol');
  assert.equal(or._ls.store.eiti_or_model, 'openai/gpt-6.1-sol');

  const oai = loadCatalog({ eiti_openai_model: 'gpt-4o' });
  assert.equal(oai.eitiGetOpenAIModel(), 'gpt-6-luna');
  assert.equal(oai._ls.store.eiti_openai_model, 'gpt-6-luna');

  const gm = loadCatalog({ eiti_gemini_model: 'gemini-2.5-flash' });
  assert.equal(gm.eitiGetGeminiModel(), 'gemini-3.6-flash');
  assert.equal(gm._ls.store.eiti_gemini_model, 'gemini-3.6-flash');

  const ds = loadCatalog({ eiti_ds_model: 'deepseek-chat' });
  assert.equal(ds.eitiGetDsSelection(), 'deepseek-flash');
  assert.equal(ds.eitiGetDsModel(), 'deepseek-flash');
  assert.equal(ds._ls.store.eiti_ds_model, 'deepseek-flash');

  const empty = loadCatalog({});
  assert.equal(empty.eitiGetORModel(), 'openrouter/auto');
  assert.equal(empty.eitiGetOpenAIModel(), 'gpt-6.1-sol');
  assert.equal(empty.eitiGetGeminiModel(), 'gemini-3.8-flash');
});

test('eitiFetchWithTimeout прерывает зависший fetch', async () => {
  let aborted = false;
  const s = loadFunctions(['eitiFetchWithTimeout'], {
    AbortController,
    setTimeout,
    clearTimeout,
    fetch(_url, opts) {
      return new Promise((_resolve, reject) => {
        opts.signal.addEventListener('abort', () => {
          aborted = true;
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    },
  });
  await assert.rejects(
    () => s.eitiFetchWithTimeout('https://example.invalid/hang', {}, 25),
    (err) => err && (err.name === 'AbortError' || /abort/i.test(String(err.message || err)))
  );
  assert.equal(aborted, true);
});

test('eitiFetchWithTimeout снимает таймер после успешного ответа', async () => {
  let cleared = 0;
  const s = loadFunctions(['eitiFetchWithTimeout'], {
    AbortController,
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => { cleared += 1; clearTimeout(id); },
    fetch() { return Promise.resolve({ ok: true, status: 200 }); },
  });
  const r = await s.eitiFetchWithTimeout('https://example.invalid/ok', {}, 5000);
  assert.equal(r.ok, true);
  assert.ok(cleared >= 1);
});

test('нет дампа outerHTML монолита и есть watchdog TTS / таймаут OR', () => {
  assert.equal(INDEX.includes('document.documentElement.outerHTML'), false);
  assert.match(INDEX, /_wdTicks > 500/);
  assert.match(INDEX, /function eitiFetchWithTimeout\(/);
  assert.equal(INDEX.includes('_OR_DEFAULT_KEY'), false);
  assert.match(INDEX, /eitiFetchWithTimeout\('https:\/\/openrouter\.ai\/api\/v1\/models'/);
});
