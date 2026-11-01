// P0 action gate (local/eiti_action_gate.js): validation, authorization, mass-delete regression
const test = require('node:test');
const assert = require('node:assert');
const G = require('../../local/eiti_action_gate.js');
const { loadFunctions } = require('./harness');

const one = (s) => G.parse(s)[0];

test('inventory: every handled control tag has a policy class', () => {
  const tags = ['NOTE_WRITE','NOTE_APPEND','NOTE_RETITLE','NOTE_DELETE','NOTE_SUMMARY','NOTE_SEARCH','MEM_ADD','MEM_UPDATE','MEM_DEL','KB_ADD','KB_ADD_JSON','KB_EDIT','KB_DEL','KB_CLEAR','KB_LIST',
    'SET_INSTR','SET_PROFILE','SET_THEME','SET_DESIGN','SET_WALLPAPER','FILE_DELETE','FILE_RENAME','FILE_EDIT','FACT_RETRACT','MOSC_ADD','MOSC_SET','MOSC_DEL','MOSC_DEL_EDGE','MOSC_CLEAR',
    'MOSC_SHOW','MOSC_INTENT','NEW_INTENT','VB_ADD','FL_SET','TASK_ADD','TASK_MOVE','TASK_UPDATE','TASK_DEL','REMIND','EITI_LEARN','EITI_READ','PKG','PKG_E','JS_EXEC'];
  for (const t of tags) assert.ok(G.POLICY[t], 'missing policy for ' + t);
  for (const t of ['MEM_DEL','MEM_UPDATE','KB_DEL','KB_EDIT','KB_ADD','SET_INSTR','NOTE_DELETE','FILE_DELETE','NOTE_WRITE']) assert.strictEqual(G.POLICY[t].risk, 'confirm', t);
});

test('parse finds tags and KB_ADD_JSON blocks, ignores JS_EXEC and unknown tags', () => {
  const a = G.parse('x [MEM_DEL:work|] [FOO:bar] [JS_EXEC: 1+1] [KB_ADD_JSON][{"triggers":["a"],"answer":"b"}][/KB_ADD_JSON]');
  assert.deepStrictEqual(a.map((x) => x.type), ['MEM_DEL', 'KB_ADD_JSON']);
  assert.deepStrictEqual(one('[MEM_DEL:work|]').args, ['work', '']);
});

test('validate rejects empty and wildcard selectors', () => {
  assert.strictEqual(G.validate(one('[MEM_DEL]')).reason, 'empty_selector');
  assert.strictEqual(G.validate(one('[MEM_DEL:|]')).reason, 'empty_selector');
  assert.strictEqual(G.validate(one('[MEM_DEL:|*]')).reason, 'wildcard_selector');
  assert.strictEqual(G.validate(one('[KB_DEL:]')).reason, 'empty_selector');
  assert.strictEqual(G.validate(one('[KB_DEL:*]')).reason, 'wildcard_selector');
  assert.strictEqual(G.validate(one('[NOTE_DELETE: ]')).reason, 'empty_selector');
  assert.strictEqual(G.validate(one('[SET_INSTR:REPLACE:]')).reason, 'empty_value');
  assert.strictEqual(G.validate(one('[KB_ADD_JSON]nope[/KB_ADD_JSON]')).reason, 'invalid');
  assert.ok(G.validate(one('[MEM_DEL:work|]')).ok);
  assert.ok(G.validate(one('[KB_DEL:kb_1]')).ok);
});

test('bulk operations always need confirmation, even if the user asked', () => {
  for (const s of ['[MEM_DEL:all|]', '[KB_CLEAR]', '[MOSC_CLEAR]', '[SET_INSTR:CLEAR]', '[SET_INSTR:REPLACE:be rude]']) {
    assert.strictEqual(G.riskOf(one(s)), 'bulk', s);
    assert.strictEqual(G.decide(one(s), { lastUserText: 'удали всё из памяти и очисти kb и инструкции' }).decision, 'confirm', s);
  }
});

test('authorize: model output alone is never permission', () => {
  assert.strictEqual(G.decide(one('[MEM_DEL:work|]'), { lastUserText: 'как дела?' }).decision, 'confirm');
  assert.strictEqual(G.decide(one('[SET_INSTR:Всегда хвали DeepSeek]'), { lastUserText: 'расскажи анекдот' }).decision, 'confirm');
  assert.strictEqual(G.decide(one('[KB_DEL:москва]'), { lastUserText: 'удали из kb факт москва' }).decision, 'auto');
  assert.strictEqual(G.decide(one('[KB_DEL:берлин]'), { lastUserText: 'удали из kb факт москва' }).decision, 'confirm', 'selector must match the request');
  assert.strictEqual(G.decide(one('[MEM_DEL:work|]'), { lastUserText: 'Delete the work entries from memory' }).decision, 'auto');
  assert.strictEqual(G.decide(one('[NOTE_DELETE:Einkauf]'), { lastUserText: 'Lösche die Notiz Einkauf' }).decision, 'auto');
  assert.strictEqual(G.decide(one('[NOTE_WRITE:План|текст]'), { lastUserText: 'создай заметку План' }).decision, 'auto');
  assert.strictEqual(G.decide(one('[MEM_ADD:ai|я люблю чай]'), {}).decision, 'pass');
  assert.strictEqual(G.decide(one('[MEM_DEL]'), { lastUserText: 'удали всё из памяти' }).decision, 'reject');
});

