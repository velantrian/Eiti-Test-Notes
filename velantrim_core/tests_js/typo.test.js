// v14.8.0 — offline typo tolerance: accuracy, no false corrections, DE folding, speed.
const test = require('node:test'), assert = require('node:assert');
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
const T = require(path.join(ROOT, 'local', 'eiti_typo.js'));
const vocab = JSON.parse(fs.readFileSync(path.join(ROOT, 'local', 'eiti_typo_vocab.json'), 'utf8'));
T.load(vocab);
const fx = (s, l) => T.correct(s, l || 'ru').text;

test('curated short words and slang table', () => {
  for (const w of ['еше', 'ище', 'ешо', 'исчо']) assert.strictEqual(fx(w), 'ещё');
  assert.strictEqual(fx('ещё'), 'ещё');
  assert.strictEqual(fx('двв'), 'двв'); // ≤3 letters outside the table: never touched
});

test('RU/EN typos: neighbour keys, dropped/doubled letters, swaps, ш/щ', () => {
  const cases = [['два умнжить на три', 'два умножить на три'], ['расскжаи анекдот', 'расскажи анекдот'], ['расскжи сказку', 'расскажи сказку'],
    ['сколко у меня заметок', 'сколько у меня заметок'], ['спакойной ночи', 'спокойной ночи'], ['доброе утор', 'доброе утро']];
  for (const [a, b] of cases) assert.strictEqual(fx(a), b, a);
  assert.strictEqual(fx('tell me a jkoe', 'en'), 'tell me a joke');
  assert.strictEqual(fx('how mnay notes do i have', 'en'), 'how many notes do i have');
});

test('wrong keyboard layout and missing spaces/hyphens', () => {
  assert.strictEqual(fx('ghbdtn rfr ltkf', 'en'), 'привет как дела');
  assert.strictEqual(fx('руддщ', 'ru'), 'hello');
  assert.ok(T.correct('ghbdtn', 'en').layout);
  assert.strictEqual(fx('кактвои дела'), 'как твои дела');
  assert.strictEqual(fx('сколькобудет два плюс два'), 'сколько будет два плюс два');
  assert.strictEqual(fx('чтото'), 'что-то');
});

test('German: fold ü/ä/ö/ß ↔ ue/ae/oe/ss on both sides, small explicit table', () => {
  for (const w of ['Wasser', 'neue', 'Strasse', 'Straße', 'Taetigkeit', 'Grüsse', 'erzaehl']) assert.strictEqual(fx(w, 'de'), w, w);
  assert.strictEqual(fx('tatigkeit', 'de'), 'tätigkeit');
  assert.strictEqual(fx('dnake', 'de'), 'danke');
  assert.strictEqual(fx('vileicht', 'de'), 'vielleicht');
  assert.strictEqual(fx('erzähl mir einen wtiz', 'de'), 'erzähl mir einen witz');
  const de = Object.keys(T.TABLE.de).length; assert.ok(de > 20 && de < 80, 'DE table stays small: ' + de);
});

test('valid text is never rewritten (names, valid words, laughter, long text)', () => {
  for (const [s, l] of [['мама мыла раму', 'ru'], ['я купил новый телефон вчера', 'ru'], ['Что сказать на стендапе', 'ru'], ['the quick brown fox jumps over the lazy dog', 'en'],
    ['Ich habe heute keine Zeit', 'de'], ['ахахахах', 'ru'], ['hahaha', 'en'], ['Ruslan wrote a script', 'en'], ['Москва столица России', 'ru']])
    assert.strictEqual(fx(s, l), s, s);
});

test('accuracy on ≥200 typo cases (intents + calculator) and no held-out regressions', () => {
  const r = require('./typo/eval_typo.js')();
  assert.ok(r.n >= 200, 'cases ' + r.n);
  assert.ok(r.after >= 0.95 && r.after > r.before + 0.1, `before ${r.before} after ${r.after}`);
  const g = require('./typo/regress_typo.js')();
  // held-out sets contain deliberate typos; a correction may only change behaviour for those known typo items
  const allowed = new Set(['мне грусно', 'расскжи про слнов']);
  assert.deepStrictEqual(g.broke.map((x) => x.q).filter((q) => !allowed.has(q)), []);
});

test('speed: lazy index, fast per-message correction', () => {
  const t0 = process.hrtime.bigint(); fx('проверка скорсти индекса'); const first = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.ok(first < 1500, 'first call (index build) ms ' + first);
  const msgs = ['сколко будет два умнжить на три', 'расскжи анекдот пж', 'tell me a jkoe', 'wie vielle notizen habe ich', 'ghbdtn'];
  const t1 = process.hrtime.bigint(); for (let i = 0; i < 400; i++) T.correct(msgs[i % 5] + (i % 7 ? '' : ' ' + i), 'ru');
  const per = Number(process.hrtime.bigint() - t1) / 1e6 / 400;
  assert.ok(per < 5, 'per message ms ' + per);
});
