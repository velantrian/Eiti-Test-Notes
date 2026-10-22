// v14.2.0: EITI Local — safe calculator (digits + Russian/English number words) and intents over the user's own data.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SRC = fs.readFileSync(path.join(ROOT, 'local', 'eiti_local.js'), 'utf8');
const L = require(path.join(ROOT, 'local', 'eiti_local.js'));
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const val = (q) => { const r = L.calc(q); assert.ok(r, 'no calc for ' + q); assert.ok(!r.error, q + ' → ' + r.text); return r.value; };
const near = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b));

test('calc: digits, precedence, parentheses, powers, percent', () => {
  const cases = {
    '25+17': 42, '100-3*4': 88, '(2+3)^2': 25, '2^10': 1024, '2**3': 8, '10 / 4': 2.5, '7-10': -3,
    '3 * (4 + 5)': 27, '-(2+3)': -5, '2 - - 3': 5, '3*-2': -6, '2^3^2': 512, '-2^2': -4, '((1+2)*(3+4))': 21,
    '2,5*4': 10, '2.5*4': 10, '0.1+0.2': 0.3, '6:3': 2, '6 ÷ 3': 2, '6 × 7': 42, '9 − 4': 5, '5²': 25, '2³': 8, '√16': 4, '√(9+16)': 5,
    '15% от 80': 12, '200+10%': 220, '200-10%': 180, '50%*4': 2, '1000000*1000': 1e9,
    'сколько будет 2+2': 4, 'посчитай 12*8': 96, 'вычисли 7*6?': 42, '2+2=': 4, 'сколько будет 2+2?': 4, 'what is 6*7': 42, 'calculate 3^4': 81,
  };
  for (const [q, v] of Object.entries(cases)) assert.ok(near(val(q), v), q + ' = ' + v + ', got ' + val(q));
});

test('calc: Russian number words and mixed forms', () => {
  const cases = {
    'два умножить на три': 6, 'сто сорок разделить на семь': 20, 'пять плюс 12': 17, 'двадцать процентов от трёхсот': 60,
    'двадцать процентов от трехсот': 60, 'квадратный корень из 81': 9, 'корень из шестнадцати': 4, 'квадратный корень из ста сорока четырёх': 12,
    'минус пять плюс три': -2, 'десять минус пятнадцать': -5, 'семь в квадрате': 49, 'два в кубе': 8, 'два в степени десять': 1024,
    'два и пять умножить на два': 5, 'три и двадцать пять плюс один': 4.25, 'две целых пять десятых плюс одна': 3.5, 'полтора плюс полтора': 3,
    'десять с половиной минус половина': 10, '2 на 3': 6, 'пять на 4': 20, 'тысяча минус один': 999, 'две тысячи двадцать шесть минус тысяча девятьсот девяносто': 36,
    'сто двадцать пять разделить на пять': 25, 'девяносто девять плюс один': 100, 'сорок два делить на шесть': 7, 'восемь умножить на восемь': 64,
    'тридцать три плюс сорок четыре': 77, 'миллион разделить на тысячу': 1000, 'пять тысяч плюс 3 тысячи': 8000, 'двести плюс десять процентов': 220,
    'сколько будет три плюс четыре': 7, 'посчитай девять умножить на девять': 81, 'сколько будет 15 процентов от двухсот': 30,
    'одиннадцать умножить на одиннадцать': 121, 'шестьсот шестьдесят шесть минус шестьсот': 66, 'ноль плюс ноль': 0, 'пять умноженное на 4': 20,
    'четыре прибавить пять': 9, 'отнять от десяти три': null,
  };
  for (const [q, v] of Object.entries(cases)) {
    if (v === null) continue;
    assert.ok(near(val(q), v), q + ' = ' + v + ', got ' + val(q));
  }
});

