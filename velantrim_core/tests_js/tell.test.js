// v14.15.3: EITI Tell — офлайн «расскажи что-нибудь / удиви меня / как ты думаешь» без темы.
// Формулировки (с опечатками и в любом порядке), «не наше» (тема → KB, эмоции → Care, сказки/цитаты → свои пулы),
// без повторов подряд, «ещё» только сразу после ответа Tell, размеры пулов, EN/DE.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const T = require(path.join(ROOT, 'local', 'eiti_tell.js'));
const PACK = JSON.parse(fs.readFileSync(path.join(ROOT, 'local', 'eiti_tell.json'), 'utf8'));
T.load(PACK);

const RU_ANY = ['расскажи что-то', 'Расскажи что-то', 'расскажи что-нибудь', 'расскажи что-нибудь интересное', 'расскажи там',
  'скажи что-нибудь', 'удиви меня', 'удиви', 'поведай', 'поделись чем-нибудь', 'что расскажешь', 'чем поделишься',
  'развлеки меня', 'давай что-нибудь интересное', 'ну расскажи что-нибудь', 'а расскажи-ка что-нибудь',
  'что-нибудь интересное расскажи', 'меня удиви', 'раскажи что-то', 'расскжи что нибудь', 'удеви меня', 'раскажи чтонибудь интересное'];
const RU_CAT = {
  'скажи мудрость': 'wisdom', 'расскажи мудрость': 'wisdom', 'расскажи факт': 'fact', 'интересный факт': 'fact', 'факт': 'fact',
  'расскажи историю из жизни': 'story', 'расскажи случай из жизни': 'story', 'расскажи интересную историю': 'story',
  'а ты что думаешь': 'thought', 'как ты думаешь': 'thought', 'скажи, как ты думаешь': 'thought', 'твоё мнение': 'thought',
  'твое мнение': 'thought', 'что скажешь': 'thought',
};
const NOT_OURS = ['расскажи про луну', 'расскажи о космосе', 'расскажи историю', 'расскажи сказку', 'расскажи притчу',
  'скажи цитату', 'расскажи что-нибудь смешное', 'расскажи о себе', 'мне грустно расскажи что-нибудь', 'мне грустно',
  'ты думаешь', 'что ты читаешь', 'история', 'факт о космосе', 'мудрую мысль', 'привет', 'что такое луна',
  'tell me a story', 'tell me something nice', 'erzähl mir ein märchen', ''];

test('RU: «расскажи что-нибудь» во всех формулировках, с опечатками и в любом порядке', () => {
  for (const q of RU_ANY) { const m = T.match(q, 'ru'); assert.ok(m && !m.more, q); assert.strictEqual(m.cat, null, q); }
});

test('RU: категория по слову (мудрость / факт / история из жизни / мнение)', () => {
  for (const [q, cat] of Object.entries(RU_CAT)) assert.strictEqual((T.match(q, 'ru') || {}).cat, cat, q);
});

test('не перехватывает темы (KB), эмоции (Care), сказки / притчи / цитаты / шутки', () => {
  for (const q of NOT_OURS) assert.strictEqual(T.match(q, 'ru'), null, q);
  const st = T.create();
  for (const q of NOT_OURS) assert.strictEqual(T.respond(q, st, { lang: 'ru' }), null, q);
});

test('EN/DE: tell me something / surprise me / what do you think / erzähl mir etwas / überrasch mich', () => {
  for (const q of ['tell me something', 'tell me something interesting', 'surprise me', 'what do you think', 'tell me a fact', 'say something wise'])
    assert.ok(T.match(q, 'en'), q);
  for (const q of ['erzähl mir etwas', 'überrasch mich', 'was denkst du', 'erzähl mir eine interessante tatsache'])
    assert.ok(T.match(q, 'de'), q);
  const st = T.create();
  assert.match(T.respond('surprise me', st, { lang: 'en' }), /Say “more”|say "more"|more/i);
  assert.ok(!/[а-яё]/i.test(T.respond('überrasch mich', st, { lang: 'de' }).replace(/«|»/g, '')));
});

