'use strict';
// Tests for eitiCalcSalience() — the "smart memory" importance score.
// A fact's salience decides how strongly it surfaces later, so a broken
// multiplier would silently up- or down-rank memories.

const test = require('node:test');
const assert = require('node:assert');
const { loadFunctions } = require('./harness');

const { eitiCalcSalience } = loadFunctions(['eitiCalcSalience']);

function close(actual, expected, eps = 1e-9) {
  assert.ok(Math.abs(actual - expected) < eps,
    `expected ~${expected}, got ${actual}`);
}

test('neutral text scores the 1.0 baseline', () => {
  close(eitiCalcSalience('это обычный текст'), 1.0);
});

test('ALL-CAPS run of 3+ chars multiplies by 1.5 (Latin and Cyrillic)', () => {
  close(eitiCalcSalience('ABC'), 1.5);
  close(eitiCalcSalience('текст ВАЖНО'), 1.5 * 1.4); // also hits keyword "важно"
});

test('two caps do not trigger the caps rule', () => {
  close(eitiCalcSalience('идём в AB'), 1.0);
});

test('exclamation mark multiplies by 1.3', () => {
  close(eitiCalcSalience('привет!'), 1.3);
});

test('keyword multiplies by 1.4 (case-insensitive)', () => {
  close(eitiCalcSalience('это критично'), 1.4);
  // mixed case has no run of 3+ caps, so only the keyword rule fires
  close(eitiCalcSalience('ВсЕгДа делай так'), 1.4);
});

test('multipliers combine multiplicatively', () => {
  // caps (ВАЖНО) x exclamation x keyword(важно) = 1.5 * 1.3 * 1.4
  close(eitiCalcSalience('ВАЖНО!'), 1.5 * 1.3 * 1.4);
});

test('REGRESSION GUARD: the 4.0 cap is currently unreachable', () => {
  // Each rule fires at most once, so the theoretical maximum is
  // 1.5 * 1.3 * 1.4 = 2.73 — well below the Math.min(s, 4.0) cap.
  // If someone raises the multipliers, this test flags that the cap
  // now actually matters and needs revisiting.
  const maxPossible = 1.5 * 1.3 * 1.4;
  close(eitiCalcSalience('ВАЖНО КРИТИЧНО ОБЯЗАТЕЛЬНО!!!'), maxPossible);
  assert.ok(maxPossible < 4.0,
    'multipliers changed — revisit the 4.0 cap in eitiCalcSalience');
});
