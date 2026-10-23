// VELANTRIM EITI v14.5.0 — память диалога для офлайн-рассуждения (RU/EN/DE).
// Слоты: topic, entity (кто/что), place, time, goal, mood. Каждая реплика заполняет слоты (observe),
// последующие — разрешают отсылки «там / тогда / он / она / это / it / there / dort» (resolve).
// Стек тем: отступление кладёт тему в стек; «о чём мы говорили», «вернёмся к X», «back to X», «zurück zu X» — возврат.
// Лёгкие фреймы задач с уточняющими вопросами: поездка (куда, когда), выбор между вариантами (критерий).
// «Ты про X или про Y?» — когда отсылка неоднозначна. summary() — компактная сводка для контекста ИИ.
// Чистые функции + сериализуемое состояние (маленькое, с лимитами) — хост хранит его в IndexedDB.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EitiDState = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var TTL = { place: 10, time: 10, goal: 10, entity: 6, mood: 4, topic: 15 }, STACK_MAX = 6, STR_MAX = 60;

  // ───────────── места: [id, en, de(dat), de-nach, ru nom, класс склонения | {loc, acc, gen, re}] ─────────────
  // классы: ia — Грузия (в Грузии / в Грузию / из Грузии), a — Москва, m — Париж, j — Китай, soft — Казань, x — несклоняемое
  var PL = [
    ['georgia', 'Georgia', 'Georgien', 'ia', 'Грузия'], ['armenia', 'Armenia', 'Armenien', 'ia', 'Армения'],
    ['turkey', 'Turkey', 'der Türkei', 'ia', 'Турция', { de2: 'in die Türkei', deRe: 'türkei' }], ['italy', 'Italy', 'Italien', 'ia', 'Италия'],
    ['spain', 'Spain', 'Spanien', 'ia', 'Испания'], ['france', 'France', 'Frankreich', 'ia', 'Франция'],
    ['germany', 'Germany', 'Deutschland', 'ia', 'Германия'], ['japan', 'Japan', 'Japan', 'ia', 'Япония'],
    ['greece', 'Greece', 'Griechenland', 'ia', 'Греция'], ['portugal', 'Portugal', 'Portugal', 'ia', 'Португалия'],
    ['czechia', 'Czechia', 'Tschechien', 'ia', 'Чехия'], ['austria', 'Austria', 'Österreich', 'ia', 'Австрия'],
    ['switzerland', 'Switzerland', 'der Schweiz', 'ia', 'Швейцария', { de2: 'in die Schweiz', deRe: 'schweiz' }], ['norway', 'Norway', 'Norwegen', 'ia', 'Норвегия'],
    ['finland', 'Finland', 'Finnland', 'ia', 'Финляндия'], ['russia', 'Russia', 'Russland', 'ia', 'Россия'],
    ['england', 'England', 'England', 'ia', 'Англия'], ['china', 'China', 'China', 'j', 'Китай'],
    ['egypt', 'Egypt', 'Ägypten', 'm', 'Египет', { loc: 'в Египте', acc: 'в Египет', gen: 'из Египта', re: 'египе?т(?:|а|е|у|ом)' }],
    ['thailand', 'Thailand', 'Thailand', 'm', 'Таиланд'], ['kazakhstan', 'Kazakhstan', 'Kasachstan', 'm', 'Казахстан'],
    ['uzbekistan', 'Uzbekistan', 'Usbekistan', 'm', 'Узбекистан'], ['usa', 'the USA', 'den USA', 'x', 'США', { de2: 'in die USA', deRe: 'usa', enRe: 'usa|the us|america' }],
    ['europe', 'Europe', 'Europa', 'a', 'Европа'], ['moscow', 'Moscow', 'Moskau', 'a', 'Москва'],
    ['spb', 'Saint Petersburg', 'Sankt Petersburg', 'm', 'Петербург', { re: '(?:санкт-)?петербург(?:|а|е|у|ом)|питер(?:|а|е|у|ом)', enRe: '(?:saint |st\\.? )?petersburg' }],
    ['paris', 'Paris', 'Paris', 'm', 'Париж'], ['rome', 'Rome', 'Rom', 'm', 'Рим'], ['berlin', 'Berlin', 'Berlin', 'm', 'Берлин'],
    ['london', 'London', 'London', 'm', 'Лондон'], ['madrid', 'Madrid', 'Madrid', 'm', 'Мадрид'], ['istanbul', 'Istanbul', 'Istanbul', 'm', 'Стамбул'],
    ['minsk', 'Minsk', 'Minsk', 'm', 'Минск'], ['newyork', 'New York', 'New York', 'm', 'Нью-Йорк'], ['prague', 'Prague', 'Prag', 'a', 'Прага', { gen: 'из Праги' }],
    ['vienna', 'Vienna', 'Wien', 'a', 'Вена'], ['barcelona', 'Barcelona', 'Barcelona', 'a', 'Барселона'], ['kazan', 'Kazan', 'Kasan', 'soft', 'Казань'],
    ['tbilisi', 'Tbilisi', 'Tiflis', 'x', 'Тбилиси', { deRe: 'tiflis|tbilisi' }], ['tokyo', 'Tokyo', 'Tokio', 'x', 'Токио'], ['sochi', 'Sochi', 'Sotschi', 'x', 'Сочи']
  ];
  function lc(s) { return String(s || '').toLowerCase().replace(/ё/g, 'е'); }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  var PLACES = PL.map(function (p) {
    var o = p[5] || {}, ru = p[4], cls = p[3], st, loc, acc, gen, re;
    if (cls === 'ia') { st = ru.slice(0, -1); loc = st + 'и'; acc = st + 'ю'; gen = st + 'и'; re = lc(st) + '(?:я|ю|и|ей)'; }
    else if (cls === 'a') { st = ru.slice(0, -1); loc = st + 'е'; acc = st + 'у'; gen = st + 'ы'; re = lc(st) + '(?:а|у|е|ы|и|ой)'; }
    else if (cls === 'j') { st = ru.slice(0, -1); loc = st + 'е'; acc = ru; gen = st + 'я'; re = lc(st) + '(?:й|я|е|ю|ем)'; }
    else if (cls === 'soft') { st = ru.slice(0, -1); loc = st + 'и'; acc = ru; gen = st + 'и'; re = lc(st) + '(?:ь|и|ью)'; }
    else if (cls === 'm') { loc = ru + 'е'; acc = ru; gen = ru + 'а'; re = lc(ru) + '(?:|а|е|у|ом)'; }
    else { loc = ru; acc = ru; gen = ru; re = lc(ru); }
    var de = p[2], deNom = de.replace(/^(der|den) /, '');
    return {
      id: p[0], en: p[1], de: deNom,
      ru: { nom: ru, loc: o.loc || 'в ' + loc, acc: o.acc || 'в ' + acc, gen: o.gen || 'из ' + gen },
      enLoc: 'in ' + p[1], deLoc: 'in ' + de, deTo: o.de2 || 'nach ' + de,
      re: new RegExp('(^|[^а-яa-zäöüß])(?:' + (o.re || re) + '|' + (o.enRe || esc(lc(p[1]).replace(/^the /, ''))) + '|' + (o.deRe || esc(lc(deNom))) + ')(?=[^а-яa-zäöüß]|$)')
    };
  });
  function findPlace(text) {
    var s = ' ' + lc(text) + ' ', best = null, bi = -1;
    for (var i = 0; i < PLACES.length; i++) { var m = PLACES[i].re.exec(s); if (m && m.index > bi) { bi = m.index; best = PLACES[i]; } }
    return best;
  }
  function placeById(id) { for (var i = 0; i < PLACES.length; i++) if (PLACES[i].id === id) return PLACES[i]; return null; }

  // ───────────── время ─────────────
  var TIMES = [
    ['spring', 'весн(?:а|у|ой|е)', 'spring', 'frühling|fruehling|frühjahr', 'весной', 'in spring', 'im Frühling'],
    ['summer', 'лет(?:о|ом)', 'summer', 'sommer', 'летом', 'in summer', 'im Sommer'],
    ['autumn', 'осен(?:ь|ью)', 'autumn|fall', 'herbst', 'осенью', 'in autumn', 'im Herbst'],
    ['winter', 'зим(?:а|у|ой|е)', 'winter', 'winter', 'зимой', 'in winter', 'im Winter'],
    ['tomorrow', 'завтра', 'tomorrow', 'morgen', 'завтра', 'tomorrow', 'morgen'],
    ['weekend', 'на выходных|в выходные', '(?:at|on|this|the) weekend', 'am wochenende', 'на выходных', 'at the weekend', 'am Wochenende'],
    ['nextweek', 'на следующей неделе', 'next week', 'nächste woche|naechste woche', 'на следующей неделе', 'next week', 'nächste Woche'],
    ['nextyear', 'в следующем году', 'next year', 'nächstes jahr|naechstes jahr', 'в следующем году', 'next year', 'nächstes Jahr']
  ];
  var MONTHS = [['январ', 'january', 'januar', 'январе'], ['феврал', 'february', 'februar', 'феврале'], ['март', 'march', 'märz', 'марте'], ['апрел', 'april', 'april', 'апреле'],
    ['ма[йяе]', 'may', 'mai', 'мае'], ['июн', 'june', 'juni', 'июне'], ['июл', 'july', 'juli', 'июле'], ['август', 'august', 'august', 'августе'],
    ['сентябр', 'september', 'september', 'сентябре'], ['октябр', 'october', 'oktober', 'октябре'], ['ноябр', 'november', 'november', 'ноябре'], ['декабр', 'december', 'dezember', 'декабре']];
  function B(src) { return new RegExp('(^|[^а-яa-zäöüß])(?:' + src + ')(?=[^а-яa-zäöüß]|$)'); }
  var TIME_RE = TIMES.map(function (t) { return { id: t[0], re: B(t[1] + '|' + t[2] + '|' + t[3]), ru: t[4], en: t[5], de: t[6] }; });
  var MONTH_RE = MONTHS.map(function (m, i) {
    var en = m[1].charAt(0).toUpperCase() + m[1].slice(1), de = m[2].charAt(0).toUpperCase() + m[2].slice(1);
    return { id: 'm' + (i + 1), re: B('в ' + m[0] + '[а-я]*|in ' + m[1] + '|im ' + m[2]), ru: 'в ' + m[3], en: 'in ' + en, de: 'im ' + de };
  });
  function findTime(text) {
    var s = ' ' + lc(text) + ' ', i;
    for (i = 0; i < MONTH_RE.length; i++) if (MONTH_RE[i].re.test(s)) return MONTH_RE[i];
    for (i = 0; i < TIME_RE.length; i++) if (TIME_RE[i].re.test(s)) {
      if (TIME_RE[i].id === 'tomorrow' && /guten morgen|good morning|доброе утро/.test(s)) continue;
      return TIME_RE[i];
    }
    return null;
  }

  // ───────────── цель, настроение, сущность ─────────────
  var TRIP_RE = /(?:хочу|хотим|хотела?|планирую|планируем|собираюсь|собираемся|мечтаю|думаю|поеду|поедем|еду|едем|полечу|летим|лечу)\s+(?:бы\s+)?(?:поехать|съездить|полететь|слетать|отправиться|махнуть|сгонять|попасть|отдохнуть|в отпуск|в путешествие|на отдых)?\s*(?:в|во|на)\s|(?:план[а-яё]*|организ[а-яё]*|спланир[а-яё]*|мечтаю о|хочу|хотим)\s+(?:о\s+)?(?:поездк|путешеств|отпуск)|^(?:поездк|путешестви)[а-яё]*\s+(?:в|во|на)\s|\b(?:want|wanna|plan(?:ning)?|going|like) to (?:go|travel|fly|visit)\b|\b(?:trip|travel|vacation|holiday) to\b|\bplan(?:ning)? a trip\b|\b(?:want|need|planning) a (?:vacation|holiday|trip)\b|\bgo(?:ing)? on (?:a )?(?:vacation|holiday|trip)\b|\bich (?:will|möchte|moechte|würde gern|fahre|fliege|reise)\b.*\b(?:nach|in die|in den|reisen|fahren|fliegen)\b|\b(?:reise|urlaub|fahrt) nach\b|\burlaub\b/;
  var CHOOSE_RE = /(?:^|\s)(?:что|какой|какая|какое|какую|кого|куда)\s+(?:лучше|выбрать|взять|купить)|выбрать между|не могу выбрать|помоги выбрать|\b(?:which|what) (?:is|one is|should i|to) (?:better|choose|pick|take|buy)\b|\bshould i (?:choose|pick|take|buy|get)\b|\bhelp me (?:choose|decide|pick)\b|\bchoose between\b|\b(?:was|welches|welcher|welche) (?:ist )?(?:besser|soll ich|nehmen|kaufen|wählen)\b|\bhilf mir (?:zu )?(?:wählen|entscheiden)\b/;
  var MOODS = [['tired', 'устал|устала|вымотал|без сил|tired|exhausted|müde|erschöpft'], ['sad', 'грустно|печально|плохо мне|тоскливо|sad|unhappy|down|traurig|schlecht'],
    ['happy', 'радостно|счастлив|отлично|здорово|супер|happy|great|glad|glücklich|froh|super'], ['angry', 'злюсь|бесит|раздражает|angry|annoyed|wütend|sauer'],
    ['anxious', 'тревожно|волнуюсь|боюсь|nervous|anxious|worried|ängstlich|sorge']];
  var MOOD_RE = MOODS.map(function (m) { return { id: m[0], re: B(m[1]) }; });
  var ENT_RE = [
    /(?:^|\s)кто так(?:ой|ая|ие)\s+(.+)/, /(?:^|\s)что так(?:ое|ая|ой)\s+(.+)/, /(?:^|\s)расскажи(?: мне)?\s+(?:про|о|об|обо)\s+(.+)/, /(?:^|\s)(?:что ты знаешь|что знаешь)\s+(?:про|о|об)\s+(.+)/,
    /\bwho (?:is|was)\s+([^?]+?)(?:\s+(?:famous|known|born)\b.*)?$/, /\bwhat (?:is|are) (?:a |an |the )?([^?\s]+(?:\s[^?\s]+)?)\s*\??$/, /\btell me about\s+(.+)/,
    /\bwer (?:ist|war)\s+(.+)/, /\bwas ist (?:ein |eine |der |die |das )?([^?\s]+(?:\s[^?\s]+)?)\s*\??$/, /\berzähl(?:e)?(?: mir)? (?:von|über)\s+(.+)/
  ];
  function cleanEnt(s) { return String(s || '').replace(/[?!.…,;:]+$/g, '').replace(/\s+/g, ' ').trim().slice(0, 40); }
  function findEntity(text) {
    var raw = String(text || '').trim(), s = raw.toLowerCase();
    if (/\d\s*[-+*/×÷^%]\s*\d|[-+*/×÷]\s*\d/.test(s)) return null;
    for (var i = 0; i < ENT_RE.length; i++) {
      var m = ENT_RE[i].exec(s); if (!m) continue;
      var off = s.indexOf(m[1], m.index), v = cleanEnt(raw.substr(off, m[1].length));
      if (!v || v.length < 2 || /^(это|ты|я|он|она|it|this|that|you|das|es|du)$/i.test(v)) return null;
      return { text: v, g: /кто такая/.test(s) ? 'f' : /кто такой/.test(s) ? 'm' : guessG(v) };
    }
    return null;
  }
  function guessG(v) {
    var w = lc(v).split(' ')[0];
    if (/[а-я]/.test(w)) return /(?:а|я)$/.test(w) && !/(?:ина|ья)$/.test('') ? 'f' : (/(?:о|е)$/.test(w) ? 'n' : 'm');
    return 'n';
  }
  function findOptions(text) {
    var s = String(text || '').replace(/[?!.]+$/, '').trim();
    var m = /(?:между\s+)?([^\s,]+(?:\s[^\s,]+)?)\s+(?:или|or|oder)\s+([^\s,?]+(?:\s[^\s,?]+)?)$/i.exec(s);
    if (!m) return null;
    var a = m[1].replace(/^(?:между|between|zwischen|взять|купить|выбрать|choose|pick|take|buy|get|nehmen|kaufen|lieber|лучше|better|besser)\s+/i, ''), b = m[2];
    a = a.split(' ').slice(-1)[0]; if (b.split(' ').length > 1 && /^(?:the|a|an|der|die|das|ein|eine)$/i.test(b.split(' ')[0])) b = b.split(' ').slice(1).join(' ');
    return a && b && lc(a) !== lc(b) ? [a.slice(0, 30), b.slice(0, 30)] : null;
  }

  // ───────────── состояние ─────────────
  function create(saved) {
    var st = { v: 1, turn: 0, slots: {}, stack: [], topic: null, frame: null, pending: null };
    if (saved && saved.v === 1) for (var k in st) if (saved[k] !== undefined) st[k] = saved[k];
    return st;
  }
  function setSlot(st, k, val) { st.slots[k] = { v: val, t: st.turn }; }
  function slot(st, k) { var s = st.slots[k]; return s && st.turn - s.t <= TTL[k] ? s.v : null; }
  function decay(st) {
    for (var k in st.slots) if (st.turn - st.slots[k].t > TTL[k]) delete st.slots[k];
    st.stack = st.stack.filter(function (x) { return st.turn - x.t <= TTL.topic; }).slice(-STACK_MAX);
    if (st.frame && st.turn - st.frame.t > 4) st.frame = null;
    if (st.pending && st.turn - st.pending.t > 1) st.pending = null;
  }
  function labelOf(tp, L) {
    if (!tp) return '';
    if (tp.kind === 'place') { var p = placeById(tp.id); return p ? (L === 'ru' ? p.ru.nom : L === 'de' ? p.de : p.en) : tp.label; }
    return tp.label;
  }
  function snapshot(st) { var o = {}; for (var k in st.slots) if (k !== 'mood') o[k] = st.slots[k].v; return o; }
  function setTopic(st, tp) {
    if (st.topic && st.topic.key === tp.key) { st.topic.t = st.turn; return; }
    st.stack = st.stack.filter(function (x) { return x.key !== tp.key; });
    if (st.topic) {
      st.stack = st.stack.filter(function (x) { return x.key !== st.topic.key; });
      st.stack.push({ key: st.topic.key, kind: st.topic.kind, id: st.topic.id, label: st.topic.label, t: st.turn, slots: snapshot(st) });
      st.stack = st.stack.slice(-STACK_MAX);
    }
    st.topic = { key: tp.key, kind: tp.kind, id: tp.id, label: tp.label, t: st.turn };
  }
  // observe(st, text) → { place, time, goal, mood, entity, options } — найденное в реплике; состояние обновлено
  // opts.refs — какие отсылки разрешил resolve (подставленную сущность заново не извлекаем)
  function observe(st, text, opts) {
    st.turn++; decay(st);
    var refs = (opts && opts.refs) || [];
    var f = {}, p = findPlace(text), t = findTime(text), e = refs.length ? null : findEntity(text), s = ' ' + lc(text) + ' ', i;
    if (p) { f.place = p.id; if (slot(st, 'place') !== p.id) delete st.slots.time; setSlot(st, 'place', p.id); }
    if (t) { f.time = t.id; setSlot(st, 'time', t.id); }
    if (TRIP_RE.test(s) && !/замет|note|notiz|\bтег|\btag/.test(s) && (p || /поездк|путешеств|отпуск|trip|travel|vacation|holiday|urlaub|reise/.test(s))) {
      // новая поездка без места — старые место/время не подставляем, спрашиваем заново
      if (!p) { delete st.slots.place; if (!t) delete st.slots.time; }
      f.goal = 'trip'; setSlot(st, 'goal', 'trip');
    }
    else if (CHOOSE_RE.test(s) || (/\s(?:или|or|oder)\s/.test(s) && /\?\s*$/.test(String(text)) && findOptions(text))) {
      var opts = findOptions(text);
      if (opts) { f.goal = 'choose'; f.options = opts; setSlot(st, 'goal', 'choose'); setSlot(st, 'options', opts); }
    }
    for (i = 0; i < MOOD_RE.length; i++) if (MOOD_RE[i].re.test(s)) { f.mood = MOOD_RE[i].id; setSlot(st, 'mood', f.mood); break; }
    if (e && !(p && lc(e.text).indexOf(lc(p.ru.nom).slice(0, 4)) >= 0)) { f.entity = e; setSlot(st, 'entity', e); }
    if (p) setTopic(st, { key: 'place:' + p.id, kind: 'place', id: p.id, label: p.ru.nom });
    else if (f.entity) setTopic(st, { key: 'ent:' + lc(f.entity.text), kind: 'entity', label: f.entity.text });
    else if (f.goal === 'choose') setTopic(st, { key: 'choose:' + lc(f.options.join('|')), kind: 'choose', label: f.options.join(' / ') });
    clamp(st);
    return f;
  }
  function clamp(st) {
    if (st.topic && st.topic.label) st.topic.label = String(st.topic.label).slice(0, STR_MAX);
    var j = JSON.stringify(st);
    while (j.length > 4000 && st.stack.length) { st.stack.shift(); j = JSON.stringify(st); }
  }

  // ───────────── разрешение отсылок ─────────────
  var W = '[^а-яa-zäöüß]';
  function rep(text, word, val) {
    var re = new RegExp('(^|' + W + ')(' + word + ')(?=' + W + '|$)', 'i');
    if (!re.test(text)) return null;
    return text.replace(re, function (m, a) { return a + val; });
  }
  // resolve(st, text, L) → { text, changed, refs:[…] } | { clarify: {q, options} }
  function resolve(st, text, L) {
    var out = String(text || ''), refs = [], p = placeById(slot(st, 'place')), t = slot(st, 'time'), e = slot(st, 'entity'), r, tm;
    tm = t ? (findTimeById(t)) : null;
    var hasPlaceInText = !!findPlace(out);
    if (p && !hasPlaceInText) {
      if ((r = rep(out, 'оттуда', p.ru.gen))) { out = r; refs.push('place'); }
      if ((r = rep(out, 'туда', p.ru.acc))) { out = r; refs.push('place'); }
      if ((r = rep(out, 'там', p.ru.loc))) { out = r; refs.push('place'); }
      if ((r = rep(out, 'over there|there', p.enLoc))) { out = r; refs.push('place'); }
      if ((r = rep(out, 'dorthin|dahin', p.deTo))) { out = r; refs.push('place'); }
      if ((r = rep(out, 'dort|da drüben', p.deLoc))) { out = r; refs.push('place'); }
    }
    if (tm) {
      if ((r = rep(out, 'тогда', tm.ru))) { out = r; refs.push('time'); }
      if ((r = rep(out, 'at that time|back then', tm.en))) { out = r; refs.push('time'); }
      else if (/\s+then\s*\?*\s*$/i.test(out) && /\?\s*$/.test(out)) { out = out.replace(/\s+then(\s*\?*\s*)$/i, ' ' + tm.en + '$1'); refs.push('time'); }
      if ((r = rep(out, 'damals|zu der zeit', tm.de))) { out = r; refs.push('time'); }
    }
    if (e) {
      var nm = e.text, prs = e.g === 'f' ? 'она|её|ее|ей|о ней|нее|неё' : 'он|его|ему|о нём|о нем|него|нему|им';
      if ((r = rep(out, prs, nm))) { out = r; refs.push('entity'); }
      if ((r = rep(out, e.g === 'f' ? 'she|her' : 'he|him|his', nm))) { out = r; refs.push('entity'); }
      if ((r = rep(out, 'er|ihn|ihm', nm))) { out = r; refs.push('entity'); }
    }
    // «это / it / das / es» — только в вопросе; если и место, и сущность свежие — уточняем
    var q = /\?\s*$/.test(out) || /^(?:а\s+)?(?:что|как|где|когда|сколько|почему|зачем|кто|what|how|where|when|why|who|was|wie|wo|wann|warum|wer)\b/i.test(lc(out));
    var pron = new RegExp('(^|' + W + ')(это|оно|it|das|es)(?=' + W + '|$)', 'i');
    if (q && pron.test(out) && refs.indexOf('entity') < 0 && refs.indexOf('place') < 0 && !/это\s+(?:такое|значит)/i.test(out)) {
      var eT = e ? st.slots.entity.t : -1, pT = p ? st.slots.place.t : -1;
      if (e && p && Math.abs(eT - pT) <= 1) return { clarify: { q: String(text), options: [{ kind: 'entity', label: e.text }, { kind: 'place', label: labelOf({ kind: 'place', id: p.id }, L) }] } };
      var val = eT > pT ? e.text : p ? (L === 'ru' ? p.ru.nom : L === 'de' ? p.de : p.en) : null;
      if (val) { out = out.replace(pron, function (m, a) { return a + val; }); refs.push(eT > pT ? 'entity' : 'place'); }
    }
    return { text: out, changed: out !== String(text || ''), refs: refs };
  }
  function findTimeById(id) {
    for (var i = 0; i < TIME_RE.length; i++) if (TIME_RE[i].id === id) return TIME_RE[i];
    for (i = 0; i < MONTH_RE.length; i++) if (MONTH_RE[i].id === id) return MONTH_RE[i];
    return null;
  }

  // ───────────── реплики ─────────────
  function M(L, ru, en, de) { return L === 'ru' ? ru : L === 'de' ? de : en; }
  function placeIn(p, L) { return L === 'ru' ? p.ru.loc : L === 'de' ? p.deLoc : p.enLoc; }
  function placeName(p, L) { return L === 'ru' ? p.ru.nom : L === 'de' ? p.de : p.en; }
  function timeName(id, L) { var t = findTimeById(id); return t ? t[L] || t.en : ''; }
  var META_WHAT = /о ч[её]м (?:мы )?(?:говорили|разговаривали|беседовали)|что мы обсуждали|напомни,? о ч[её]м|what were we talking about|what did we talk about|where were we|worüber haben wir (?:gesprochen|geredet)|wovon haben wir gesprochen/;
  var META_BACK = /(?:^|\s)(?:давай(?:те)?\s+)?(?:верн[её]мся|вернуться|возвращаемся)(?:\s+(?:к|ко)\s+(.+))?|(?:^|\s)(?:let'?s\s+)?(?:go\s+)?back to\s+(.+)|(?:^|\s)zurück zu(?:m|r)?\s+(.+)|(?:^|\s)(?:lass uns\s+)?zurück(?:kommen)?$/;
  function describeTopic(st, tp, L, sl) {
    var bits = [], lab = labelOf(tp, L);
    sl = sl || {};
    if (tp.kind === 'place') {
      if (sl.goal === 'trip') bits.push(M(L, 'поездка', 'a trip', 'eine Reise'));
      if (sl.time) bits.push(timeName(sl.time, L));
      var p = placeById(tp.id);
      return M(L, 'о ' + (p ? p.ru.loc.replace(/^в /, '').replace(/^во /, '') : lab), 'about ' + lab, 'über ' + lab) + (bits.length ? ' (' + bits.join(', ') + ')' : '');
    }
    if (tp.kind === 'choose') return M(L, 'о выборе: ' + lab, 'about choosing: ' + lab, 'über die Wahl: ' + lab);
    return M(L, 'про «' + lab + '»', 'about “' + lab + '”', 'über „' + lab + '“');
  }
  // meta(st, text, L) → готовый ответ на «о чём мы говорили» / «вернёмся к X» | null
  function meta(st, text, L) {
    var s = lc(String(text || '')).replace(/[?!.]+$/, '').trim(), m;
    if (META_WHAT.test(s)) {
      st.turn++; decay(st);
      if (!st.topic) return { kind: 'what', text: M(L, 'Пока мы ни о чём конкретном не говорили. О чём поболтаем?', "We haven't talked about anything specific yet. What shall we talk about?", 'Wir haben noch über nichts Bestimmtes gesprochen. Worüber möchtest du reden?') };
      var cur = describeTopic(st, st.topic, L, snapshot(st)), prev = st.stack.slice().reverse().slice(0, 2).map(function (x) { return describeTopic(st, x, L, x.slots); });
      return { kind: 'what', text: M(L, 'Мы говорили ' + cur + '.', 'We were talking ' + cur + '.', 'Wir haben ' + cur + ' gesprochen.') + (prev.length ? M(L, ' До этого — ' + prev.join(', ') + '. Можно сказать «вернёмся к …».', ' Before that — ' + prev.join(', ') + ". You can say 'back to …'.", ' Davor — ' + prev.join(', ') + '. Sag einfach „zurück zu …“.') : '') };
    }
    if ((m = META_BACK.exec(s))) {
      var want = cleanEnt(m[1] || m[2] || m[3] || ''), hit = null, i;
      if (!st.stack.length) { st.turn++; return { kind: 'back', text: M(L, 'Мы пока не отвлекались — продолжаем ' + (st.topic ? describeTopic(st, st.topic, L, snapshot(st)) : 'разговор') + '.', "We haven't digressed yet — let's carry on.", 'Wir sind noch nicht abgeschweift — machen wir weiter.') }; }
      if (want) {
        var wp = findPlace(want), w4 = lc(want).replace(/^(?:о|об|про|the|dem|der|die)\s+/, '').slice(0, 4);
        for (i = st.stack.length - 1; i >= 0 && !hit; i--) {
          var x = st.stack[i];
          if ((wp && x.kind === 'place' && x.id === wp.id) || (w4 && lc(labelOf(x, 'ru') + ' ' + labelOf(x, 'en') + ' ' + labelOf(x, 'de') + ' ' + x.label).indexOf(w4) >= 0)) hit = x;
        }
        if (!hit) return null;
      } else hit = st.stack[st.stack.length - 1];
      st.turn++;
      st.stack = st.stack.filter(function (x) { return x !== hit; });
      if (st.topic) st.stack.push({ key: st.topic.key, kind: st.topic.kind, id: st.topic.id, label: st.topic.label, t: st.turn, slots: snapshot(st) });
      st.slots = {};
      for (var k in hit.slots) setSlot(st, k, hit.slots[k]);
      st.topic = { key: hit.key, kind: hit.kind, id: hit.id, label: hit.label, t: st.turn };
      var d = describeTopic(st, hit, L, hit.slots);
      var tail = hit.kind === 'place' ? M(L, ' Что ещё хочешь узнать? Например: «что там посмотреть?»', " What else would you like to know? E.g. 'what to see there?'", ' Was möchtest du noch wissen? Zum Beispiel: „was kann man dort sehen?“') : M(L, ' Что ещё хочешь узнать?', ' What else would you like to know?', ' Was möchtest du noch wissen?');
      return { kind: 'back', text: M(L, 'Хорошо, вернёмся к разговору ' + d + '.', "Okay, back to our talk " + d + '.', 'Gut, zurück zu unserem Gespräch ' + d + '.') + tail };
    }
    return null;
  }
  // frame(st, f, text, L) → уточняющий вопрос / итог фрейма | null. f — результат observe этой реплики.
  function frame(st, f, text, L) {
    var fr = st.frame, s = lc(text);
    if (f.goal === 'trip' || (fr && fr.type === 'trip' && (f.place || f.time))) {
      st.frame = { type: 'trip', t: st.turn };
      var p = placeById(slot(st, 'place')), t = slot(st, 'time');
      if (!p) return { frame: 'trip', ask: 'place', text: M(L, '✈️ Отличная идея! Куда хочешь поехать?', '✈️ Great idea! Where would you like to go?', '✈️ Tolle Idee! Wohin möchtest du reisen?') };
      if (!t) return { frame: 'trip', ask: 'time', text: M(L, '✈️ ' + p.ru.nom + ' — хороший выбор! Когда планируешь поездку: весной, летом, в мае…?', '✈️ ' + p.en + ' — good choice! When are you planning to go: spring, summer, in May…?', '✈️ ' + p.de + ' — gute Wahl! Wann planst du die Reise: im Frühling, im Sommer, im Mai …?') };
      st.frame = null;
      return { frame: 'trip', done: true, text: M(L,
        '✈️ Записал план: ' + p.ru.nom + ', ' + timeName(t, 'ru') + '. Могу подсказать, что там посмотреть, какая там погода или что взять с собой — просто спроси, например: «а что там посмотреть?»',
        '✈️ Got it: ' + p.en + ', ' + timeName(t, 'en') + ". I can tell you what to see there, the weather or what to pack — just ask, e.g. 'what to see there?'",
        '✈️ Notiert: ' + p.de + ', ' + timeName(t, 'de') + '. Ich kann dir sagen, was man dort sehen kann, wie das Wetter ist oder was du einpacken solltest — frag einfach, z. B. „was kann man dort sehen?“') };
    }
    if (f.goal === 'choose') {
      var o = f.options;
      st.frame = { type: 'choose', t: st.turn, opts: o };
      return { frame: 'choose', ask: 'criterion', text: M(L,
        '⚖️ Помогу выбрать между «' + o[0] + '» и «' + o[1] + '». Что для тебя главное: цена, качество, удобство или что-то ещё?',
        '⚖️ Let me help you choose between “' + o[0] + '” and “' + o[1] + '”. What matters most to you: price, quality, convenience or something else?',
        '⚖️ Ich helfe dir bei der Wahl zwischen „' + o[0] + '“ und „' + o[1] + '“. Was ist dir am wichtigsten: Preis, Qualität, Bequemlichkeit oder etwas anderes?') };
    }
    if (fr && fr.type === 'choose' && st.turn - fr.t <= 2 && String(text).length <= 60 && !/\?\s*$/.test(String(text))) {
      var c = String(text).replace(/[.!]+$/, '').replace(/^(?:мне\s+)?(?:главное|важнее|важно|для меня)\s*[-—:]?\s*/i, '').replace(/^(?:most important(?:ly)?|for me|mir ist|am wichtigsten ist)\s*[-—:]?\s*/i, '').trim().slice(0, 40);
      st.frame = null; o = fr.opts;
      return { frame: 'choose', done: true, text: M(L,
        '⚖️ Тогда сравни «' + o[0] + '» и «' + o[1] + '» прежде всего по критерию «' + c + '»: выпиши 2–3 плюса и минуса каждого именно по нему — что выигрывает, то и бери. Если почти равны — выбирай то, что проще отменить или поменять.',
        '⚖️ Then compare “' + o[0] + '” and “' + o[1] + '” first of all on “' + c + '”: list 2–3 pros and cons of each on that point — whichever wins, take it. If they are about equal, pick the one that is easier to undo or change.',
        '⚖️ Dann vergleiche „' + o[0] + '“ und „' + o[1] + '“ vor allem nach „' + c + '“: Schreib dir für beide 2–3 Vor- und Nachteile genau dazu auf — was gewinnt, das nimmst du. Wenn sie fast gleich sind, nimm das, was sich leichter rückgängig machen oder ändern lässt.') };
    }
    if (s && fr && !(f.place || f.time)) st.frame = null;
    return null;
  }
  // clarify: «ты про X или про Y?»; answerClarify — ответ пользователя на уточнение → исходный вопрос с подстановкой
  function askClarify(st, c, L) {
    st.pending = { q: c.q, options: c.options, t: st.turn };
    var a = c.options[0].label, b = c.options[1].label;
    return M(L, '🤔 Ты про «' + a + '» или про «' + b + '»?', '🤔 Do you mean “' + a + '” or “' + b + '”?', '🤔 Meinst du „' + a + '“ oder „' + b + '“?');
  }
  function answerClarify(st, text, L) {
    var pd = st.pending; if (!pd) return null;
    var s = lc(text), pick = null;
    pd.options.forEach(function (o, i) { var l4 = lc(o.label).slice(0, 4); if (l4 && s.indexOf(l4) >= 0) pick = o; });
    if (!pick && /(^|\s)(перв|first|erst)/.test(s)) pick = pd.options[0];
    if (!pick && /(^|\s)(втор|second|zweit)/.test(s)) pick = pd.options[1];
    st.pending = null;
    if (!pick) return null;
    var pron = new RegExp('(^|' + W + ')(это|оно|it|das|es)(?=' + W + '|$)', 'i');
    var val = pick.label;
    if (pick.kind === 'place') { var p = placeById(slot(st, 'place')); if (p) val = placeName(p, L); }
    return { text: pd.q.replace(pron, function (m, a) { return a + val; }), pick: pick };
  }
  // summary(st) → компактная строка для системного контекста ИИ ('' если пусто)
  function summary(st) {
    var b = [], p = placeById(slot(st, 'place')), t = slot(st, 'time'), e = slot(st, 'entity'), g = slot(st, 'goal'), m = slot(st, 'mood');
    if (st.topic) b.push('topic=' + labelOf(st.topic, 'en'));
    if (p) b.push('place=' + p.en);
    if (t) b.push('time=' + timeName(t, 'en'));
    if (e) b.push('entity=' + e.text);
    if (g) b.push('goal=' + g + (g === 'choose' && slot(st, 'options') ? '(' + slot(st, 'options').join(' vs ') + ')' : ''));
    if (m) b.push('mood=' + m);
    if (st.stack.length) b.push('earlier=' + st.stack.slice(-3).map(function (x) { return labelOf(x, 'en'); }).join(', '));
    return b.length ? b.join('; ').slice(0, 300) : '';
  }
  return { create: create, observe: observe, resolve: resolve, meta: meta, frame: frame, askClarify: askClarify, answerClarify: answerClarify,
    summary: summary, findPlace: findPlace, findTime: findTime, findEntity: findEntity, findOptions: findOptions, slot: slot, placeById: placeById, version: '14.5.0' };
});
