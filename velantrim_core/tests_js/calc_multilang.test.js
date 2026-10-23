// v14.10.0: offline calculator understands Russian, English and German — words, operators, questions,
// decimal comma (DE/RU) — and formats the answer in the user's language.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const L = require(path.join(__dirname, '..', '..', 'local', 'eiti_local.js'));

const CASES = {
  en: [
    ['twenty five plus three', 28], ['twenty-five plus three', 28], ['what is 5 times 7', 35], ['what is five times seven', 35],
    ["what's 7 minus 10", -3], ['one hundred minus forty two', 58], ['a hundred plus five', 105], ['ten divided by four', 2.5],
    ['how much is 12 multiplied by 12', 144], ['twenty percent of three hundred', 60], ['calculate 15% of 80', 12],
    ['square root of eighty one', 9], ['what is the square root of 144', 12], ['nine squared',81], ['four cubed', 64],
    ['2 to the power of 10', 1024], ['three thousand two hundred plus one', 3201], ['one point five times four', 6],
    ['seven times eight?', 56], ['5 x 5', 25], ['half of 50', 25], ['100 plus 10 percent', 110], ['ninety nine plus one', 100],
  ],
  de: [
    ['fünfundzwanzig plus drei', 28], ['wie viel ist 5 mal 7', 35], ['wieviel ist 3 plus 4', 7], ['was ist sieben mal acht', 56],
    ['hundert minus zweiundvierzig', 58], ['zehn geteilt durch vier', 2.5], ['achtzehn durch drei', 6],
    ['zwanzig prozent von dreihundert', 60], ['wie viel sind 15 prozent von 80', 12], ['wurzel aus einundachtzig', 9],
    ['quadratwurzel aus 144', 12], ['neun hoch zwei', 81], ['zwei hoch zehn', 1024], ['neun zum quadrat', 81],
    ['2,5 mal 4', 10], ['1,5 plus 1,5', 3], ['zwei komma fünf mal vier', 10], ['dreitausendzweihundert plus eins', 3201],
    ['einhundertzwanzig geteilt durch zwölf', 10], ['berechne 6 mal 7', 42], ['sieben minus zehn', -3], ['die hälfte von 50', 25],
    ['wie viel ist fünf multipliziert mit sieben', 35],
  ],
  ru: [
    ['двадцать пять плюс три', 28], ['сколько будет 5 умножить на 7', 35], ['корень из 81', 9], ['двадцать процентов от трёхсот', 60],
    ['девять в квадрате', 81], ['2,5 умножить на 4', 10], ['сто минус сорок два', 58], ['десять разделить на четыре', 2.5],
    ['половина от 50', 25], ['два в степени десять', 1024],
  ],
};

for (const [lang, list] of Object.entries(CASES)) {
  test(`calc ${lang}: ${list.length} phrasings`, () => {
    for (const [q, v] of list) {
      const r = L.calc(q, lang);
      assert.ok(r && !r.error, `${lang}: «${q}» → ${r && (r.text || r.error)}`);
      assert.ok(Math.abs(r.value - v) < 1e-9, `${lang}: «${q}» = ${r.value}, want ${v}`);
    }
  });
}

test('answers are formatted in the user language (decimal comma / point, «von» / «of» / «от»)', () => {
  assert.strictEqual(L.calc('zehn geteilt durch vier', 'de').text, '10 ÷ 4 = 2,5');
  assert.strictEqual(L.calc('ten divided by four', 'en').text, '10 ÷ 4 = 2.5');
  assert.strictEqual(L.calc('десять разделить на четыре', 'ru').text, '10 ÷ 4 = 2,5');
  assert.strictEqual(L.calc('zwanzig prozent von dreihundert', 'de').text, '20% von 300 = 60');
  assert.strictEqual(L.calc('twenty percent of three hundred', 'en').text, '20% of 300 = 60');
  assert.strictEqual(L.calc('20 mal 1000', 'de').text, '20 × 1000 = 20.000');
  assert.strictEqual(L.calc('20 times 1000', 'en').text, '20 × 1000 = 20,000');
  assert.match(L.calc('zehn geteilt durch null', 'de').text, /Division durch null/);
  assert.match(L.calc('ten divided by zero', 'en').text, /division by zero/);
});

test('without an explicit language the question language is detected (DE → German format)', () => {
  assert.strictEqual(L.calc('wie viel ist 2,5 mal 3').text, '2,5 × 3 = 7,5');
  assert.strictEqual(L.calc('what is 2.5 times 3').text, '2.5 × 3 = 7.5');
  assert.strictEqual(L.calc('два плюс два').text, '2 + 2 = 4');
  assert.strictEqual(L.langHint('fünfundzwanzig plus drei'), 'de');
  assert.strictEqual(L.langHint('twenty five plus three'), 'en');
});

test('ordinary sentences are not mistaken for arithmetic', () => {
  for (const q of ['what is love', 'was ist das', 'hello', 'how are you', 'eins zwei drei', 'the end', 'die hälfte', 'один на один', 'version 1.2.3'])
    assert.strictEqual(L.calc(q, 'en'), null, q);
});
