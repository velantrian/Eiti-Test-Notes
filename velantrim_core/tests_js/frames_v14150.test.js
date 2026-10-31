// v14.15.0: новые интенты (чей / с кем / насколько / до каких пор / который из / небось / ведь / авось / просьбы),
// нормализация (-то/-ка, «неее», числа словами, ё→е), модификаторы («максимально подробно», tldr, «как для чайника»),
// составные реплики (зачин «ок, …», два вопроса подряд) и «только-контекстные» реплики без смены поведения respond.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const F = require(path.join(ROOT, 'local', 'eiti_frames.js'));
const PACK = JSON.parse(fs.readFileSync(path.join(ROOT, 'local', 'eiti_frames.json'), 'utf8'));
const CORPUS = JSON.parse(fs.readFileSync(path.join(__dirname, 'offline', 'offline_question_intent_regression_additions.json'), 'utf8'));
const C = require(path.join(ROOT, 'kb', 'tests', 'concept.js'))();
F.load(PACK);

function pass(q) {
  const h = C.engine.search(q, 3);
  return Promise.resolve(h[0] && C.engine.confident(h[0]) ? '🧠 KB ' + h[0].id : null);
}
const deps = { lookup: C.lookup, pass };
const P = (q, st) => F.parse(q, st || F.create(), Date.now());

test('offline corpus: all 130 phrases resolve to an intent (было 44 null)', () => {
  const nulls = CORPUS.filter((it) => !P(it.phrase)).map((it) => it.phrase);
  assert.deepEqual(nulls, []);
});

test('new slots: whose / role / degree / until / choice', () => {
  const cases = [
    ['Чья это папка?', 'q_whose', 'папка'], ['чей это вариант настройки', 'q_whose', 'вариант настройки'],
    ['С кем лучше обсудить перенос?', 'q_role'], ['От кого пришла последняя правка?', 'q_role'], ['К кому обратиться по доступу?', 'q_role'],
    ['для кого этот отчёт', 'q_role'], ['подскажи, кому это отправить', 'q_role'],
    ['Насколько точен этот вывод?', 'q_degree'], ['В какой мере вывод подтверждён?', 'q_degree'], ['как сильно вырос риск', 'q_degree'],
    ['До каких пор ждать ответа?', 'q_until'], ['Доколе ждать ответа?', 'q_until'], ['Как долго ещё ждать синхронизации?', 'q_until'],
    ['Который из двух вариантов лучше?', 'ask_which'], ['Какая из этих схем проще?', 'ask_which'], ['Что выбрать из трёх: утро, день или вечер?', 'ask_which'],
    // «который из двух файлов» — данные пользователя → defer, как раньше
    ['Небось уже поздно?', 'q_guess'], ['Ведь срок уже истёк, правда?', 'q_shared'], ['Авось успеем?', 'q_hope'],
    ['Проверь, не потерялось ли начало записи.', 'req_action'], ['Расставь пункты по важности', 'req_action'],
  ];
  for (const [q, intent, topic] of cases) {
    const p = P(q);
    assert.ok(p, q);
    assert.strictEqual(p.intent, intent, q + ' → ' + p.intent);
    if (topic) assert.strictEqual(p.topic, topic, q);
  }
  // «доколе терпеть» — по-прежнему риторика; «с кем связана наука» — о понятии
  assert.strictEqual(P('доколе терпеть').intent, 'rhetorical');
  assert.strictEqual(P('с кем связана наука').topic, 'наука');
  // «отправили» / «согласие» не попадают в просьбы (повелительные формы — без стемминга)
  assert.notStrictEqual(P('Что ли отчёт уже отправили?').intent, 'req_action');
  assert.notStrictEqual(P('🙂 это согласие или просто вежливо?').intent, 'req_action');
});

