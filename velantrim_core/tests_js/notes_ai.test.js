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
    'eitiNotesAIGetKeyboardInset',
    'eitiNotesAIAvailablePanelHeight',
    'eitiNotesAIClampPanelHeight',
    'eitiNotesAISetPanelHeight',
    'eitiNotesAIToggleFullscreen',
    'eitiNotesAIControlVisible',
    'eitiNotesAISetEnabled',
    'eitiNotesAISetModel',
    'eitiNotesAISetSize',
    'eitiNotesAIResolveTarget',
    'eitiNotesAIBuildSystemPrompt',
    'eitiNotesAICall',
    'eitiNotesAIParseResponse',
    'eitiNotesAIUserRequestedEdit',
    'eitiNotesAIUserRequestedDelete',
    'eitiNotesAIApplyMutation',
    'eitiNotesAIPersistCurrentNote',
    'eitiNotesAIModelButtonMap',
    'eitiNotesAIPresetModels',
    'eitiNotesAIRenderSettings',
    'eitiNotesAIApplySize',
    'eitiNotesAITogglePanel',
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
  ls.setItem('eiti_notes_ai_height_px', '420');
  s1.eitiNotesAISetSize('large');

  assert.equal(ls.store.eiti_notes_ai_enabled, '1');
  assert.equal(ls.store.eiti_notes_ai_model, 'openai/gpt-5.5');
  assert.equal(ls.store.eiti_notes_ai_size, 'large');
  assert.equal(ls.getItem('eiti_notes_ai_height_px'), null);

  const s2 = loadNotesAI(ls);
  assert.equal(s2.eitiNotesAIIsEnabled(), true);
  assert.equal(s2.eitiNotesAIGetModel(), 'openai/gpt-5.5');
  assert.equal(s2.eitiNotesAIGetSize(), 'large');
  assert.equal(s2.eitiNotesAIControlVisible(true), true);
  assert.equal(s2.eitiNotesAIControlVisible(false), false);

  ls.setItem('eiti_notes_ai_size', 'huge');
  assert.equal(s2.eitiNotesAIGetSize(), 'medium');
});

test('Notes AI drawer height is clamped and fullscreen is reversible', () => {
  function classList(initial) {
    const names = new Set(initial || []);
    return {
      add(...values) { values.forEach((value) => names.add(value)); },
      remove(...values) { values.forEach((value) => names.delete(value)); },
      contains(value) { return names.has(value); },
      toggle(value, force) {
        const enabled = force === undefined ? !names.has(value) : !!force;
        if (enabled) names.add(value); else names.delete(value);
        return enabled;
      },
    };
  }
  const ls = makeLS({});
  const panel = {
    parentElement: { clientHeight: 640 },
    classList: classList(['expanded']),
    style: { height: '', removeProperty(name) { this[name] = ''; } },
    getBoundingClientRect() { return { height: Number.parseFloat(this.style.height) || 400 }; },
  };
  const overlay = { classList: classList([]) };
  const handle = { title: '', attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } };
  const elements = { notesAiPanel: panel, noteEditorOverlay: overlay, notesAiPanelHandle: handle };
  const s = loadNotesAI(ls, {
    window: { innerHeight: 640, visualViewport: null },
    document: { getElementById(id) { return elements[id] || null; } },
  });

  assert.equal(s.eitiNotesAIClampPanelHeight(80, 640), 148);
  assert.equal(s.eitiNotesAIClampPanelHeight(900, 640), 640);
  assert.equal(s.eitiNotesAIClampPanelHeight(90, 100), 100);
  assert.equal(s.eitiNotesAISetPanelHeight(470), 470);
  assert.equal(panel.style.height, '470px');
  assert.equal(ls.getItem('eiti_notes_ai_height_px'), null);
  assert.equal(panel.classList.contains('notes-ai-custom-height'), true);
  assert.equal(panel.classList.contains('expanded'), false);

  assert.equal(s.eitiNotesAIToggleFullscreen(), true);
  assert.equal(panel.classList.contains('notes-ai-fullscreen'), true);
  assert.equal(overlay.classList.contains('notes-ai-fullscreen'), true);
  assert.match(handle.attributes['aria-label'], /выйти из полного экрана/);
  assert.equal(s.eitiNotesAIToggleFullscreen(false), false);
  assert.equal(panel.classList.contains('notes-ai-fullscreen'), false);
  assert.equal(overlay.classList.contains('notes-ai-fullscreen'), false);
});

test('Notes AI keyboard inset uses the editor card height instead of the window height', () => {
  const panel = { parentElement: { clientHeight: 600 } };
  const window = { innerHeight: 844, visualViewport: { height: 400, offsetTop: 0 } };
  const s = loadNotesAI(makeLS({}), { window });

  assert.equal(s.eitiNotesAIGetKeyboardInset(panel, window.innerHeight, window.visualViewport), 200);
  assert.equal(s.eitiNotesAIAvailablePanelHeight(panel), 400);

  window.visualViewport = { height: 844, offsetTop: 0 };
  assert.equal(s.eitiNotesAIGetKeyboardInset(panel, window.innerHeight, window.visualViewport), 0);
  assert.equal(s.eitiNotesAIAvailablePanelHeight(panel), 600);
});

