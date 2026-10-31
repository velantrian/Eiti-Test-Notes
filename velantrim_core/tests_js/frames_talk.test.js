// v14.14.0 talk: речевые акты офлайн (мнение, рассуждение, «что будет, если», другой вариант, сравнение, за и против, совет,
// по шагам, уточнение, сомнение, повтор, проще/глубже, итог, «что дальше», эмоции, приветствие/спасибо/пока, согласие/несогласие, «хм»).
// Генерация фраз из грамматики пакета (slots × варианты × паразиты × тема × опечатки) + живые фразы + многоходовые диалоги.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..', '..');
const F = require(path.join(ROOT, 'local', 'eiti_frames.js'));
const PACK_RAW = fs.readFileSync(path.join(ROOT, 'local', 'eiti_frames.json'), 'utf8');
const PACK = JSON.parse(PACK_RAW);
const C = require(path.join(ROOT, 'kb', 'tests', 'concept.js'))();
const SRC = fs.readFileSync(path.join(ROOT, 'local', 'eiti_frames.js'), 'utf8');
F.load(PACK);

const PASS = '⟪pass⟫';
function pass(q) {
  const h = C.engine.search(q, 3);
  return Promise.resolve(h[0] && C.engine.confident(h[0]) ? '🧠 KB ' + h[0].id : null);
}
const deps = { lookup: C.lookup, pass };
const ask = (q, st) => F.respond(q, st, deps);
const PHOTO = C.lookup('фотосинтез');
function freshState() { const st = F.create(); st.card = PHOTO; st.at = Date.now(); st.told = { def: 1 }; return st; }

// детерминированный ГПСЧ
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const PREFIX = ['', '', 'а ', 'ну ', 'слушай, ', 'эити, ', 'кстати, ', 'пожалуйста, ', 'а ну-ка ', 'хм, а ', 'скажи-ка, '];
const SUFFIX = ['', '', '?', ' пожалуйста', ' если не сложно', ', плиз', '??', '!', ' а?'];
const TOPICS = ['про фотосинтез', 'о гравитации', 'насчёт науки', 'про физику'];
function typo(word, r) {
  if (word.length < 6) return word;
  const i = 1 + Math.floor(r() * (word.length - 3)), k = Math.floor(r() * 3);
  if (k === 0) return word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2);   // перестановка
  if (k === 1) return word.slice(0, i) + word.slice(i + 1);                           // пропуск
  return word.slice(0, i) + word[i] + word.slice(i);                                  // удвоение
}
const FAM = {};
PACK.intents.forEach((it) => { FAM[it.id] = it.fam || it.id; });
function generate() {
  // по скомпилированным триггерам (ровно то, что видит движок: грамматика развёрнута, паразиты вычищены)
  const r = rng(14140), out = [], seen = new Set();
  F.triggers().forEach((tr) => {
    const n = tr.raw; if (!n || seen.has(tr.id + '|' + n)) return; seen.add(tr.id + '|' + n);
    const bare = F.parse(n, freshState(), Date.now());
    if (bare && bare.kind === 'defer') return;                       // «сказка/стих» — уходят в другие модули
    for (let v = 0; v < 2; v++) {
      let core = n, typoed = false;
      if (v === 1 && r() < 0.3) {
        const ws = core.split(' '), j = ws.findIndex((w) => w.length >= 7);
        if (j >= 0) { ws[j] = typo(ws[j], r); core = ws.join(' '); typoed = true; }
      }
      let q = core;
      if (!tr.ctx && (v === 1 || r() < 0.4)) q = r() < 0.6 ? core + ' ' + TOPICS[Math.floor(r() * TOPICS.length)] : TOPICS[Math.floor(r() * TOPICS.length)] + ' ' + core;
      q = PREFIX[Math.floor(r() * PREFIX.length)] + q + SUFFIX[Math.floor(r() * SUFFIX.length)];
      if (r() < 0.25) q = q.charAt(0).toUpperCase() + q.slice(1);
      out.push({ q, fam: tr.fam, id: tr.id, typo: typoed });
    }
  });
  return out;
}
function famOf(p) { return p ? (p.kind === 'fu' ? p.fam : p.fam) : null; }

