// EitiVoice P0-2: совместимость — модуль только дополняет window.EitiVoice, старый API не меняется
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const M = require('../../local/eiti_voice.js');
const ROOT = path.join(__dirname, '../..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

test('install() keeps every existing method intact', () => {
  const orig = { start() { return 'S'; }, stop() {}, mute() {}, isActive() { return false; }, label() { return 'X'; }, needs() { return ''; },
    offerSwitch() {}, tr() {}, ids() { return []; }, current() { return 'grok'; }, active() { return ''; }, providers: {} };
  const legacy = Object.assign({}, orig);
  M.install({ EitiVoice: legacy, navigator: {} });
  Object.keys(orig).forEach((k) => assert.strictEqual(legacy[k], orig[k], k));
  ['state', 'on', 'off', 'caps', 'requestMic', 'fallbackOrder', 'reconnect', 'fallback'].forEach((k) => assert.strictEqual(typeof legacy[k], 'function', k));
  assert.strictEqual(legacy.version, 1);
});
test('install() without legacy registry does not throw', () => {
  const win = { navigator: {} };
  M.install(win);
  assert.ok(win.EitiVoiceCore);
});
test('index.html loads the module and keeps a fallback when it is missing', () => {
  assert.ok(HTML.includes('<script src="./local/eiti_voice.js" defer></script>'));
  const i = HTML.indexOf('function eitiVoiceMic(');
  const body = HTML.slice(i, HTML.indexOf('window.eitiVoiceMic', i));
  assert.match(body, /navigator\.mediaDevices\.getUserMedia\(c\)/);
  assert.strictEqual((HTML.match(/navigator\.mediaDevices\.getUserMedia\(\{ audio/g) || []).length, 0, 'all voice providers use eitiVoiceMic');
  assert.strictEqual((HTML.match(/eitiVoiceMic\(\{ audio/g) || []).length, 5);
});
test('sw.js precaches the module; module does not touch localStorage', () => {
  assert.ok(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').includes("BASE + 'local/eiti_voice.js'"));
  assert.ok(!/localStorage/.test(fs.readFileSync(path.join(ROOT, 'local/eiti_voice.js'), 'utf8').replace(/\/\/.*$/gm, '')));
});
