'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const OFFLINE = path.join(__dirname, 'offline');
const CORPUS = JSON.parse(fs.readFileSync(path.join(OFFLINE, 'offline_question_intent_regression_additions.json'), 'utf8'));
const DIALOGUES = JSON.parse(fs.readFileSync(path.join(OFFLINE, 'offline_question_dialogue_regression_additions.json'), 'utf8'));
const BASELINE_PATH = path.join(OFFLINE, 'offline_question_intent_parser_baseline.csv');
const F = require(path.join(ROOT, 'local', 'eiti_frames.js'));
const PACK = JSON.parse(fs.readFileSync(path.join(ROOT, 'local', 'eiti_frames.json'), 'utf8'));
F.load(PACK);

function parseCsv(text) {
  const records = [];
  let record = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field === '') quoted = true;
    else if (ch === ',') { record.push(field); field = ''; }
    else if (ch === '\n') { record.push(field); records.push(record); record = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (quoted) throw new Error('Unclosed quoted CSV field');
  if (field.length || record.length) { record.push(field); records.push(record); }
  return records;
}

function normalizedPhrase(text) {
  return text.normalize('NFKC').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' ').trim();
}

test('offline audit corpus: unique synthetic phrases and semantic labels', () => {
  assert.ok(Array.isArray(CORPUS));
  assert.equal(CORPUS.length, 130);
  const seen = new Set();
  for (const item of CORPUS) {
    assert.equal(typeof item.phrase, 'string');
    assert.ok(item.phrase.trim());
    assert.equal(typeof item.expect?.intent, 'string');
    assert.ok(item.expect.intent.trim());
    assert.equal(typeof item.expect.topic, 'string');
    assert.equal(item.src, 'own');
    const key = normalizedPhrase(item.phrase);
    assert.ok(!seen.has(key), 'duplicate phrase: ' + item.phrase);
    seen.add(key);
  }
});

test('offline dialogue candidates: multi-turn schema and semantic labels', () => {
  assert.equal(DIALOGUES.schema, 'eiti.dialogue-review-candidates.v1');
  assert.ok(Array.isArray(DIALOGUES.cases));
  assert.equal(DIALOGUES.cases.length, 7);
  const ids = new Set();
  for (const item of DIALOGUES.cases) {
    assert.equal(typeof item.id, 'string');
    assert.ok(item.id.trim());
    assert.ok(!ids.has(item.id), 'duplicate dialogue id: ' + item.id);
    ids.add(item.id);
    assert.equal(item.src, 'own');
    assert.equal(typeof item.expect?.intent, 'string');
    assert.equal(typeof item.expect.topic, 'string');
    assert.ok(Array.isArray(item.turns));
    assert.ok(item.turns.filter((turn) => turn.role === 'user').length >= 2);
    assert.ok(item.turns.some((turn) => turn.role === 'assistant'));
    assert.equal(item.turns[item.turns.length - 1].role, 'user');
    for (const turn of item.turns) {
      assert.ok(['user', 'assistant'].includes(turn.role));
      assert.equal(typeof turn.text, 'string');
      assert.ok(turn.text.trim());
    }
  }
});

test('offline parser baseline: CSV matches the source corpus and current parser', () => {
  const raw = fs.readFileSync(BASELINE_PATH, 'utf8').replace(/^\uFEFF/, '');
  const rows = parseCsv(raw);
  const header = rows.shift();
  assert.deepEqual(header, ['phrase', 'expected_semantic_alias', 'current_intent', 'current_kind', 'current_family', 'current_topic']);
  assert.equal(rows.length, CORPUS.length);

  for (let i = 0; i < CORPUS.length; i++) {
    const item = CORPUS[i];
    const baseline = rows[i];
    assert.equal(baseline.length, header.length, 'CSV column count at row ' + (i + 2));
    assert.equal(baseline[0], item.phrase, 'CSV phrase/order at row ' + (i + 2));
    assert.equal(baseline[1], item.expect.intent, 'semantic alias at row ' + (i + 2));

    // expected.intent is a target semantic alias, not a claim that Frames already emits that ID.
    const parsed = F.parse(item.phrase, F.create(), Date.now());
    const current = parsed
      ? [parsed.intent || '', parsed.kind || '', parsed.fam || '', parsed.topic || '']
      : ['', '', '', ''];
    assert.deepEqual(baseline.slice(2), current, 'current parser result at row ' + (i + 2) + ': ' + item.phrase);
  }
});
