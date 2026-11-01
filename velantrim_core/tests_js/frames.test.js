// v14.14.0: EITI Frames — офлайн-понимание формулировок (local/eiti_frames.js) + карточки понятий kn_* + Википедия (чистые хелперы).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const F = require(path.join(ROOT, 'local', 'eiti_frames.js'));
const PACK = JSON.parse(fs.readFileSync(path.join(ROOT, 'local', 'eiti_frames.json'), 'utf8'));
const C = require(path.join(ROOT, 'kb', 'tests', 'concept.js'))();
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const SRC = fs.readFileSync(path.join(ROOT, 'local', 'eiti_frames.js'), 'utf8');
F.load(PACK);

// «прежний путь» в тестах: KB с уверенным ответом, иначе null (в приложении — KB + офлайн-диалоги)
function pass(q) {
  const h = C.engine.search(q, 3);
  return Promise.resolve(h[0] && C.engine.confident(h[0]) ? '🧠 KB ' + h[0].id : null);
}
const deps = { lookup: C.lookup, pass };
const ask = (q, st) => F.respond(q, st || F.create(), deps);

test('module is pure: no DOM, no localStorage, no network', () => {
  const code = SRC.replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(code, /\bdocument\.|\blocalStorage\b|\bfetch\(|XMLHttpRequest|\beval\(|new Function/);
  assert.doesNotMatch(code, /\(\?<[=!]/, 'no lookbehind (old Safari)');
});

test('43 phrasings: concept questions in any word order and with many verbs', async () => {
  const card = [
    ['Расскажи о науке', 'Наука'], ['Скажи о науке', 'Наука'], ['о науке расскажи', 'Наука'], ['объясни науку', 'Наука'],
    ['что такое наука', 'Наука'], ['наука', 'Наука'], ['поясни что такое наука', 'Наука'], ['растолкуй науку', 'Наука'],
    ['разложи по полочкам науку', 'Наука'], ['скажи по сути что такое наука', 'Наука'], ['зачем нужна наука', 'Наука'],
    ['когда появилась наука', 'Наука'], ['как работает наука', 'Наука'], ['с кем связана наука', 'Наука'],
    ['откуда взялась наука', 'Наука'], ['для чего наука', 'Наука'], ['это точно что наука доказывает', 'Наука'],
    ['каким образом наука развивается', 'Наука'], ['что такое фотосинтез', 'Фотосинтез'], ['расскажи о фотосинтезе', 'Фотосинтез'],
    ['о фотосинтезе расскажи', 'Фотосинтез'], ['объясни фотосинтез', 'Фотосинтез'], ['поясни фотосинтез', 'Фотосинтез'],
    ['растолкуй фотосинтез', 'Фотосинтез'], ['откуда взялась луна', 'Луна'], ['расскажи о космосе', 'Космос'],
    ['объясни гравитацию', 'Гравитация'], ['что такое гравитация', 'Гравитация'], ['расскажи о физике', 'Физика'],
    ['что такое физика', 'Физика'], ['расскажи о истории', 'История'], ['Поцелуй о науке', 'Наука'],
  ];
  for (const [q, t] of card) {
    const r = await ask(q);
    assert.ok(r && (r.indexOf('**' + t) >= 0 || r.indexOf('«' + t + '»') >= 0), q + ' → ' + (r && r.slice(0, 80)));
  }
  // обычные вопросы KB идут прежним путём (формат KB, «Похожие»)
  for (const q of ['почему небо голубое', 'поясни почему небо голубое', 'скажи по сути почему небо голубое', 'кто такой Наполеон',
    'расскажи про Наполеона', 'поясни кто такой наполеон', 'сколько лет Земле', 'расскажи о Москве']) {
    const r = await ask(q);
    assert.match(String(r), /^🧠 KB /, q + ' → ' + r);
  }
  // честно «не знаю» → null (дальше Википедия / кнопки)
  for (const q of ['Расскажи стих', 'сколько наук существует', 'когда родился Наполеон']) {
    const r = await ask(q);
    assert.ok(r == null || !/^📘/.test(r), q + ' → ' + r);
  }
  // поля карточки: «зачем / когда / как / кто / откуда / это точно» → разные разделы
  const fields = { 'зачем нужна наука': 'зачем', 'когда появилась наука': 'когда', 'как работает наука': 'как это устроено',
    'с кем связана наука': 'кто', 'откуда взялась наука': 'откуда', 'это точно что наука доказывает': 'проверено', 'скажи по сути что такое наука': 'суть' };
  for (const [q, f] of Object.entries(fields)) assert.ok((await ask(q)).split('\n')[0].indexOf(f) >= 0, q);
});

test('Moon phases have a substantial detail field, separate from examples', async () => {
  const card = C.concept('фазы луны');
  assert.ok(card && card.f && card.f.detail, 'exact Moon-phases query resolves to a concept card');
  assert.ok(card.f.detail.length > 800, 'detail is substantially longer than a short answer');
  const st = F.create();
  const first = await ask('что такое фазы луны', st);
  assert.match(first, /📘 \*\*Фазы луны\*\*/);
  assert.match(first, /узнать подробнее/);
  const more = await ask('объясни подробнее', st);
  assert.match(more, /Фазы луны\*\* · подробное объяснение/);
  assert.match(more, /Восемь фаз/);
  assert.ok(more.length > first.length + 800);
  const example = await ask('пример', st);
  assert.match(example, /Фазы луны\*\* · пример/);
  assert.match(example, /через неделю/);
});

test('3 multi-turn dialogues: follow-ups keep the topic', async () => {
  let st = F.create();
  assert.match(await ask('Расскажи о науке', st), /^📘 \*\*Наука\*\*/);
  assert.match(await ask('а зачем?', st), /Наука\*\* · зачем/);
  assert.match(await ask('а когда появилась?', st), /Наука\*\* · когда/);
  assert.match(await ask('ещё', st), /^📘 \*\*Наука/);
  assert.match(await ask('хватит', st), /остановимся/);
  assert.equal(st.card, null);

  st = F.create();
  assert.match(await ask('что такое фотосинтез', st), /Фотосинтез/);
  assert.match(await ask('а зачем он нужен?', st), /Фотосинтез\*\* · зачем/);
  assert.match(await ask('пример', st), /Фотосинтез\*\* · пример/);
  assert.match(await ask('это точно?', st), /Фотосинтез\*\* · насколько/);

  st = F.create();
  assert.match(await ask('объясни гравитацию', st), /Гравитация/);
  assert.match(await ask('а кто открыл?', st), /Ньютон/);
  assert.match(await ask('подробнее', st), /Гравитация/);
  // новая тема сбрасывает старую
  assert.match(await ask('расскажи о космосе', st), /Космос/);
  assert.match(await ask('а зачем?', st), /Космос/);
});

test('follow-up expires (TTL) and needs a card', async () => {
  const st = F.create();
  await F.respond('объясни гравитацию', st, Object.assign({ now: 1e12 }, deps));
  const late = await F.respond('а зачем?', st, Object.assign({ now: 1e12 + F.TTL + 1 }, deps));
  assert.ok(late == null || !/Гравитация/.test(late));
  assert.equal(await ask('а зачем?'), null);
});

test('defer list: commands and own-data questions go the old way', async () => {
  for (const q of ['расскажи сказку', 'скажи сколько будет 2+2', 'объясни мою заметку про отпуск', 'найди в заметках науку', 'поставь таймер на 5 минут', 'переведи слово наука']) {
    const p = F.parse(q, null, 0);
    assert.ok(!p || p.kind === 'defer' || p.field === 'how_to' || !/^📘/.test(String(await ask(q))), q);
  }
  assert.equal(F.parse('расскажи сказку', null, 0).kind, 'defer');
});

test('false-positive guards: «поцелуй меня», «правда», chit-chat', async () => {
  for (const q of ['поцелуй меня', 'правда', 'это правда?', 'привет', 'как дела', 'спасибо', 'какая погода', 'скороговорку', 'который час']) {
    const r = await ask(q);
    assert.ok(r == null || !/^📘/.test(r), q + ' → ' + r);
  }
  const p = F.parse('поцелуй меня', null, 0);
  assert.ok(!p || !p.slip, 'slip only before a topic');
  assert.equal(F.parse('Поцелуй о науке', null, 0).slip != null, true);
});

test('homonyms and inflections reach the right card (or nothing)', () => {
  const ok = { 'науке': 'kn_science', 'космосе': 'kn_space', 'гравитации': 'kn_physics', 'луне': null, 'звёздах': null };
  for (const [t, d] of Object.entries(ok)) {
    const c = C.concept(t);
    assert.ok(c, t);
    if (d) assert.equal(c.domain, d, t);
  }
  for (const t of ['скороговорку', 'время', 'привет']) {
    const c = C.concept(t);
    assert.ok(!c || !c.kn, t + ' → ' + (c && c.title));
  }
  // «матрица» (фильм) не уходит в математику
  const m = C.concept('матрица');
  assert.ok(!m || m.domain !== 'kn_math');
});

test('fallback text + marker (buttons) when nothing answers', () => {
  const t = F.fallbackText(F.topicOf('расскажи про квазибульбу'));
  assert.match(t, /квазибульб/);
  assert.match(t, /⟦EITIFB:[^⟧]*⟧$/);
  assert.match(F.fallbackText(''), /⟦EITIFB:⟧$/);
  // v14.14.0: коротко и честно + подсказка про обновление базы в Настройках
  assert.match(F.fallbackText('шоколад'), /^🤷 Не знаю, этого нет в базе: «шоколад»\.\n[^\n]*Настройк[^\n]*🔄 Обновить базу офлайн-ответов/);
  assert.match(F.fallbackText(''), /^🤷 Не знаю, этого нет в базе\./);
  assert.ok(F.fallbackText('шоколад').length < 260, 'fallback stays short');
  assert.equal(F.topicOf('расскажи сказку'), '');
  // хост рисует кнопки по маркеру, маркер не попадает в заметки/копирование
  assert.match(HTML, /⟦EITIFB:\(\[\^⟧\]\*\)⟧\/g, function\(_m, tp\)\{[^\n]*EitiFramesHost\.bar\(tp\)/);
  assert.match(HTML, /\.replace\(\/\\n\*⟦EITIFB:\[\^⟧\]\*⟧\/g, ''\)/);
  assert.match(HTML, /🔍 Поискать в заметках/);
  assert.match(HTML, /🤖 Включить ИИ/);
});

test('API-key warning stays only for explicit AI features; offline chain uses last resort', () => {
  assert.match(HTML, /function eitiAiUnavailable\(\)/);
  assert.match(HTML, /EitiFramesHost\.lastResort\(userText\)/);
  assert.match(HTML, /EitiOffline\.replyText = function\(text, opts\) \{ return EitiFramesHost\.reply\(text, opts, orig\); \}/);
  // frames layer sits before EITI LOCAL wrapper block (so Local/DState stay outermost)
  assert.ok(HTML.indexOf('var EitiFramesHost = (function()') < HTML.indexOf('// ── v14.2.0: EITI LOCAL'));
  assert.match(HTML, /<script src="\.\/local\/eiti_frames\.js" defer><\/script>/);
});

test('Wikipedia helpers: URLs, pick, sanitize, format', () => {
  assert.equal(F.wikiSearchUrl('наука', 'ru').indexOf('https://ru.wikipedia.org/w/api.php?'), 0);
  assert.match(F.wikiSearchUrl('x', 'en'), /^https:\/\/en\.wikipedia\.org\/.*origin=\*/);
  assert.match(F.wikiSummaryUrl('Чёрная дыра', 'ru'), /rest_v1\/page\/summary\/%D0%A7/);
  assert.equal(F.wikiPick({ query: { search: [{ title: 'Наука' }] } }), 'Наука');
  assert.equal(F.wikiPick({}), null);
  const r = F.wikiClean({ title: '<b>Наука</b>', extract: 'Наука — <script>alert(1)</script> область **деятельности** ⟦EITIFB:x⟧ человека по получению знаний.', content_urls: { desktop: { page: 'javascript:alert(1)' } } }, 'ru');
  assert.equal(r.title, 'Наука');
  assert.doesNotMatch(r.text, /[<>*⟦⟧]/);
  assert.equal(r.url, 'https://ru.wikipedia.org/wiki/%D0%9D%D0%B0%D1%83%D0%BA%D0%B0');
  assert.equal(F.wikiClean({ type: 'disambiguation', title: 'a', extract: 'xxxxxxxxxxxxxxxxxxxxxxxxx' }, 'ru'), null);
  assert.equal(F.wikiClean({ title: 'a', extract: 'short' }, 'ru'), null);
  const long = F.wikiClean({ title: 'T', extract: ('Предложение номер один про науку. ').repeat(60) }, 'en');
  assert.ok(long.text.length <= 701);
  assert.match(F.wikiFormat(long), /^🌐 \*\*из Википедии · T\*\* \(англ\.\)/);
  assert.match(F.wikiFormat({ title: 'Шоколад', text: 'Шоколад — кондитерское изделие.', url: 'https://ru.wikipedia.org/wiki/x', lang: 'ru' }), /^🌐 \*\*из Википедии · Шоколад\*\*\n\n/);
});

test('Base update host: only by button, manifest+hashes, miss log, local wiki cards, no network in answers', () => {
  const i = HTML.indexOf('var EitiBaseHost = (function()'), h = HTML.slice(i, HTML.indexOf('window.EitiBaseHost = EitiBaseHost;'));
  assert.ok(i > 0 && h.length > 2000);
  assert.match(h, /indexedDB\.open\('eiti_offline', 1\)/);
  assert.match(h, /credentials: same \? 'same-origin' : 'omit', referrerPolicy: 'no-referrer'/);
  assert.match(h, /MS = 8000/);
  assert.match(h, /offline_manifest\.json\?u='/);
  assert.match(h, /crypto\.subtle\.digest\('SHA-256'/);
  assert.match(h, /got !== h \|\| !json\(b\)/);
  assert.match(h, /navigator\.onLine === false\) \{ msg\(L\('📴 Нет интернета/);
  assert.match(HTML, /addDict\('en', \{"🔄 База офлайн-ответов": "🔄 Offline answer base"/);   // EN/DE без кириллицы
  assert.match(h, /'miss:list'/);
  assert.match(h, /'wcard:' \+ k/);
  assert.match(h, /localStorage\.getItem\(WIKI\)[^\n]*return v !== '0'/);      // «из Википедии» по умолчанию ВКЛ
  assert.doesNotMatch(h, /setInterval|sendBeacon|navigator\.sendBeacon|XMLHttpRequest/);
  assert.doesNotMatch(h, /innerHTML/);                                       // список тем — только textContent
  // ответы: lastResort без сети — карточка из IndexedDB или «нет в базе» + журнал
  const lr = HTML.slice(HTML.indexOf('function lastResort(text)'), HTML.indexOf('function reload()'));
  assert.match(lr, /B\.card\(topic\)/);
  assert.match(lr, /B\.logMiss\(topic\)/);
  assert.doesNotMatch(lr, /fetch|wikipedia|update\(/i);
  assert.doesNotMatch(HTML, /EitiWikiHost|eiti_wiki_offline|eiti-wiki-offline|eitiWikiSet/);
  // UI в Настройках
  assert.match(HTML, /id="eiti-base-update" onclick="eitiBaseUpdate\(\)"[^>]*>🔄 Обновить базу офлайн-ответов</);
  assert.match(HTML, /id="eiti-base-wiki" checked onchange="eitiBaseWikiSet\(this\.checked\)"><span[^>]*>Добавлять темы, на которые не было ответа, из Википедии</);
  assert.match(HTML, /id="eiti-base-last"/);
  assert.match(HTML, /id="eiti-base-miss-clear" onclick="eitiBaseMissClear\(\)"/);
  assert.match(HTML, /function reset\(\) \{ eng = null; idx = null; initP = null; lazyP = null;/);
});

test('respond survives a broken pack or failing lookup', async () => {
  const st = F.create();
  const r = await F.respond('расскажи о науке', st, { lookup: () => Promise.resolve(null), pass: () => Promise.resolve('old') });
  assert.equal(r, 'old');
  assert.equal(F.load(null), false);
  F.load(PACK);
  assert.ok(F.loaded());
});
