'use strict';
// Tests for _embedOffline() — turns text into vectors via the local model.
// We inject a fake window.eitiSemanticModel so we can verify the contract
// (text truncation, pooling/normalize options, plain-Array output, error path)
// without loading a real transformer.

const test = require('node:test');
const assert = require('node:assert');
const { loadFunctions } = require('./harness');

function load(model) {
  const sb = loadFunctions(['_embedOffline'], { window: { eitiSemanticModel: model } });
  return sb._embedOffline;
}

test('embeds each text and returns plain arrays', async () => {
  const calls = [];
  const embed = load(async (text, opts) => {
    calls.push({ text, opts });
    return { data: new Float32Array([0.1, 0.2, 0.3]) };
  });
  const out = await embed(['hello', 'world']);
  assert.strictEqual(out.length, 2);
  assert.ok(Array.isArray(out[0]), 'must convert typed array to plain Array');
  assert.deepStrictEqual(out[0], [0.1, 0.2, 0.3].map(Math.fround));
  assert.strictEqual(calls.length, 2);
});

test('passes mean pooling + normalize options', async () => {
  let seen;
  const embed = load(async (text, opts) => { seen = opts; return { data: new Float32Array([1]) }; });
  await embed(['x']);
  // `seen` is created inside the vm realm, so compare fields, not prototype.
  assert.strictEqual(seen.pooling, 'mean');
  assert.strictEqual(seen.normalize, true);
});

test('truncates input to 512 characters', async () => {
  let seenText;
  const embed = load(async (text) => { seenText = text; return { data: new Float32Array([1]) }; });
  await embed(['a'.repeat(1000)]);
  assert.strictEqual(seenText.length, 512);
});

test('throws a clear error when no offline model is loaded', async () => {
  const embed = load(undefined);
  await assert.rejects(() => embed(['x']), /офлайн-модели/);
});