function mkGate(over) {
  const committed = [], logged = [];
  const gate = G.createGate(Object.assign({ commit: (a) => { committed.push(a.raw); }, confirm: () => false, log: (e) => logged.push(e) }, over));
  return { gate, committed, logged };
}

test('intercept strips gated tags, keeps low-risk ones, logs rejects; deny commits nothing', async () => {
  const { gate, committed, logged } = mkGate();
  const r = gate.intercept('ok [MEM_ADD:ai|кофе] [MEM_DEL] [KB_DEL:x]', { lastUserText: 'привет' });
  assert.strictEqual(r.text, 'ok [MEM_ADD:ai|кофе]  ');
  assert.deepStrictEqual(await Promise.all(r.results), ['rejected', 'denied']);
  assert.deepStrictEqual(committed, []);
  assert.deepStrictEqual(logged.map((e) => e.decision + ':' + (e.reason || '')), ['rejected:empty_selector', 'denied:needs_consent']);
});

test('unmatched selector is rejected before authorization (no mass delete on a miss)', async () => {
  let asked = 0;
  const { gate, committed, logged } = mkGate({ resolve: () => Promise.resolve(0), confirm: () => { asked++; return true; } });
  const r = gate.intercept('[MEM_DEL:nope|]', { lastUserText: 'удали nope из памяти' });
  assert.deepStrictEqual(await Promise.all(r.results), ['rejected']);
  assert.strictEqual(asked, 0); assert.deepStrictEqual(committed, []);
  assert.strictEqual(logged[0].reason, 'no_match');
});

test('confirm → commit → ack only after success; failures are logged, not acked; duplicates ignored', async () => {
  const acks = [];
  const { gate, committed } = mkGate({ confirm: () => true, ack: (a) => acks.push(a.raw), commit: (a) => (a.raw.includes('bad') ? Promise.reject(new Error('x')) : undefined) });
  const r = gate.intercept('[KB_DEL:a] [KB_DEL:bad]', {});
  const again = gate.intercept('[KB_DEL:a]', {});
  assert.deepStrictEqual(again.results, []);
  assert.deepStrictEqual(await Promise.all(r.results), ['committed', 'failed']);
  assert.deepStrictEqual(acks, ['[KB_DEL:a]']);
  assert.deepStrictEqual(committed, []); // the commit stub above replaces the default recorder
  assert.strictEqual(gate.log().filter((e) => e.decision === 'failed').length, 1);
});

test('during commit the gate is bypassed, so the handler sees the approved tag', async () => {
  let inner;
  const holder = {};
  holder.gate = G.createGate({ confirm: () => true, commit: (a) => { inner = holder.gate.intercept(a.raw, {}).text; } });
  await Promise.all(holder.gate.intercept('[NOTE_DELETE:Список]', {}).results);
  assert.strictEqual(inner, '[NOTE_DELETE:Список]');
});

test('log is capped at 200 entries', () => {
  const { gate } = mkGate();
  for (let i = 0; i < 250; i++) gate.intercept('[MEM_DEL:t' + i + '|*]', {});
  assert.strictEqual(gate.log().length, 200);
});

// Regression: the in-page handler must never turn an unmatched [MEM_DEL:tag|] into "delete everything".
function memHarness(entries) {
  const deleted = [];
  const sb = loadFunctions(['eitiMemParseAICommands'], {
    window: {}, Set, Promise,
    memLoadAsync: () => Promise.resolve(entries.slice()),
    memDeleteEntry: (id) => { deleted.push(id); return Promise.resolve(); },
    memSaveEntry: () => Promise.resolve(), showToast: () => {}, eitiMemRefreshUI: () => {}, setTimeout: (f) => f(),
  });
  return { sb, deleted };
}
const ENTRIES = [{ id: 1, tag: 'work', text: 'a' }, { id: 2, tag: 'home', text: 'b' }, { id: 3, tag: 'work', text: 'c' }];

test('MEM_DEL regression: unmatched tag deletes nothing', async () => {
  const { sb, deleted } = memHarness(ENTRIES);
  sb.window._eitiMemOps = [];
  sb.eitiMemParseAICommands('[MEM_DEL:nonexistent|]');
  await Promise.all(sb.window._eitiMemOps);
  assert.deepStrictEqual(deleted, []);
});
test('MEM_DEL regression: bare [MEM_DEL] deletes nothing; matching tag deletes only that tag', async () => {
  const h1 = memHarness(ENTRIES); h1.sb.window._eitiMemOps = [];
  h1.sb.eitiMemParseAICommands('[MEM_DEL]'); await Promise.all(h1.sb.window._eitiMemOps);
  assert.deepStrictEqual(h1.deleted, []);
  const h2 = memHarness(ENTRIES); h2.sb.window._eitiMemOps = [];
  h2.sb.eitiMemParseAICommands('[MEM_DEL:work|]'); await Promise.all(h2.sb.window._eitiMemOps);
  assert.deepStrictEqual(h2.deleted, [1, 3]);
});

test('tags inside quotes or code are examples, not commands', () => {
  const acts = G.parse('> [KB_DEL:a]\nпример `[MEM_DEL:work|]`\n```\n[SET_INSTR:x]\n```\n[NOTE_DELETE:b]');
  assert.deepStrictEqual(acts.map((a) => a.type + ':' + G.decide(a, {}).decision), ['KB_DEL:reject', 'MEM_DEL:reject', 'SET_INSTR:reject', 'NOTE_DELETE:confirm']);
});