test('normalization: -то/-ка, растянутые буквы, числа словами, ё', () => {
  assert.deepStrictEqual(F.toks('сто двадцать пять минут'), ['125', 'минут']);
  assert.deepStrictEqual(F.toks('двадцать один процент'), ['21', 'процент']);
  assert.deepStrictEqual(F.toks('два три'), ['два', 'три']);
  assert.deepStrictEqual(F.toks('скажи-ка неее хммм'), ['скажи', 'нет', 'хм']);
  assert.ok(F.toks('кто-то').length === 1, 'неопределённые «кто-то» не режутся');
  assert.strictEqual(P('что такое ёжик').topic, 'ежик');
  assert.strictEqual(P('Сколько будет двадцать один процент от восьмидесяти?').topic, '21 процент восьмидесяти');
});

test('«а дальше-то» → fu_next (после ответа) и без контекста — как раньше (respond не меняется)', async () => {
  const st = F.create();
  await F.respond('что такое наука', st, deps);
  for (const q of ['а дальше-то?', 'и что дальше-то', 'что теперь']) {
    const p = F.parse(q, st, Date.now());
    assert.ok(p && p.kind === 'fu' || (p && p.fam === 'next'), q + ' → ' + JSON.stringify(p));
  }
  const cold = P('а дальше-то?');
  assert.ok(cold && cold.ctxOnly && cold.kind === 'pass');
  assert.strictEqual(await F.respond('а дальше-то?', F.create(), { lookup: C.lookup, pass: () => Promise.resolve(null) }), null);
});

test('modifiers: максимально подробно / tldr / как для чайника / можно короче', async () => {
  const a = P('расскажи о науке максимально подробно');
  assert.ok(a.mods.long); assert.strictEqual(a.topic, 'науке');
  assert.ok(P('tldr про фотосинтез').mods.short);
  assert.ok(P('тлдр про фотосинтез').mods.short);
  assert.ok(P('объясни фотосинтез как для чайника').mods.simple);
  assert.ok(P('А теперь можно короче?').mods.short);
  assert.match(await F.respond('объясни фотосинтез как для чайника', F.create(), deps), /Проще/);
});

test('стемминг: «небось / поди / никак» не цепляют «небо / под…» (Appendix D «интересно почему небо голубое»)', () => {
  assert.strictEqual(P('интересно почему небо голубое').intent, 'q_why');
  assert.strictEqual(P('небось уже поздно').intent, 'q_guess');
});

test('compound: социальный зачин и два вопроса подряд', async () => {
  assert.strictEqual(P('ок. расскажи о космосе').topic, 'космосе');
  assert.strictEqual(P('Спасибо! А что такое фотосинтез?').topic, 'фотосинтез');
  assert.strictEqual(P('спасибо').intent, 'soc_thanks');
  assert.strictEqual(P('хорошо ли это').intent !== undefined, true);
  const two = P('Что такое наука. А зачем она?');
  assert.strictEqual(two.intent, 'ask_define');
  assert.deepStrictEqual(two.also.map((a) => a.field), ['use']);
  const r = await F.respond('Что такое наука. А зачем она?', F.create(), deps);
  assert.match(r, /Наука — /); assert.match(r, /Зачем/);
  // тема уже открыта и определение было → только «зачем», не «дальше»
  const st = F.create();
  await F.respond('что такое наука', st, deps);
  const r2 = await F.respond('Что такое наука. А зачем она?', st, deps);
  assert.match(r2, /Зачем/); assert.doesNotMatch(r2, /Наука — /);
  // разные темы — не склеиваются
  assert.ok(!(P('Что такое луна. А зачем наука?').compound));
});

test('other-case topics: «сравни с наукой» после ответа, «расскажи о физикой»', async () => {
  const st = F.create();
  await F.respond('что такое физика', st, deps);
  const r = await F.respond('а сравни с наукой', st, deps);
  assert.match(r, /Физика/); assert.match(r, /Наука/);
  assert.match(await F.respond('расскажи про гравитацией', F.create(), deps), /Гравитация/);
});

test('frames pack stays small: ≤40 KB gzip', () => {
  const gz = require('zlib').gzipSync(fs.readFileSync(path.join(ROOT, 'local', 'eiti_frames.json')), { level: 9 }).length;
  assert.ok(gz <= 40 * 1024, 'gzip ' + gz);
});
