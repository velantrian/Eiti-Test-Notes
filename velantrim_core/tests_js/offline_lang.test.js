// v14.4.0: offline replies follow the app/message language — EITI Local templates (ru/en/de),
// German calculator/notes, German dialog layer (offline/eiti_offline_de.js) on top of the dialogs engine.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const L = require(path.join(ROOT, 'local', 'eiti_local.js'));
const DE = require(path.join(ROOT, 'offline', 'eiti_offline_de.js'));
const E = require(path.join(ROOT, 'offline', 'eiti_offline_dialogs.js'));
const CORE = require(path.join(ROOT, 'offline', 'core.json'));

const NOW = new Date(2026, 9, 23, 12, 0).getTime();
const DATA = {
  notes: [{ id: 'n1', title: 'Kater', body: 'Tierarzt am Mittwoch', created: NOW - 3600e3, tags: ['katze'] },
          { id: 'n2', title: 'Покупки', body: 'молоко хлеб', created: NOW - 2 * 86400e3 }],
  files: [{ name: 'plan.txt', content: 'hallo welt', size: 2048 }]
};
const R = (q, lang) => { const r = L.reply(q, DATA, NOW, lang ? { lang } : undefined); return r && r.text; };
const CYR = /[а-яё]/i;

test('calculator: German words and operators', () => {
  assert.strictEqual(R('was ist sieben mal acht', 'de'), '7 × 8 = 56');
  assert.strictEqual(R('zwanzig prozent von dreihundert', 'de'), '20% von 300 = 60');
  assert.strictEqual(R('einundzwanzig plus neun', 'de'), '21 + 9 = 30');
  assert.strictEqual(R('zweihundertfünfzig minus fünfzig', 'de'), '250 − 50 = 200');
  assert.strictEqual(R('wurzel aus neun', 'de'), '√9 = 3');
});

test('calculator: number formatting and errors per language', () => {
  assert.strictEqual(R('12345,5 + 1', 'de'), '12.345,5 + 1 = 12.346,5');
  assert.strictEqual(R('12345.5 + 1', 'en'), '12,345.5 + 1 = 12,346.5');
  assert.match(R('10 / 0', 'de'), /Division durch null/);
  assert.match(R('10 / 0', 'en'), /division by zero/);
  assert.match(R('10 / 0', 'ru'), /на ноль делить нельзя/);
  assert.match(R('10 / 0'), /на ноль делить нельзя/, 'digits only, no lang → Russian as before');
});

test('notes/files: same question, three languages', () => {
  assert.match(R('сколько у меня заметок', 'ru'), /^У тебя 2 заметки/);
  assert.match(R('сколько у меня заметок', 'en'), /^You have 2 notes/);
  assert.match(R('сколько у меня заметок', 'de'), /^Du hast 2 Notizen/);
  assert.match(R('how many notes do i have', 'de'), /^Du hast 2 Notizen/);
  assert.match(R('how many files do i have', 'de'), /^Du hast 1 Datei \(2 KB\)/);
  for (const lang of ['en', 'de']) for (const q of ['сколько у меня заметок', 'последняя заметка', 'сколько весят мои файлы']) {
    const t = R(q, lang); assert.ok(t, q); assert.ok(!CYR.test(t.replace(/Покупки|молоко хлеб/g, '')), lang + ': ' + t);
  }
});

test('notes: German questions are understood (and answer in German without lang)', () => {
  assert.match(R('wie viele notizen habe ich'), /^Du hast 2 Notizen/);
  assert.match(R('meine letzte notiz', 'de'), /^Deine neueste Notiz:\n• \*\*Kater\*\*/);
  assert.match(R('finde in meinen notizen tierarzt', 'de'), /^1 Notiz zu „tierarzt“ gefunden/);
  assert.match(R('notizen mit tag katze', 'de'), /^Notizen mit dem Tag #katze — 1/);
  assert.match(R('was habe ich heute notiert', 'de'), /^Notizen, erstellt heute — 1/);
  assert.match(R('wie viel speicher belegen meine dateien', 'de'), /^Deine Dateien belegen 2 KB/);
});

test('Russian behaviour unchanged without lang', () => {
  assert.match(R('сколько у меня заметок'), /^У тебя 2 заметки/);
  assert.match(R('how many notes do i have'), /^You have 2 notes/);
  assert.strictEqual(R('два умножить на три'), '2 × 3 = 6');
});

test('DE: language detection', () => {
  assert.ok(DE.isGerman('hallo, wie geht es dir?'));
  assert.ok(DE.isGerman('kannst du mir helfen'));
  assert.ok(DE.isGerman('Grüße'));
  assert.ok(!DE.isGerman('hello, how are you?'));
  assert.ok(!DE.isGerman('привет'));
  assert.ok(DE.isEnglish('hello, how are you?'));
  assert.ok(!DE.isEnglish('wie geht es dir'));
});

test('DE: core intents get hand-written German replies, the rest falls back to English', () => {
  const cases = { 'hallo': 'greet_hi', 'guten morgen': 'greet_morning', 'wie geht es dir?': 'howdy', 'danke': 'thanks',
    'tschüss': 'bye', 'wer bist du': 'who_are_you', 'was kannst du': 'app_what_can', 'kannst du mir helfen': 'app_what_can', 'gute nacht': 'goodnight' };
  for (const [q, id] of Object.entries(cases)) {
    const eng = E.create(CORE, { seed: 1 });
    const en = DE.toEn(q); assert.ok(en, q);
    const r = eng.reply(en); assert.strictEqual(r.intent, id, q);
    const t = DE.localize(r.intent, r.text);
    assert.ok(t && !CYR.test(t) && !/\b(the|you|your|Hi|Hello)\b/.test(t), q + ' → ' + t);
  }
  assert.strictEqual(DE.localize('pool_joke', 'A joke'), null, 'no German template → host keeps English');
  for (const id of Object.keys(DE.TPL)) for (const t of DE.TPL[id]) assert.ok(!CYR.test(t), id);
});
