'use strict';
// Tests for eitiTaskParseAICommands() — parses [TASK_*] directives out of an
// LLM reply and dispatches them. The regex parsing is the bug-prone part
// (delimiters, optional fields), so we stub the dispatch targets and assert on
// the parsed arguments.

const test = require('node:test');
const assert = require('node:assert');
const { loadFunctions } = require('./harness');

function makeParser() {
  const calls = { add: [], move: [], update: [], del: [] };
  const sb = loadFunctions(['eitiTaskParseAICommands'], {
    eitiTaskAdd: (...a) => calls.add.push(a),
    eitiTaskMove: (...a) => calls.move.push(a),
    eitiTaskUpdate: (...a) => calls.update.push(a),
    eitiTaskDelete: (...a) => { calls.del.push(a); return { then: () => {} }; },
    eitiRenderBoard: () => {},
    showToast: () => {},
    document: { getElementById: () => null },
  });
  return { parse: sb.eitiTaskParseAICommands, calls };
}

test('falsy text does nothing', () => {
  const { parse, calls } = makeParser();
  parse('');
  assert.deepStrictEqual(calls.add, []);
});

test('TASK_ADD parses all six fields and trims them', () => {
  const { parse, calls } = makeParser();
  parse('text [TASK_ADD: todo | Купить хлеб | описание | 2026-01-01 | high | дом,еда ] tail');
  assert.strictEqual(calls.add.length, 1);
  assert.deepStrictEqual(calls.add[0],
    ['todo', 'Купить хлеб', 'описание', '2026-01-01', 'high', 'дом,еда']);
});

test('TASK_ADD: empty date → null and empty priority → "medium"', () => {
  const { parse, calls } = makeParser();
  parse('[TASK_ADD:todo|Заголовок|||| ]');
  assert.deepStrictEqual(calls.add[0],
    ['todo', 'Заголовок', '', null, 'medium', '']);
});

test('TASK_MOVE parses id (string) and status', () => {
  const { parse, calls } = makeParser();
  parse('[TASK_MOVE:42|done]');
  assert.deepStrictEqual(calls.move[0], ['42', 'done']);
});

test('TASK_UPDATE parses id, field and value', () => {
  const { parse, calls } = makeParser();
  parse('[TASK_UPDATE:7|priority=high]');
  assert.deepStrictEqual(calls.update[0], ['7', 'priority', 'high']);
});

test('TASK_DEL parses id and tolerates the returned promise', () => {
  const { parse, calls } = makeParser();
  parse('[TASK_DEL:9]');
  assert.deepStrictEqual(calls.del[0], ['9']);
});

test('multiple commands in one reply all fire', () => {
  const { parse, calls } = makeParser();
  parse('[TASK_ADD:todo|A|||med|] and [TASK_MOVE:1|done] and [TASK_DEL:2]');
  assert.strictEqual(calls.add.length, 1);
  assert.strictEqual(calls.move.length, 1);
  assert.strictEqual(calls.del.length, 1);
});
