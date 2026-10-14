'use strict';
// Tests for the proactive-recommendation pure cores — the "это подходит к
// твоему проекту?" feature. When a file is saved, EITI tokenises it, scores
// overlap against existing notes/facts, and offers to connect or enrich. The
// scoring + ranking + message are the logic worth pinning; the IDB gather and
// the chat render are thin wrappers left to integration.

const test = require('node:test');
const assert = require('node:assert');
const { loadFunctions } = require('./harness');

// eitiRecTokenize references the module-level REC_STOP stoplist as a free var,
// so we inject an equivalent here.
const REC_STOP = {
  и: 1, в: 1, на: 1, с: 1, по: 1, а: 1, но: 1, для: 1, это: 1, как: 1, что: 1,
  из: 1, то: 1, же: 1, бы: 1, или: 1,
  the: 1, a: 1, an: 1, of: 1, to: 1, and: 1, in: 1, is: 1, it: 1, for: 1, on: 1, with: 1,
};

const rec = loadFunctions(
  ['eitiRecTokenize', 'eitiRecOverlapScore', 'eitiRecFindRelated', 'eitiRecSuggestText'],
  { REC_STOP, Math }
);

test('tokenize lowercases, drops short words/stopwords, normalises ё→е', () => {
  const t = rec.eitiRecTokenize('Проект про ЁЛКУ и AI для дома');
  assert.ok(t.includes('проект'));
  assert.ok(t.includes('елку'));   // ё → е
  assert.ok(t.includes('дома'));
  assert.ok(!t.includes('и'));     // stopword
  assert.ok(!t.includes('для'));   // stopword
  assert.ok(!t.includes('ai'));    // length < 3
});

test('overlap score is Jaccard and duplicate-insensitive', () => {
  const a = rec.eitiRecTokenize('кошка собака попугай');
  const b = rec.eitiRecTokenize('кошка собака собака рыбка');
  // intersection {кошка,собака}=2, union {кошка,собака,попугай,рыбка}=4 → 0.5
  assert.strictEqual(rec.eitiRecOverlapScore(a, b), 0.5);
});

test('no overlap → 0; empty inputs → 0', () => {
  assert.strictEqual(rec.eitiRecOverlapScore(['x'], ['y']), 0);
  assert.strictEqual(rec.eitiRecOverlapScore([], ['y']), 0);
  assert.strictEqual(rec.eitiRecOverlapScore(['x'], []), 0);
});

test('findRelated ranks by score, applies threshold and limit', () => {
  const candidates = [
    { id: 'n1', title: 'План проекта', body: 'архитектура памяти и поиск' },
    { id: 'n2', title: 'Рецепт борща', body: 'свёкла капуста мясо' },
    { id: 'n3', title: 'Заметка', body: 'память поиск граф знаний' },
  ];
  const fileText = 'память поиск архитектура проекта';
  const related = rec.eitiRecFindRelated(fileText, candidates, { threshold: 0.05, limit: 2 });
  assert.strictEqual(related.length, 2, 'limit respected');
  // The borscht note shares nothing → must be excluded by the threshold.
  assert.ok(!related.some((r) => r.item.id === 'n2'));
  // Results sorted descending by score.
  assert.ok(related[0].score >= related[1].score);
});

test('findRelated with no candidates returns empty', () => {
  assert.deepStrictEqual(rec.eitiRecFindRelated('что угодно', []), []);
});

test('suggestText names the file and lists matches with percentages', () => {
  const msg = rec.eitiRecSuggestText(
    { name: 'plan.md' },
    [{ item: { title: 'Архитектура памяти' }, score: 0.42 }]
  );
  assert.match(msg, /plan\.md/);
  assert.match(msg, /Архитектура памяти/);
  assert.match(msg, /42%/);
  assert.match(msg, /подходит к твоему проекту/);
});

test('suggestText with no related → empty string (stay silent)', () => {
  assert.strictEqual(rec.eitiRecSuggestText({ name: 'x' }, []), '');
});

// eitiRecGatherCandidates pulls from notes + learned facts + USER FILES so that
// saving a file can be matched against everything the user has. System snapshot
// files (chat_latest.txt etc.) must be excluded.
test('gatherCandidates includes notes, facts and user files (skips system files)', () => {
  const sb = loadFunctions(['eitiRecGatherCandidates'], {
    window: {
      notesLoad: () => [{ id: 'n1', title: 'note' }],
      eitiLearnGet: () => [{ id: 'f1', fact: 'fact' }],
      getAiTextStore: () => ({
        files: [
          { name: 'plan.md', content: 'user file' },
          { name: 'chat_latest.txt', content: 'system snapshot' },
        ],
      }),
      isUserFile: (f) => f.name !== 'chat_latest.txt',
    },
  });
  const got = sb.eitiRecGatherCandidates();
  const names = got.map((c) => c.name || c.title || c.fact);
  assert.ok(names.includes('note'), 'notes included');
  assert.ok(names.includes('fact'), 'facts included');
  assert.ok(names.includes('plan.md'), 'user file included');
  assert.ok(!names.includes('chat_latest.txt'), 'system snapshot excluded');
});

test('gatherCandidates is resilient when sources are missing', () => {
  const sb = loadFunctions(['eitiRecGatherCandidates'], { window: {} });
  assert.deepStrictEqual([...sb.eitiRecGatherCandidates()], []);
});