test('pack: grammar, families, size and purity', () => {
  const s = F.stats();
  assert.ok(s.intents >= 40, 'intents ' + s.intents);
  assert.ok(s.families >= 25, 'families ' + s.families);
  assert.ok(s.variants >= 1200, 'expanded trigger variants ' + s.variants);
  const fams = new Set(Object.values(FAM));
  for (const f of ['opinion', 'reflection', 'hypothetical', 'alternative', 'example', 'comparison', 'pros_cons', 'advice', 'steps', 'clarification',
    'doubt', 'repetition', 'simplify', 'deepen', 'summary', 'next', 'emotion', 'social', 'agreement', 'disagreement', 'hedge']) assert.ok(fams.has(f), f);
  assert.ok(zlib.gzipSync(PACK_RAW).length < 40 * 1024, 'pack gzip < 40 KB');
  assert.deepEqual(F.expand('(а|б) [в] $x', { x: ['г', 'д е'] }).map(F.norm).sort(), ['а в г', 'а в д е', 'а г', 'а д е', 'б в г', 'б в д е', 'б г', 'б д е']);
  assert.deepEqual(F.expand('что (ты)? думаешь').map(F.norm).sort(), ['что думаешь', 'что ты думаешь']);
  // 3–6 вариантов формулировки на шаблон
  for (const [k, opts] of Object.entries(PACK.acts)) for (const o of opts) {
    const n = (o.t || o.intro || []).length;
    assert.ok(n >= 2 && n <= 6, k + ' variants ' + n);
  }
  const code = SRC.replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(code, /\bdocument\.|\blocalStorage\b|\bfetch\(|XMLHttpRequest|\bWebSocket\b|\bimportScripts\b/);
});

test('generate-and-assert: ≥1500 phrasings from the grammar, ≥97% family accuracy', () => {
  const items = generate();
  assert.ok(items.length >= 1500, 'generated ' + items.length);
  const bad = [];
  for (const it of items) {
    const p = F.parse(it.q, freshState(), Date.now());
    if (famOf(p) !== it.fam) bad.push(it.q + ' → ' + (p ? famOf(p) : 'null') + ' (want ' + it.fam + ')');
  }
  const acc = 1 - bad.length / items.length;
  console.log('# talk grammar: ' + items.length + ' phrasings, accuracy ' + (acc * 100).toFixed(2) + '%, typos ' + items.filter((x) => x.typo).length);
  if (process.env.TALK_DUMP) console.log(bad.join('\n'));
  assert.ok(acc >= 0.97, 'accuracy ' + (acc * 100).toFixed(2) + '%\n' + bad.slice(0, 40).join('\n'));
});

const NATURAL = {
  opinion: ['скажи что ты думаешь', 'что ты думаешь об этом', 'как ты это считаешь', 'а ты как думаешь?', 'твоё мнение?', 'как считаешь', 'что скажешь',
    'по-твоему как', 'на твой взгляд', 'как тебе это', 'ну и как тебе', 'что ты об этом думаешь', 'а сама как думаешь', 'что думаешь про фотосинтез',
    'как ты относишься к науке', 'какое у тебя мнение о гравитации', 'выскажи своё мнение', 'чё думаешь', 'как ты щитаешь', 'ты за или против'],
  reflection: ['обдумай это', 'подумай хорошенечко', 'порассуждай', 'давай порассуждаем о науке', 'поразмышляй про гравитацию', 'проанализируй это', 'твои мысли?', 'есть соображения?', 'обмозгуй'],
  hypothetical: ['как считаешь, что будет, если исчезнет гравитация', 'что будет если не будет фотосинтеза', 'а если бы', 'что если', 'представь, что гравитации нет',
    'допустим, науки нет', 'что случится, если фотосинтез прекратится', 'а вдруг', 'что было бы если', 'к чему это приведёт', 'чем это грозит'],
  alternative: ['а как было бы по-другому', 'другой вариант', 'а по-другому можно?', 'скажи иначе', 'другими словами', 'с другой стороны', 'есть альтернатива?', 'перефразируй',
    'ещё один', 'другой пример', 'а ещё пример', 'ещё вариант'],
  example: ['дай пример', 'приведи пример', 'пример из жизни', 'покажи на практике', 'для примера', 'пример фотосинтеза', 'приведи примеры гравитации', 'на примере'],
  comparison: ['а в чём разница', 'сравни', 'сравни фотосинтез и гравитацию', 'чем отличается наука от физики', 'в чём отличие', 'что общего у физики и науки', 'сопоставь'],
  why: ['почему так', 'а почему так', 'из-за чего', 'в чём причина', 'как так'],
  doubt: ['а исключения', 'правда?', 'ты уверена', 'ты уверен?', 'это правда?', 'серьёзно?', 'неужели', 'да ладно', 'откуда ты знаешь', 'всегда ли так', 'бывают исключения?', 'где доказательства'],
  repetition: ['повтори', 'ещё раз', 'скажи ещё раз', 'не расслышала', 'что ты сказала', 'повтори пожалуйста'],
  simplify: ['проще', 'попроще', 'упрости', 'объясни как для ребёнка', 'на пальцах', 'без терминов', 'человеческим языком', 'по-простому', 'для чайников'],
  deepen: ['усложни', 'сложнее', 'глубже', 'копни глубже', 'по-научному', 'для профи', 'развёрнуто', 'во всех деталях'],
  essence: ['в двух словах', 'коротко', 'если коротко', 'одной фразой', 'без воды', 'в одном предложении'],
  summary: ['подведи итог', 'резюмируй', 'подытожь', 'итого', 'что в итоге', 'главная мысль', 'сделай вывод', 'обобщи'],
  next: ['что дальше', 'а дальше', 'продолжай', 'следующий шаг', 'давай дальше', 'что ещё расскажешь', 'достаточно', 'сменим тему', 'стоп'],
  steps: ['с чего начать', 'с чего начинать', 'как начать', 'по шагам', 'пошагово', 'шаг за шагом', 'по пунктам', 'распиши по шагам', 'какие этапы'],
  pros_cons: ['за и против', 'плюсы и минусы', 'преимущества и недостатки', 'а минусы', 'какие плюсы', 'в чём подвох', 'чем хорош фотосинтез', 'недостатки'],
  advice: ['а что ты советуешь', 'что посоветуешь', 'твой совет', 'дай совет', 'как лучше', 'что порекомендуешь'],
  clarification: ['уточни', 'что ты имеешь в виду', 'в каком смысле', 'в смысле?', 'не поняла', 'непонятно', 'поточнее', 'конкретнее'],
  purpose: ['в чём смысл', 'в чём польза', 'какой толк', 'что это даёт'],
  tell: ['подскажи', 'подскажи про фотосинтез', 'просвети меня о науке', 'что тебе известно о гравитации'],
  emotion: ['круто', 'класс!', 'ого', 'ничего себе', 'вот это да', 'сложно', 'я запуталась', 'ничего не понятно', 'скучно'],
  social: ['спасибо', 'спасибо большое', 'спс', 'благодарю', 'привет', 'добрый вечер', 'пока', 'до свидания', 'мне пора'],
  agreement: ['понятно', 'ясно', 'логично', 'согласна', 'ну понятно', 'теперь понятно', 'в точку', 'хорошо'],
  disagreement: ['не согласна', 'неправда', 'не верю', 'ерунда', 'ты ошибаешься', 'это не так', 'сомневаюсь', 'вряд ли'],
  hedge: ['хм', 'ммм', 'эээ', 'ну и что', 'ладно', 'ну ладно'],
};

test('natural phrasings (polite, slang, short/long, typos, word order): ≥97% family accuracy', () => {
  let n = 0; const bad = [];
  for (const [fam, list] of Object.entries(NATURAL)) for (const q of list) {
    n++;
    const p = F.parse(q, freshState(), Date.now());
    if (famOf(p) !== fam) bad.push(q + ' → ' + famOf(p) + ' (want ' + fam + ')');
  }
  console.log('# talk natural: ' + n + ' phrasings, misses ' + bad.length);
  assert.ok(n >= 200, 'natural ' + n);
  assert.ok(bad.length / n <= 0.03, bad.join('\n'));
});

const HELD_OUT = ['поцелуй меня', 'обними меня', 'я сегодня гуляла в парке и видела белку', 'вчера был дождь, и мы сидели дома', 'создай заметку купить молоко',
  'открой файл отчёт', 'расскажи сказку', 'поставь будильник на семь', 'спасибо за ужин', 'пока не знаю', 'проще простого', 'ещё один день прошёл',
  'правда или действие', 'мне скучно без тебя', 'я тебя люблю', 'напиши стих про осень', 'какая погода завтра', 'включи музыку', 'мама пришла домой',
  'кот спит на диване', 'сегодня я пеку пирог', 'запиши в заметки идею', 'покажи мои файлы', 'удали заметку', 'напомни позвонить маме', 'класс у дочки дружный',
  'привет от бабушки передай', 'плюс один в очередь', 'другой день будет лучше', 'если завтра будет солнце пойдём гулять', 'ну и денёк', 'мне пора на работу, а потом в магазин',
  'круто мы вчера погуляли в лесу', 'не верю я в приметы', 'сравни цены на молоко', 'поцелуй меня ещё раз'];

test('0 false positives on ordinary chat (with and without context) → handed over unchanged', async () => {
  const fp = [];
  for (const q of HELD_OUT) for (const st of [F.create(), freshState()]) {
    const r = await F.respond(q, st, { lookup: C.lookup, pass: () => PASS });
    if (r !== PASS) fp.push(q + ' → ' + String(r).slice(0, 60));
  }
  assert.deepEqual(fp, []);
});

const DIALOGS = [
  [['что такое фотосинтез', /^📘 \*\*Фотосинтез\*\*/], ['что ты думаешь об этом', /Фотосинтез\*\* · мнение[\s\S]*Личного мнения у меня нет|своего мнения у меня нет|Мнения, как у человека/i],
    ['дай пример', /Фотосинтез\*\* · пример/], ['а как было бы по-другому', /Фотосинтез\*\* · другой вариант/], ['а сравни с гравитацией', /^⚖️ \*\*Фотосинтез\*\* и \*\*Гравитация\*\*/],
    ['подведи итог', /Фотосинтез\*\* · итог[\s\S]*Мы уже обсудили/]],
  [['объясни гравитацию', /Гравитация/], ['как считаешь, что будет, если она исчезнет', /Гравитация\*\* · что будет, если[\s\S]*🔮/], ['а если нет', /а если наоборот/],
    ['обдумай это', /рассуждение[\s\S]*1\. \*\*/], ['за и против', /за и против[\s\S]*➕ За/], ['в двух словах', /Гравитация\*\* · суть/], ['хватит', /остановимся/]],
  [['расскажи о науке', /^📘 \*\*Наука/], ['ты уверена?', /Наука\*\* · насколько/], ['уточни', /Наука\*\* · уточнение/], ['а исключения', /Наука\*\* · исключения/],
    ['ещё один', /Наука\*\* · ещё пример/], ['в чём смысл', /Наука\*\* · зачем/]],
  [['что такое наука', /Наука/], ['что такое физика', /Физика/], ['а в чём разница', /^⚖️ \*\*Физика\*\* и \*\*Наука\*\*/], ['подытожь', /Физика\*\* · итог/]],
  [['расскажи о фотосинтезе', /Фотосинтез/], ['проще', /Фотосинтез\*\* · проще[\s\S]*🧸/], ['усложни', /Фотосинтез\*\* · глубже[\s\S]*🎓/], ['повтори', /^🔁[\s\S]*глубже/]],
  [['что такое фотосинтез', /Фотосинтез/], ['с чего начать', /Фотосинтез\*\* · с чего начать[\s\S]*🚀/], ['по шагам', /Фотосинтез\*\* · по шагам[\s\S]*1\. /], ['что дальше', /^📘 \*\*Фотосинтез/]],
  [['что такое гравитация', /Гравитация/], ['другой вариант', /другой вариант[\s\S]*🔄/], ['ещё один', /другой вариант|ещё пример/], ['другими словами', /🔄/]],
  [['объясни фотосинтез', /Фотосинтез/], ['круто!', /^😊/], ['сложно', /^🤗/], ['понятно', /^👍/], ['спасибо', /^🙂/], ['пока', /^👋/], ['спасибо', /^⟪pass⟫$/]],
  [['что такое наука', /Наука/], ['не согласна', /Наука\*\* · проверим[\s\S]*🤔/], ['хм', /^🤔/], ['а что посоветуешь об этом', /Наука\*\* · совет[\s\S]*💡/]],
  [['расскажи о гравитации', /Гравитация/], ['плюсы', /Гравитация\*\* · плюсы[\s\S]*➕/], ['а минусы', /Гравитация\*\* · минусы и оговорки[\s\S]*➖/], ['почему так', /Гравитация\*\* · почему/]],
  [['что такое фотосинтез', /Фотосинтез/], ['что будет, если исчезнет гравитация', /Гравитация\*\* · что будет, если/], ['а в чём разница', /^⚖️ \*\*Гравитация\*\* и \*\*Фотосинтез\*\*/], ['подведи итог', /Гравитация\*\* · итог/]],
  [['как ты думаешь', /^⟪pass⟫$/], ['что такое фотосинтез', /Фотосинтез/], ['сравни', /С чем сравнить|Сравнить «Фотосинтез»/], ['сравни с гравитацией', /^⚖️ \*\*Фотосинтез\*\* и \*\*Гравитация\*\*/]],
];

test('12 multi-turn dialogues: opinion → example → alternative → compare → summary, context carry-over', async () => {
  const d = { lookup: C.lookup, pass: (q) => pass(q).then((r) => (r == null ? PASS : r)) };
  for (const dlg of DIALOGS) {
    const st = F.create(); const log = [];
    for (const [q, re] of dlg) {
      const r = await F.respond(q, st, d);
      log.push(q + ' → ' + String(r).slice(0, 90).replace(/\n/g, ' '));
      assert.match(String(r), re, log.join('\n'));
    }
  }
});

test('rotation: 3–6 wording variants, no immediate repeat', async () => {
  const st = F.create();
  await ask('что такое фотосинтез', st);
  let prev = null;
  for (let i = 0; i < 8; i++) {
    const r = await ask('что ты думаешь об этом', st);
    const intro = r.split('\n')[2];
    assert.notEqual(intro, prev, 'repeat at ' + i);
    prev = intro;
  }
  const st2 = F.create(); const seen = [];
  await ask('что такое гравитация', st2);
  for (let i = 0; i < 6; i++) seen.push((await ask('спасибо', st2)).split('\n')[0]);
  for (let i = 1; i < seen.length; i++) assert.notEqual(seen[i], seen[i - 1]);
  assert.ok(new Set(seen).size >= 3);
});

test('honest answers when data is missing; no network in chat; fail-safe without pack', async () => {
  const card = { id: 'kn:x', title: 'тест', a: 'Тест — проверка.', f: { short: 'Проверка.' }, kn: true };
  const st = F.create();
  assert.match(F.talk(card, 'opinion', st), /Личного мнения у меня нет|Мнения нет|Своего мнения не имею/);
  assert.match(F.talk(card, 'hypo', st), /в базе ничего нет|в базе нет|не описано|Не знаю/);
  assert.match(F.talk(card, 'cons', st), /в базе не записано|ничего нет|Не знаю/);
  assert.match(F.talk(card, 'another', st), /Примеров/);
  const calls = [];
  const g = globalThis, saved = g.fetch;
  g.fetch = (...a) => { calls.push(a); return Promise.reject(new Error('no network')); };
  try {
    const s2 = F.create();
    for (const q of ['что такое фотосинтез', 'что ты думаешь', 'что будет если он исчезнет', 'другой вариант', 'подведи итог', 'за и против']) await ask(q, s2);
  } finally { g.fetch = saved; }
  assert.equal(calls.length, 0);
  assert.equal(F.load(null), false);
  assert.equal(await F.respond('что ты думаешь об этом', F.create(), { lookup: C.lookup, pass: () => PASS }), PASS);
  assert.equal(F.load({ intents: [{ id: 'x', triggers: ['((('] }] }), true);
  F.load(PACK);
});

test('perf: parse + respond < 5 ms per phrase', async () => {
  const items = generate().slice(0, 600);
  const t0 = process.hrtime.bigint();
  for (const it of items) F.parse(it.q, freshState(), Date.now());
  const per = Number(process.hrtime.bigint() - t0) / 1e6 / items.length;
  const t1 = process.hrtime.bigint();
  const st = F.create();
  for (let i = 0; i < 100; i++) await ask(['что такое фотосинтез', 'что ты думаешь об этом', 'другой вариант', 'подведи итог'][i % 4], st);
  const per2 = Number(process.hrtime.bigint() - t1) / 1e6 / 100;
  console.log('# talk perf: parse ' + per.toFixed(3) + ' ms, respond ' + per2.toFixed(3) + ' ms');
  assert.ok(per < 5 && per2 < 5, per + ' / ' + per2);
});