test('без повторов: категория не повторяется подряд, тексты не повторяются, пока колода не кончилась', () => {
  const st = T.create(); let prev = null; const seen = new Set();
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 60; i++) {
    const r = T.respond('расскажи что-нибудь', st, { lang: 'ru', rnd });
    assert.ok(r, 'ответ ' + i);
    assert.notStrictEqual(st.last.cat, prev, 'категория подряд ' + i);
    prev = st.last.cat;
    const key = st.last.cat + ':' + st.last.idx;
    assert.ok(!seen.has(key), 'повтор ' + key);
    seen.add(key);
  }
  // одна категория подряд — не повторяется даже на границе колоды
  const s2 = T.create(); let last = null;
  for (let i = 0; i < 90; i++) { T.respond('интересный факт', s2, { lang: 'ru' }); assert.strictEqual(s2.last.cat, 'fact'); assert.notStrictEqual(s2.last.idx, last); last = s2.last.idx; }
});

test('«ещё» — только сразу после ответа Tell (и в пределах 15 минут); disarm сбрасывает', () => {
  const st = T.create(); const now = 1e12;
  assert.strictEqual(T.respond('ещё', st, { lang: 'ru', now }), null);
  const a = T.respond('расскажи факт', st, { lang: 'ru', now });
  const b = T.respond('ещё', st, { lang: 'ru', now: now + 1000 });
  assert.ok(a && b && a !== b); assert.strictEqual(st.last.cat, 'fact');
  assert.ok(T.respond('давай ещё', st, { lang: 'ru', now: now + 2000 }));
  assert.strictEqual(T.respond('ещё', st, { lang: 'ru', now: now + 20 * 60 * 1000 }), null);
  T.respond('удиви меня', st, { lang: 'ru', now }); T.disarm(st);
  assert.strictEqual(T.respond('ещё', st, { lang: 'ru', now: now + 1000 }), null);
});

test('формат ответа: заголовок категории + подсказка «ещё»', () => {
  const st = T.create();
  const r = T.respond('скажи мудрость', st, { lang: 'ru' });
  assert.match(r, /\*\*Мудрость\*\*/); assert.match(r, /— /); assert.match(r, /Скажи «ещё»/);
  assert.match(T.respond('расскажи факт', st, { lang: 'ru' }), /\*\*Интересный факт\*\*/);
  assert.match(T.respond('расскажи случай из жизни', st, { lang: 'ru' }), /\*\*История\*\*/);
  assert.match(T.respond('как ты думаешь', st, { lang: 'ru' }), /\*\*Размышление\*\*/);
});

test('пулы: RU ≥ 35 в каждой категории, EN/DE ≥ 10, без дублей; формат пакета; без выдуманного «личного опыта»', () => {
  assert.strictEqual(PACK.format, 'eiti-tell');
  const sz = T.sizes();
  for (const c of T.CATS) { assert.ok(sz.ru[c] >= 35, 'ru ' + c); assert.ok(sz.en[c] >= 10, 'en ' + c); assert.ok(sz.de[c] >= 10, 'de ' + c); }
  for (const lang of ['ru', 'en', 'de']) for (const c of T.CATS) {
    const txt = PACK.pools[lang][c].map((x) => JSON.stringify(x));
    assert.strictEqual(new Set(txt).size, txt.length, lang + ' ' + c + ' дубли');
  }
  const ru = JSON.stringify(PACK.pools.ru.story) + JSON.stringify(PACK.pools.ru.thought);
  assert.ok(!/когда я был|когда я была|в детстве я|моя мама|мой друг/i.test(ru));
});

test('без пакета / мусор — null, без исключений; load отвергает чужой формат', () => {
  assert.strictEqual(T.load({ format: 'x' }), false);
  assert.ok(T.loaded());
  assert.strictEqual(T.respond('расскажи что-нибудь', null, { lang: 'ru' }), null);
  for (const q of [null, undefined, 42, '???', 'а'.repeat(500)]) assert.doesNotThrow(() => T.match(q, 'ru'));
});

test('модуль чистый: без DOM / localStorage / сети / lookbehind', () => {
  const src = fs.readFileSync(path.join(ROOT, 'local', 'eiti_tell.js'), 'utf8').replace(/\/\/.*$/gm, '');
  assert.ok(!/\(\?<[=!]/.test(src)); assert.ok(!/localStorage|fetch\(|document\.|XMLHttpRequest/.test(src));
});
