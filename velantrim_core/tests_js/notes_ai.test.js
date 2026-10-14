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

function fakeDoc() {
  return { getElementById() { return null; }, querySelectorAll() { return []; } };
}

function loadNotesAI(ls, extra) {
  return loadFunctions([
    'eitiNotesAIIsEnabled',
    'eitiNotesAIGetModel',
    'eitiNotesAIGetSize',
    'eitiNotesAIControlVisible',
    'eitiNotesAISetEnabled',
    'eitiNotesAISetModel',
    'eitiNotesAISetSize',
    'eitiNotesAIResolveTarget',
    'eitiNotesAIBuildSystemPrompt',
    'eitiNotesAICall',
    'eitiNotesAIModelButtonMap',
    'eitiNotesAIPresetModels',
    'eitiNotesAIRenderSettings',
    'eitiNotesAIApplySize',
    'eitiNotesAISyncControl',
    'eitiNotesAIUpdateChip',
    'eitiNotesAIUpdateModelChip',
  ], Object.assign({
    localStorage: ls,
    document: fakeDoc(),
    eitiGetDsModel() { return 'deepseek-flash'; },
    eitiGetGeminiModel() { return 'gemini-3.8-flash'; },
  }, extra || {}));
}

test('Notes AI UI and settings keys exist in the monolith', () => {
  assert.match(INDEX, /id="eiti-notes-ai-settings"/);
  assert.match(INDEX, /id="notesAiFabBar"/);
  assert.match(INDEX, /id="notesAiPanel"/);
  assert.match(INDEX, /id="notesAiAskBtn"/);
  assert.match(INDEX, /eiti_notes_ai_enabled/);
  assert.match(INDEX, /eiti_notes_ai_model/);
  assert.match(INDEX, /eiti_notes_ai_size/);
  assert.match(INDEX, /NOTES_AI_DISABLED/);
  assert.match(INDEX, /function eitiNotesAICall\(/);
  assert.match(INDEX, /eitiRenderMarkdown\(out\)/);
  assert.match(INDEX, /eitiRenderMarkdown\(text\)/);
});

test('Notes AI default is OFF: control hidden, no helper call', async () => {
  const ls = makeLS({});
  let helperCalls = 0;
  let fetchCalls = 0;
  const s = loadNotesAI(ls, {
    _eitiUniversalAICall() {
      helperCalls += 1;
      return Promise.resolve('leak');
    },
    fetch() {
      fetchCalls += 1;
      return Promise.resolve({ json: async () => ({}) });
    },
  });

  assert.equal(s.eitiNotesAIIsEnabled(), false);
  assert.equal(s.eitiNotesAIGetModel(), 'same');
  assert.equal(s.eitiNotesAIGetSize(), 'medium');
  assert.equal(s.eitiNotesAIControlVisible(true), false);
  assert.equal(s.eitiNotesAIControlVisible(false), false);
  assert.equal(s.eitiNotesAIResolveTarget(), null);

  await assert.rejects(() => s.eitiNotesAICall('резюмируй', 'Заголовок', 'Текст'), /NOTES_AI_DISABLED/);
  assert.equal(helperCalls, 0);
  assert.equal(fetchCalls, 0);
});

test('Notes AI settings persist in localStorage and survive a reload sandbox', () => {
  const ls = makeLS({});
  const s1 = loadNotesAI(ls);
  s1.eitiNotesAISetEnabled(true);
  s1.eitiNotesAISetModel('openai/gpt-5.5');
  s1.eitiNotesAISetSize('large');

  assert.equal(ls.store.eiti_notes_ai_enabled, '1');
  assert.equal(ls.store.eiti_notes_ai_model, 'openai/gpt-5.5');
  assert.equal(ls.store.eiti_notes_ai_size, 'large');

  const s2 = loadNotesAI(ls);
  assert.equal(s2.eitiNotesAIIsEnabled(), true);
  assert.equal(s2.eitiNotesAIGetModel(), 'openai/gpt-5.5');
  assert.equal(s2.eitiNotesAIGetSize(), 'large');
  assert.equal(s2.eitiNotesAIControlVisible(true), true);
  assert.equal(s2.eitiNotesAIControlVisible(false), false);

  ls.setItem('eiti_notes_ai_size', 'huge');
  assert.equal(s2.eitiNotesAIGetSize(), 'medium');
});

test('Notes AI uses the chosen model in the helper request', async () => {
  const ls = makeLS({
    eiti_notes_ai_enabled: '1',
    eiti_notes_ai_model: 'openai/gpt-5.5',
  });
  let seen = null;
  const s = loadNotesAI(ls, {
    _eitiUniversalAICall(user, sys, maxTok, needJson, opts) {
      seen = { user, sys, maxTok, needJson, opts };
      return Promise.resolve('ok');
    },
  });

  const out = await s.eitiNotesAICall('Резюмируй', 'Проект', 'Сделать MVP');
  assert.equal(out, 'ok');
  assert.equal(seen.user, 'Резюмируй');
  assert.equal(seen.needJson, false);
  assert.equal(seen.opts.provider, 'openrouter');
  assert.equal(seen.opts.model, 'openai/gpt-5.5');
  assert.match(seen.sys, /Проект/);
  assert.match(seen.sys, /Сделать MVP/);
});

test('Notes AI same-as-chat resolves DeepSeek and Gemini from existing keys', () => {
  const ls = makeLS({
    eiti_notes_ai_enabled: '1',
    eiti_notes_ai_model: 'same',
    eiti_ai_provider: 'gemini',
  });
  const s = loadNotesAI(ls);
  const gem = s.eitiNotesAIResolveTarget();
  assert.equal(gem.provider, 'gemini');
  assert.equal(gem.model, 'gemini-3.8-flash');

  ls.setItem('eiti_ai_provider', 'deepseek');
  const ds = s.eitiNotesAIResolveTarget();
  assert.equal(ds.provider, 'deepseek');
  assert.equal(ds.model, 'deepseek-flash');
});

test('_eitiUniversalAICall writes the forced OpenRouter model into the request body', async () => {
  const fetches = [];
  const store = { eiti_or_key: 'or-key', deepseek_api_key: 'ds-key' };
  const s = loadFunctions(['_eitiUniversalAICall'], {
    localStorage: {
      getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    },
    _deobfKey(x) { return x; },
    eitiApplyORThinking(body) { return body; },
    window: {},
    fetch(url, init) {
      fetches.push({ url, init });
      return Promise.resolve({
        json() {
          return Promise.resolve({ choices: [{ message: { content: 'hello' } }] });
        },
      });
    },
  });

  const txt = await s._eitiUniversalAICall('q', 'sys', 50, false, {
    provider: 'openrouter',
    model: 'openai/gpt-5.5',
  });
  assert.equal(txt, 'hello');
  assert.equal(fetches.length, 1);
  assert.match(fetches[0].url, /openrouter\.ai\/api\/v1\/chat\/completions/);
  assert.equal(JSON.parse(fetches[0].init.body).model, 'openai/gpt-5.5');
});

test('system prompt attaches the current note as context', () => {
  const s = loadNotesAI(makeLS({}));
  const sys = s.eitiNotesAIBuildSystemPrompt('Велантрим', 'GapGate как орган');
  assert.match(sys, /Велантрим/);
  assert.match(sys, /GapGate как орган/);
  assert.match(sys, /Текст заметки/);
});
