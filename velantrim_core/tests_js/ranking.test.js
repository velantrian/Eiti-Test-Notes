'use strict';
// Tests for tfScore() — term-frequency relevance scoring used by local search.
// It is a nested function that closes over `_termRegs` (the compiled query
// terms), which we inject into the sandbox.

const test = require('node:test');
const assert = require('node:assert');
const { loadFunctions } = require('./harness');

function scorer(termRegexes) {
  const sb = loadFunctions(['tfScore'], { _termRegs: termRegexes });
  return sb.tfScore;
}

test('empty / falsy text scores 0', () => {
  const tf = scorer([/foo/g]);
  assert.strictEqual(tf(''), 0);
  assert.strictEqual(tf(null), 0);
});

test('counts every occurrence of a term', () => {
  const tf = scorer([/foo/g]);
  assert.strictEqual(tf('foo foo bar foo'), 3);
});

test('is case-insensitive via lowercasing', () => {
  const tf = scorer([/foo/g]);
  assert.strictEqual(tf('FOO Foo foo'), 3);
});

test('sums across multiple query terms', () => {
  const tf = scorer([/a/g, /b/g]);
  assert.strictEqual(tf('a a b'), 3);
});

test('normalises ё → е before matching', () => {
  // Text "ёлка" is folded to "елка", so a term regex on the е-form matches.
  const tf = scorer([/елка/g]);
  assert.strictEqual(tf('ёлка ЁЛКА'), 2);
});

test('no match scores 0', () => {
  const tf = scorer([/zzz/g]);
  assert.strictEqual(tf('nothing here'), 0);
});
