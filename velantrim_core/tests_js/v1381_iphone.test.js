'use strict';
// v13.8.1: подсказка установки — iPadOS (MacIntel + touch), Chrome/Firefox/Edge на iOS.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions } = require('./harness');

const { eitiInstallHintText: hint } = loadFunctions(['eitiInstallHintText']);
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';

test('iPhone Safari → Share внизу', () => {
  assert.equal(hint(IPHONE, 'iPhone', 5), 'Safari: нажми □↑ внизу → «На экран Домой»');
});
test('iPadOS (выдаёт себя за Mac) → iPad, Share вверху; обычный Mac → нет подсказки', () => {
  assert.equal(hint(MAC, 'MacIntel', 5), 'Safari: нажми □↑ вверху → «На экран Домой»');
  assert.equal(hint(MAC, 'MacIntel', 0), null);
});
test('Chrome/Firefox/Edge на iOS называются правильно, а не «Safari»', () => {
  assert.match(hint(IPHONE.replace('Version/17.5', 'CriOS/129.0'), 'iPhone', 5), /^Chrome на iPhone/);
  assert.match(hint(IPHONE.replace('Version/17.5', 'FxiOS/131.0'), 'iPhone', 5), /^Firefox на iPhone/);
  assert.match(hint(IPHONE.replace('Version/17.5', 'EdgiOS/129.0'), 'iPhone', 5), /^Edge на iPhone/);
  assert.match(hint(MAC + ' CriOS/129.0', 'MacIntel', 5), /^Chrome на iPad/);
});
test('Android-браузеры без изменений', () => {
  assert.match(hint('Mozilla/5.0 (Linux; Android 14) SamsungBrowser/25.0 Chrome/121', 'Linux', 5), /^Samsung Internet/);
  assert.match(hint('Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0', 'Linux', 5), /^Firefox: нажми ⋮/);
  assert.equal(hint('Mozilla/5.0 (Linux; Android 14) Chrome/129 Mobile Safari/537.36', 'Linux', 5), null);
});