test('Notes AI opens at its default size and keeps dragged height only during that open session', () => {
  function classList(initial) {
    const names = new Set(initial || []);
    return {
      add(...values) { values.forEach((value) => names.add(value)); },
      remove(...values) { values.forEach((value) => names.delete(value)); },
      contains(value) { return names.has(value); },
      toggle(value, force) {
        const enabled = force === undefined ? !names.has(value) : !!force;
        if (enabled) names.add(value); else names.delete(value);
        return enabled;
      },
    };
  }
  const ls = makeLS({ eiti_notes_ai_enabled: '1', eiti_notes_ai_height_px: '520' });
  const panel = {
    parentElement: { clientHeight: 640 },
    classList: classList(['notes-ai-size-large', 'notes-ai-custom-height', 'expanded']),
    style: { height: '520px', removeProperty(name) { this[name] = ''; } },
    getBoundingClientRect() { return { height: Number.parseFloat(this.style.height) || 320 }; },
  };
  const overlay = { classList: classList([]) };
  const handle = { title: '', attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } };
  const elements = { notesAiPanel: panel, noteEditorOverlay: overlay, notesAiPanelHandle: handle };
  const s = loadNotesAI(ls, {
    window: { innerHeight: 640, visualViewport: null },
    document: { getElementById(id) { return elements[id] || null; } },
    eitiNotesAIUpdateChip() {},
    eitiNotesAIUpdateModelChip() {},
    eitiNotesAIRenderThread() {},
    setTimeout() {},
  });

  s.eitiNotesAITogglePanel(true);
  assert.equal(panel.classList.contains('open'), true);
  assert.equal(panel.classList.contains('notes-ai-size-medium'), true);
  assert.equal(panel.classList.contains('notes-ai-custom-height'), false);
  assert.equal(panel.classList.contains('expanded'), false);
  assert.equal(panel.style.height, '');
  assert.equal(ls.getItem('eiti_notes_ai_height_px'), null);

  s.eitiNotesAISetPanelHeight(470);
  s.eitiNotesAITogglePanel(true);
  assert.equal(panel.style.height, '470px');
  assert.equal(ls.getItem('eiti_notes_ai_height_px'), null);

  s.eitiNotesAITogglePanel(false);
  s.eitiNotesAITogglePanel(true);
  assert.equal(panel.classList.contains('notes-ai-size-medium'), true);
  assert.equal(panel.classList.contains('notes-ai-custom-height'), false);
  assert.equal(panel.style.height, '');
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

test('Notes AI receives the entire note, tags, and selected text without truncation', () => {
  const s = loadNotesAI(makeLS({}));
  const body = 'x'.repeat(15000);
  const sys = s.eitiNotesAIBuildSystemPrompt('Title', body, 'selected fragment', 'work, idea');
  assert.ok(sys.includes(body));
  assert.match(sys, /selected fragment/);
  assert.match(sys, /work, idea/);
});

test('Notes AI parses structured edits and gates deletion on an explicit command', () => {
  const s = loadNotesAI(makeLS({}));
  const parsed = s.eitiNotesAIParseResponse('```json\n{"reply":"Готово","mutation":{"action":"append","text":"Новый пункт"}}\n```');
  assert.equal(parsed.reply, 'Готово');
  assert.equal(parsed.mutation.action, 'append');
  assert.equal(s.eitiNotesAIUserRequestedEdit('Добавь новый пункт в заметку'), true);
  assert.equal(s.eitiNotesAIUserRequestedEdit('Перефразируй этот абзац'), true);
  assert.equal(s.eitiNotesAIUserRequestedDelete('Стоит ли удалить эту заметку?'), false);
  assert.equal(s.eitiNotesAIUserRequestedDelete('Удали эту заметку'), true);
});

test('AI replacement updates only the open note and saves a history version', () => {
  const elements = {
    noteEditorTitle: { value: 'Doc' },
    noteEditorBody: {
      value: 'Alpha old Omega', selectionStart: 0, selectionEnd: 0,
      setSelectionRange() {}, dispatchEvent() {},
    },
    noteEditorTags: { value: 'work' },
    noteEditorDateBadge: { textContent: '', title: '' },
  };
  let notes = [{ id: 'n1', title: 'Doc', body: 'Alpha old Omega', tags: ['work'] }];
  let historySaved = 0;
  const s = loadFunctions([
    'eitiNotesAIUserRequestedEdit',
    'eitiNotesAIUserRequestedDelete',
    'eitiNotesAIApplyMutation',
    'eitiNotesAIPersistCurrentNote',
  ], {
    notesCurrentId: 'n1',
    document: { getElementById(id) { return elements[id] || null; } },
    notesLoad() { return notes.slice(); },
    notesSave(next) { notes = next.slice(); },
    noteHistorySave() { historySaved += 1; },
    notesTagsFromInput(value) { return value.split(',').map((x) => x.trim()).filter(Boolean); },
    noteAutoEmbed() {},
    showToast() {},
  });
  const result = s.eitiNotesAIApplyMutation(
    { action: 'replace_text', find: 'old', text: 'new' },
    { noteId: 'n1', title: 'Doc', body: 'Alpha old Omega', tags: 'work', selectionStart: 0, selectionEnd: 0, selectionText: '' },
    'Замени old на new',
  );
  assert.equal(result.ok, true);
  assert.equal(result.saved, true);
  assert.equal(elements.noteEditorBody.value, 'Alpha new Omega');
  assert.equal(notes[0].body, 'Alpha new Omega');
  assert.equal(historySaved, 1);
  const staleDelete = s.eitiNotesAIApplyMutation(
    { action: 'delete_note' },
    { noteId: 'different-note', title: 'Doc', body: 'Alpha new Omega', tags: 'work' },
    'Удали эту заметку',
  );
  assert.equal(staleDelete.ok, false);
  assert.match(staleDelete.message, /переключена/);
});
