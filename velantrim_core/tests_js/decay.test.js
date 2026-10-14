'use strict';
// Tests for _pkgApplyDecayAll() — the fractal-memory weight decay.
// Formula: weight *= PKG_DECAY_PER_DAY ^ floor(daysSinceLastDecay), floored at 0.1.
// If decay drifts, important nodes fade too fast (or never), corrupting recall.

const test = require('node:test');
const assert = require('node:assert');
const { loadFunctions } = require('./harness');

const DAY = 86400000;
const NOW = 1_700_000_000_000; // fixed clock

// A no-op IndexedDB stub: the weight mutation happens on the cache objects
// *before* the put(), so we assert on the cache and ignore persistence.
function fakeDb() {
  return { transaction: () => ({ objectStore: () => ({ put() {} }) }) };
}

// Invoke the extracted function inside the sandbox and return the mutated cache.
function decay(cache) {
  const sb = loadFunctions(['_pkgApplyDecayAll'], {
    _pkgCache: cache,
    eitiDb: fakeDb(),
    PKG_DECAY_PER_DAY: 0.97,
    Date: { now: () => NOW },
  });
  sb._pkgApplyDecayAll();
  return cache;
}

test('less than a day passed → weight unchanged', () => {
  const c = { a: { id: 'a', weight: 5.0, lastDecay: NOW } };
  decay(c);
  assert.strictEqual(c.a.weight, 5.0);
});

test('one day → weight *= 0.97', () => {
  const c = { a: { id: 'a', weight: 1.0, lastDecay: NOW - DAY } };
  decay(c);
  assert.strictEqual(c.a.weight, 0.97);
});

test('ten days → 0.97^10, rounded to 3 decimals', () => {
  const c = { a: { id: 'a', weight: 1.0, lastDecay: NOW - 10 * DAY } };
  decay(c);
  assert.strictEqual(c.a.weight, parseFloat((Math.pow(0.97, 10)).toFixed(3)));
  assert.strictEqual(c.a.weight, 0.737);
});

test('very old node is floored at 0.1, never zero', () => {
  const c = { a: { id: 'a', weight: 1.0, lastDecay: NOW - 1000 * DAY } };
  decay(c);
  assert.strictEqual(c.a.weight, 0.1);
});

test('lastDecay is advanced to now after decay', () => {
  const c = { a: { id: 'a', weight: 1.0, lastDecay: NOW - 3 * DAY } };
  decay(c);
  assert.strictEqual(c.a.lastDecay, NOW);
});

test('missing lastDecay falls back to lastSeen', () => {
  const c = { a: { id: 'a', weight: 1.0, lastSeen: NOW - 2 * DAY } };
  decay(c);
  assert.strictEqual(c.a.weight, parseFloat((Math.pow(0.97, 2)).toFixed(3)));
});
