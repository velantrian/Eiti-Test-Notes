'use strict';
// Tests for _cosineSim() — the core similarity metric behind semantic search.
// A bug here means semantic search silently returns garbage ranking.

const test = require('node:test');
const assert = require('node:assert');
const { loadFunctions } = require('./harness');

const { _cosineSim } = loadFunctions(['_cosineSim']);

function close(actual, expected, eps = 1e-9) {
  assert.ok(Math.abs(actual - expected) < eps,
    `expected ~${expected}, got ${actual}`);
}

test('identical vectors → 1.0', () => {
  close(_cosineSim([1, 2, 3], [1, 2, 3]), 1.0);
});

test('orthogonal vectors → 0', () => {
  close(_cosineSim([1, 0], [0, 1]), 0);
});

test('opposite vectors → -1', () => {
  close(_cosineSim([1, 0], [-1, 0]), -1);
});

test('zero vector is guarded → 0 (no NaN/division by zero)', () => {
  assert.strictEqual(_cosineSim([0, 0], [1, 1]), 0);
  assert.strictEqual(_cosineSim([1, 1], [0, 0]), 0);
});

test('scaled vector is still maximally similar', () => {
  close(_cosineSim([1, 2, 3], [2, 4, 6]), 1.0);
});

test('DOCUMENTS edge case: b shorter than a → 0, not NaN', () => {
  // The loop runs to a.length. With b shorter, b[i] is undefined so the
  // running norm `nb` becomes NaN, and the `(na && nb)` guard treats NaN as
  // falsy → returns 0. So a length mismatch degrades to "no similarity"
  // rather than leaking NaN. Pinned so a future change is deliberate.
  assert.strictEqual(_cosineSim([1, 2], [1]), 0);
});

test('DOCUMENTS edge case: b longer than a → scored on the common prefix', () => {
  // Extra trailing elements of b are silently ignored (loop stops at a.length).
  assert.strictEqual(_cosineSim([1, 0], [1, 0, 99]), 1);
});