test('calc: English number words', () => {
  const cases = { 'two plus two': 4, 'seven times eight': 56, 'one hundred twenty plus five': 125, 'square root of 144': 12,
    'twenty percent of three hundred': 60, 'ten divided by four': 2.5, 'five squared': 25, 'what is nine minus eleven': -2 };
  for (const [q, v] of Object.entries(cases)) assert.ok(near(val(q), v), q + ' = ' + v + ', got ' + val(q));
});

test('calc: reply format «2 × 3 = 6», RU decimal comma, EN dot', () => {
  assert.strictEqual(L.calc('два умножить на три').text, '2 × 3 = 6');
  assert.strictEqual(L.calc('сто сорок разделить на семь').text, '140 ÷ 7 = 20');
  assert.strictEqual(L.calc('двадцать процентов от трёхсот').text, '20% от 300 = 60');
  assert.strictEqual(L.calc('квадратный корень из 81').text, '√81 = 9');
  assert.strictEqual(L.calc('семь в квадрате').text, '7² = 49');
  assert.strictEqual(L.calc('(2+3)^2').text, '(2 + 3)^2 = 25');
  assert.strictEqual(L.calc('100-3*4').text, '100 − 3 × 4 = 88');
  assert.strictEqual(L.calc('два и пять умножить на два').text, '2,5 × 2 = 5');
  assert.strictEqual(L.calc('10/4').text, '10 ÷ 4 = 2,5');
  assert.strictEqual(L.calc('ten divided by four').text, '10 ÷ 4 = 2.5');
  assert.strictEqual(L.calc('1/3').text, '1 ÷ 3 = 0,333333333333');
  assert.strictEqual(L.calc('12345*10').text, '12\u00a0345 × 10 = 123\u00a0450');
  assert.strictEqual(L.calc('0.1+0.2').value, 0.3);
});

test('calc: division by zero, negative root, overflow — a clear message, never NaN/Infinity', () => {
  for (const q of ['5/0', 'девяносто девять разделить на ноль', '1/(2-2)', '0/0']) {
    const r = L.calc(q); assert.strictEqual(r.error, 'div0', q); assert.match(r.text, /на ноль делить нельзя/);
  }
  assert.match(L.calc('10 divided by 0').text, /division by zero/);
  assert.strictEqual(L.calc('корень из -4').error, 'negroot');
  assert.strictEqual(L.calc('квадратный корень из минус девяти').error, 'negroot');
  assert.strictEqual(L.calc('10^400').error, 'big');
  for (const q of ['5/0', '10^400', 'корень из -4']) assert.doesNotMatch(L.calc(q).text, /NaN|Infinity/);
});

test('calc: plain numbers, dates, times, phones and normal sentences are not arithmetic', () => {
  for (const q of ['42', 'сто', 'один', 'минус пять', 'сорок два', '2026-10-23', '23.10.2026', '23/10/2026', 'встреча в 14:30', '14:30',
    'я купил 3 яблока и 2 груши', '+7 999 123-45-67', '8-800-555-35-35', 'v1.2.3', '1.2.3', 'x+1', 'a*b', 'привет как дела', 'три четверти',
    'у меня 2 кошки и 3 собаки', 'мне 25 лет', 'в 2024 году', 'страница 5 из 10', 'глава 3', 'на 5 минут', 'через 2 дня', 'iphone 15 pro',
    'топ 10 фильмов', 'сколько стоит хлеб', 'сколько времени', 'сколько тебе лет', 'сколько будет стоить ремонт', 'посчитай калории в яблоке',
    'два брата', 'пять минут', 'один на один', 'плюс в том что', 'минус этого телефона', 'в квадрате комнаты', 'корень проблемы',
    'процент по кредиту', 'дважды два', 'раз два три', 'кто такой Никола Тесла', 'почему небо голубое', '', '   ', '+', '()', '2+', '*3', '(2+3']) {
    assert.strictEqual(L.calc(q), null, 'false positive: ' + JSON.stringify(q) + ' → ' + JSON.stringify(L.calc(q)));
  }
});

