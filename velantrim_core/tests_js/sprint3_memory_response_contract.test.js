const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const contractPath = path.join(__dirname, '..', '..', 'data', 'sprint3_memory_response_contract_v1.json');

function readContract() {
  return JSON.parse(fs.readFileSync(contractPath, 'utf8'));
}

test('Sprint 3 contract exposes Normal, Grounded and Strict memory modes', () => {
  const contract = readContract();
  const modes = new Map(contract.memory_modes.map((mode) => [mode.id, mode]));

  assert.deepEqual([...modes.keys()].sort(), ['grounded', 'normal', 'strict']);
  assert.equal(contract.default_state.memory_mode, 'normal');
  assert.equal(contract.default_state.memory_lookup_enabled, false);

  assert.equal(modes.get('normal').lookup_policy, 'opportunistic');
  assert.equal(modes.get('grounded').lookup_policy, 'required_when_memory_relevant');
  assert.equal(modes.get('strict').lookup_policy, 'required');
});

test('Strict mode only allows validated or immutable core facts', () => {
  const contract = readContract();
  const strict = contract.memory_modes.find((mode) => mode.id === 'strict');

  assert.ok(strict, 'strict mode must exist');
  assert.deepEqual(strict.allowed_statuses, ['validated', 'immutable_core']);
  assert.equal(strict.show_trace_by_default, true);
});

test('ESM statuses include contradiction and deprecation states', () => {
  const contract = readContract();

  for (const status of [
    'observed',
    'hypothesis',
    'supported',
    'validated',
    'contradicted',
    'deprecated',
    'immutable_core'
  ]) {
    assert.ok(contract.esm_statuses.includes(status), `missing ESM status: ${status}`);
  }
});

test('Response patterns include rewrite and think-with-me actions', () => {
  const contract = readContract();
  const patterns = new Map(contract.response_patterns.map((pattern) => [pattern.id, pattern]));

  assert.ok(patterns.has('default'));
  assert.ok(patterns.has('rewrite_variant'));
  assert.ok(patterns.has('think_with_me'));
  assert.ok(patterns.has('critic'));
  assert.ok(patterns.has('action_plan'));

  assert.match(patterns.get('rewrite_variant').label_ru, /другую версию/i);
  assert.match(patterns.get('think_with_me').label_ru, /обдумать/i);
});

test('Settings storage keys are stable and namespaced', () => {
  const contract = readContract();

  assert.equal(contract.storage_keys.memory_mode, 'eiti_memory_mode');
  assert.equal(contract.storage_keys.memory_lookup_enabled, 'eiti_memory_lookup_enabled');
  assert.equal(contract.storage_keys.response_pattern, 'eiti_response_pattern');
});