test('calc: no eval / Function in the engine', () => {
  assert.doesNotMatch(SRC, /\beval\s*\(|new Function|\bFunction\s*\(/);
});

test('number words: readNumber', () => {
  const cases = { 'сто сорок два': 142, 'две тысячи двадцать шесть': 2026, 'тысяча девятьсот девяносто': 1990, 'трёхсот': 300, 'семи': 7,
    'двадцати пяти': 25, 'полтора': 1.5, 'два и пять': 2.5, 'ноль целых три десятых': 0.3, 'миллион': 1e6, 'три миллиона двести тысяч': 3200000,
    'one hundred five': 105, 'twenty one': 21, 'one thousand two hundred': 1200, '5 тысяч': 5000 };
  for (const [q, v] of Object.entries(cases)) assert.ok(near(L.readNumber(q), v), q + ' → ' + L.readNumber(q));
  assert.strictEqual(L.readNumber('два сорок'), null);
});

// ── user data ──
const NOW = new Date(2026, 9, 23, 12, 0).getTime(); // пятница, 23.10.2026 12:00 (локальное время)
const D = 86400000;
const DATA = {
  notes: [
    { id: 'n1', title: 'Рецепт борща', body: 'Свёкла, капуста, картошка. Варить 2 часа.', created: NOW - 3 * 3600e3, updated: NOW - 3 * 3600e3, tags: ['еда', 'рецепты'] },
    { id: 'n2', title: 'Кошка Муся', body: 'Мусе 3 года, корм Royal. Ветеринар в среду.', created: NOW - D, updated: NOW - D, tags: 'кошка, дом' },
    { id: 'n3', title: 'План поездки', body: 'Берлин — Прага, поезд в 9:00. Не забыть паспорт. '.repeat(10), created: NOW - 5 * D, updated: NOW - 2 * D, tags: [] },
    { id: 'n4', title: 'Старое', body: 'x', created: NOW - 60 * D, updated: NOW - 60 * D },
    { id: 'n5', title: 'Удалённая', body: 'про кошку', status: 'deleted', created: NOW, updated: NOW },
    { id: 'n6', title: 'Shopping list', body: 'milk, bread, passport photos', created: NOW - 3 * D, updated: NOW - 3 * D, tags: ['shop'] },
  ],
  files: [
    { name: 'отчёт.txt', content: 'Итоги квартала: выручка выросла.' },
    { name: 'img.png', content: 'data:image/png;base64,' + 'A'.repeat(4000) },
    { name: 'big.bin', size: 5 * 1024 * 1024, content: '' },
  ],
};
const R = (q) => L.reply(q, DATA, NOW);
const intent = (q) => { const r = R(q); return r ? r.intent : null; };

test('data intents: RU and EN phrasings are recognised', () => {
  const cases = {
    notes_count: ['сколько у меня заметок', 'Сколько заметок?', 'сколько всего заметок', 'количество заметок', 'сколько у меня записей', 'скажи, сколько у меня заметок',
      'сколько заметок за неделю', 'сколько я написал заметок вчера', 'сколько заметок в этом месяце', 'сколько заметок за последние 3 дня', 'сколько заметок сегодня',
      'how many notes do I have', 'how many notes', 'how many notes this week', 'number of notes', 'count my notes'],
    files_count: ['сколько у меня файлов', 'сколько файлов', 'количество файлов', 'how many files do I have', 'how many files'],
    files_size: ['сколько места занимают файлы', 'размер файлов', 'объём хранилища', 'сколько весят мои файлы', 'storage size', 'how much space do my files take', 'size of my files'],
    notes_last: ['последняя заметка', 'какая последняя заметка', 'покажи последнюю заметку', 'последняя запись', 'last note', 'my latest note', 'show me my most recent note'],
    notes_longest: ['самая длинная заметка', 'самая большая заметка', 'longest note', 'my longest note'],
    notes_shortest: ['самая короткая заметка', 'shortest note'],
    notes_tag: ['заметки с тегом еда', 'заметки по тегу #еда', 'покажи заметки с тегом рецепты', 'notes tagged shop', 'notes with tag shop'],
    notes_period: ['что я записал вчера', 'что я записал на неделе', 'что я писал сегодня', 'что я записала за неделю', 'заметки за вчера', 'мои заметки за неделю',
      'что я записал в прошлом месяце', 'what did I write yesterday', 'what did I write this week', 'notes from today'],
    notes_search: ['что в заметках про кошку', 'что у меня в заметках про паспорт', 'найди в заметках паспорт', 'поищи в заметках борщ', 'заметки про борщ',
      'где я писал про ветеринара', 'search my notes for passport', 'find notes about milk', 'what did I write about bread', 'notes about passport'],
    files_search: ['что в файлах про выручку', 'найди в файлах выручку', 'search my files for выручка'],
  };
  for (const [want, list] of Object.entries(cases)) for (const q of list) assert.strictEqual(intent(q), want, JSON.stringify(q) + ' → ' + intent(q));
});

test('data intents: normal chat is not hijacked', () => {
  for (const q of ['я вчера записал рецепт', 'у меня много заметок', 'последняя капля', 'как сделать заметку', 'создай заметку про кошку',
    'добавь заметку купить хлеб', 'удали заметку', 'открой заметки', 'сколько стоит хлеб', 'привет', 'напомни через 5 минут', 'сколько файлов нужно для проекта',
    'какой размер у слона', 'последний раз я был в Праге', 'что в заметках', 'сколько записей в блоге у Пушкина', 'как вести заметки', 'приложение для заметок',
    'расскажи сказку', 'что ты умеешь', 'what is a note', 'take a note', 'last time I saw him', 'how many people live in Berlin', 'файл не открывается',
    'почему небо голубое', 'сколько звёзд на небе', 'запиши что я сказал', 'кто такой Никола Тесла', 'заметки на полях', 'what did you say']) {
    const r = R(q); assert.strictEqual(r, null, 'false positive: ' + JSON.stringify(q) + ' → ' + (r && r.intent));
  }
});

test('data answers: counts, periods, last, longest, tags, search, sizes', () => {
  assert.match(R('сколько у меня заметок').text, /^У тебя 5 заметок/); // удалённая не считается
  assert.match(R('сколько заметок вчера').text, /Создано вчера: 1 заметка\. Всего у тебя 5 заметок/);
  assert.match(R('сколько заметок за неделю').text, /Создано за неделю: 4 заметки/);
  assert.match(R('сколько заметок на этой неделе').text, /на этой неделе: 3 заметки/); // пн 19.10 – пт 23.10
  assert.match(R('how many notes do I have').text, /^You have 5 notes/);
  assert.match(R('сколько у меня файлов').text, /^У тебя 3 файла \(5 МБ\)/);
  assert.match(R('сколько места занимают файлы').text, /Файлы занимают 5 МБ \(3 файла\)\. Самый крупный — «big\.bin», 5 МБ/);
  const last = R('последняя заметка').text;
  assert.match(last, /Рецепт борща/); assert.match(last, /⟦EITINOTE:n1⟧/);
  assert.match(R('самая длинная заметка').text, /План поездки/);
  assert.match(R('самая короткая заметка').text, /Старое/);
  const tag = R('заметки с тегом кошка').text;
  assert.match(tag, /#кошка — 1/); assert.match(tag, /Кошка Муся/);
  assert.match(R('заметки с тегом нет_такого').text, /нет/);
  const yest = R('что я записал вчера').text;
  assert.match(yest, /Кошка Муся/); assert.doesNotMatch(yest, /Рецепт/);
  const week = R('что я записал на неделе').text;
  assert.match(week, /Рецепт борща/); assert.match(week, /Кошка Муся/); assert.doesNotMatch(week, /Старое/);
  const s = R('что в заметках про кошку').text;
  assert.match(s, /Кошка Муся/); assert.match(s, /⟦EITINOTE:n2⟧/); assert.doesNotMatch(s, /Удалённая/);
  const p = R('найди в заметках паспорт').text;
  assert.match(p, /План поездки/); assert.match(p, /паспорт/);
  assert.match(R('notes about passport').text, /Shopping list/);
  assert.match(R('что в заметках про динозавров').text, /ничего не нашлось/);
  const f = R('что в файлах про выручку').text;
  assert.match(f, /отчёт\.txt/); assert.match(f, /⟦EITIUFILE:отчёт\.txt⟧/);
});

test('data answers: empty data is handled', () => {
  const E = { notes: [], files: [] };
  assert.match(L.reply('сколько у меня заметок', E, NOW).text, /У тебя 0 заметок\./);
  assert.match(L.reply('последняя заметка', E, NOW).text, /Заметок пока нет/);
  assert.match(L.reply('сколько у меня файлов', E, NOW).text, /0 файлов/);
  assert.match(L.reply('что в заметках про кошку', {}, NOW).text, /ничего не нашлось/);
});

test('periods: today / yesterday / weeks / months / last N days', () => {
  const p = (q) => L.period(q, NOW);
  const d0 = new Date(2026, 9, 23).getTime();
  assert.deepStrictEqual([p('сегодня').from, p('сегодня').to], [d0, d0 + D]);
  assert.strictEqual(p('вчера').from, d0 - D);
  assert.strictEqual(p('позавчера').from, d0 - 2 * D);
  assert.strictEqual(p('на этой неделе').from, new Date(2026, 9, 19).getTime());
  assert.strictEqual(p('на прошлой неделе').from, new Date(2026, 9, 12).getTime());
  assert.strictEqual(p('в этом месяце').from, new Date(2026, 9, 1).getTime());
  assert.strictEqual(p('в прошлом месяце').from, new Date(2026, 8, 1).getTime());
  assert.strictEqual(p('за последние три дня').from, d0 - 2 * D);
  assert.strictEqual(p('in the last 10 days').from, d0 - 9 * D);
  assert.strictEqual(p('без периода'), null);
});

test('helpers: byte sizes', () => {
  assert.strictEqual(L.fileBytes({ content: 'абв' }), 6);
  assert.strictEqual(L.fileBytes({ content: 'data:text/plain;base64,QUJD' }), 3);
  assert.strictEqual(L.fmtBytes(512, true), '512 Б');
  assert.strictEqual(L.fmtBytes(1536, true), '1,5 КБ');
  assert.strictEqual(L.fmtBytes(5 * 1024 * 1024, false), '5 MB');
});

test('speed: 2000 mixed queries over 2000 notes < 1.5 s', () => {
  const notes = [];
  for (let i = 0; i < 2000; i++) notes.push({ id: 'x' + i, title: 'Заметка ' + i, body: 'текст про разное ' + i + ' кошка'.repeat(i % 3), created: NOW - i * 3600e3, updated: NOW - i * 3600e3, tags: ['t' + (i % 10)] });
  const qs = ['25+17', 'два умножить на три', 'сколько у меня заметок', 'что в заметках про кошку', 'привет как дела', 'заметки с тегом t3', 'самая длинная заметка', 'почему небо голубое'];
  const t0 = Date.now();
  for (let i = 0; i < 2000; i++) L.reply(qs[i % qs.length], { notes, files: [] }, NOW);
  assert.ok(Date.now() - t0 < 1500, 'took ' + (Date.now() - t0) + ' ms');
});

test('host wiring: script, router first, offline wrapper outermost, note chips', () => {
  assert.ok(HTML.includes('<script src="./local/eiti_local.js" defer></script>'));
  const router = HTML.indexOf('function eitiIntentRouter(txt)');
  assert.ok(HTML.indexOf("EitiLocalHost.reply(txt)", router) < HTML.indexOf('P8: Обработка выбора обогащения KB', router));
  assert.ok(HTML.indexOf('EitiOffline._localWrapped = true') > HTML.indexOf('EitiOffline._kbWrapped = true'));
  assert.ok(HTML.includes('⟦EITINOTE:([\\w.:-]+)⟧'));
  assert.ok(HTML.includes('window.eitiOpenNoteById = function(id)'));
});
