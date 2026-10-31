// VELANTRIM EITI v14.15.3 — EITI Tell: «расскажи что-нибудь / удиви меня / как ты думаешь» без темы (RU/EN/DE).
// Чистая логика без DOM, без сети и без localStorage (UMD: window.EitiTell / module.exports). Без lookbehind в regex.
// Пулы — local/eiti_tell.json (правится без кода): мудрость / факт / история / размышление. Распознавание — «мешок слов»:
// КАЖДОЕ слово фразы должно быть из словаря ниже (глаголы-просьбы, «что-нибудь/там/интересное», категории, связки),
// поэтому любая тема («расскажи про луну», «скажи что-нибудь смешное», «расскажи сказку») сюда не попадает и идёт дальше
// (Frames → KB → диалоги). Порядок слов любой; опечатки — Дамерау–Левенштейн ≤1 (≤2 для слов от 8 букв) по словарю.
// Выбор: случайная категория (не та же, что в прошлый раз) и элемент из перемешанной колоды (без повторов подряд,
// весь пул проходит до повтора). «Ещё» — следующий ответ, только сразу после ответа Tell.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EitiTell = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var CATS = ['wisdom', 'fact', 'story', 'thought'];
  var PACK = null;
  function W(s) { return s.split(' '); }
  // словари: класс → слова (канонические формы после norm)
  var VOC = {
    ru: {
      V: W('расскажи расскажите расскажешь рассказывай рассказать поведай поведайте поведаешь скажи скажите скажешь поделись поделитесь поделишься удиви удивите удивишь удивляй удивить развлеки развлеките развлекай развлечь развесели повесели порадуй говори напиши'),
      Wk: W('давай давайте хочу хочется можешь можно знаешь есть'),
      X: W('чтото чтонибудь интересное интересненькое интересного любопытное любопытного новенькое необычное необычного удивительное удивительного полезное умное познавательное занимательное занятное прикольное классное'),
      THERE: W('там'),
      ME: W('меня мне нам нас'),
      F: W('факт факты фактик фактов факта фактом фактами фактиком'),
      FA: W('интересный интересные любопытный случайный научный занимательный удивительный познавательный'),
      WIS: W('мудрость мудрости мудростью мудрое мудрого'),
      S: W('историю истории история случай случаи случаев случая байку байки'),
      SA: W('интересную реальную настоящую поучительную жизненную из жизни'),
      T: W('думаешь думаете считаешь считаете мнение мнением мнения мысль мыслью мысли размышление размышлением размышлениями потвоему'),
      TA: W('как что твое ваше какое каково'),
      G: W('а ну эй слушай пожалуйста пж пжлст плиз же еще тогда немного чуток чуточку сегодня эити эйти друг дружище бы что чем ты вы ли какой какую какое какойнибудь одну один одно тоже ладно хоть'),
      MORE: W('еще другую другое другой следующую следующий следующее дальше'),
      MOREG: W('давай ну а одну один одно плиз пожалуйста хочу можно раз'),
      // глаголы мысли и «история» без уточнения — не исправляем опечатки (читаешь≠считаешь; «историю» → сказки)
      NOFUZ: W('думаете считаешь считаете мнением мнения мысль мыслью мысли историю истории история случаи случаев случая байки там нам нас мне')
    },
    en: {
      V: W('tell say share surprise entertain amuse give'),
      Wk: W('lets want can could would got have know'),
      X: W('something anything interesting cool new random smart'),
      THERE: [], ME: W('me us'),
      F: W('fact facts trivia funfact'),
      FA: W('fun random interesting cool'),
      WIS: W('wisdom wise'),
      S: W('story stories'),
      SA: W('real true life from interesting'),
      T: W('think opinion thoughts view'),
      TA: W('what how your whats is'),
      G: W('a an some please pls hey eiti do you the piece of bit little just now today ok okay then and else one is would could can more'),
      MORE: W('more another next again'),
      MOREG: W('one please something else'),
      NOFUZ: W('think view story stories')
    },
    de: {
      V: W('erzähl erzähle erzählen erzählst sag sage sagen überrasch überrasche überrasch unterhalte unterhalt teile teil verrat verrate gib'),
      Wk: W('kannst möchte will hast'),
      X: W('etwas was irgendwas irgendetwas interessantes spannendes neues cooles'),
      THERE: [], ME: W('mir mich uns'),
      F: W('fakt fakten tatsache funfact'),
      FA: W('interessanten interessante interessanter zufälligen spannenden kleinen'),
      WIS: W('weisheit weisheiten weises'),
      S: W('geschichte geschichten'),
      SA: W('wahre echte aus dem leben'),
      T: W('denkst meinst meinung hältst'),
      TA: W('was wie deine ist'),
      G: W('bitte doch mal noch eine einen ein hey eiti du so jetzt heute ja kurz'),
      MORE: W('noch mehr weiter nochmal anderes andere'),
      MOREG: W('eins einen eine bitte mal'),
      NOFUZ: W('denkst meinst geschichte geschichten')
    }
  };
  var IDX = {};
  Object.keys(VOC).forEach(function (l) {
    var m = {}, v = VOC[l];
    Object.keys(v).forEach(function (c) { if (c === 'NOFUZ') return; v[c].forEach(function (w) { (m[w] = m[w] || {})[c] = 1; }); });
    var nf = {}; v.NOFUZ.forEach(function (w) { nf[w] = 1; });
    IDX[l] = { cls: m, fuzz: Object.keys(m).filter(function (w) { return w.length >= 5 && !nf[w]; }) };
  });
  var JOIN = { то: 1, та: 1, нибудь: 1, нибуть: 1, нибуд: 1, нить: 1, либо: 1 };
  var PRON = { что: 'что', чо: 'что', шо: 'что', че: 'что', чего: 'что', чем: 'что', какой: 'какой', какую: 'какой', какое: 'какой', какие: 'какой' };
  var ALIAS = {
    ru: { чтото: 'чтото', чтота: 'чтото', шото: 'чтото', чото: 'чтото', чето: 'чтото', чтонибудь: 'чтонибудь', чтонибуть: 'чтонибудь', чтонибуд: 'чтонибудь', чтонить: 'чтонибудь', чтолибо: 'чтонибудь',
      какойнибудь: 'какойнибудь', какойнить: 'какойнибудь', исчо: 'еще', ищо: 'еще', ещо: 'еще', ешо: 'еще', ваще: 'а', твоe: 'твое', плз: 'плиз', пжл: 'пж' },
    en: { pls: 'please', plz: 'please', thx: 'please' },
    de: { erzaehl: 'erzähl', erzaehle: 'erzähle', ueberrasch: 'überrasch', ueberrasche: 'überrasche', irgendwas: 'irgendwas', bissl: 'kurz' }
  };
  function toks(text, lang) {
    var s = String(text || '').toLowerCase().replace(/ё/g, 'е');
    if (lang === 'en') s = s.replace(/['’]/g, '');
    s = s.replace(/по-твоему|по твоему/g, 'потвоему').replace(/fun fact/g, 'funfact');
    var raw = s.split(/[^a-zа-яäöüß0-9]+/).filter(Boolean), out = [];
    for (var i = 0; i < raw.length; i++) {
      var w = raw[i];
      if (lang === 'ru') {
        w = w.replace(/(.)\1{2,}/g, '$1$1');
        if (w === 'ка' || w === 'кa') continue;
        if (JOIN[w] && out.length && PRON[out[out.length - 1]]) { out[out.length - 1] = PRON[out[out.length - 1]] + (w === 'то' || w === 'та' ? 'то' : 'нибудь'); continue; }
        var m = w.match(/^(что|чо|шо|че|чего|чем|какой|какую|какое|какие)(то|та|нибудь|нибуть|нибуд|нить|либо)$/);
        if (m) w = PRON[m[1]] + (m[2] === 'то' || m[2] === 'та' ? 'то' : 'нибудь');
      }
      out.push((ALIAS[lang] && ALIAS[lang][w]) || w);
    }
    return out;
  }
  // Дамерау–Левенштейн с отсечкой
  function dl(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (j = 0; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) {
      var rowMin = 99;
      for (j = 1; j <= b.length; j++) {
        var c = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        if (d[i][j] < rowMin) rowMin = d[i][j];
      }
      if (rowMin > max) return max + 1;
    }
    return d[a.length][b.length];
  }
  function canon(w, lang) {
    var ix = IDX[lang];
    if (ix.cls[w]) return w;
    if (w.length < 5) return null;
    var max = w.length >= 8 ? 2 : 1, best = null, bd = max + 1, tie = false;
    for (var i = 0; i < ix.fuzz.length; i++) {
      var d = dl(w, ix.fuzz[i], max);
      if (d < bd) { bd = d; best = ix.fuzz[i]; tie = false; } else if (d === bd && d <= max) tie = true;
    }
    return bd <= max && !tie ? best : null;
  }
  // match(text, lang) → null | { cat: 'fact'|'wisdom'|'story'|'thought'|null (любая), more: bool, lang }
  function matchLang(text, lang) {
    if (!VOC[lang]) return null;
    var t = toks(text, lang);
    if (!t.length || t.length > 9) return null;
    var cw = [], has = {}, ix = IDX[lang];
    for (var i = 0; i < t.length; i++) {
      var w = canon(t[i], lang); if (!w) return null;
      cw.push(w); var c = ix.cls[w]; for (var k in c) has[k] = (has[k] || 0) + 1;
    }
    var only = function (set) { return cw.every(function (w) { return set.some(function (s) { return !!ix.cls[w][s]; }); }); };
    // «ещё / давай ещё / другую» — только как продолжение (хост проверяет, что прошлый ответ был от Tell)
    if (has.MORE && only(['MORE', 'MOREG'])) return { cat: null, more: true, lang: lang };
    var verb = !!has.V, weak = !!has.Wk;
    if (has.F) return { cat: 'fact', more: false, lang: lang };
    if (has.WIS) return { cat: 'wisdom', more: false, lang: lang };
    if (has.S) {
      // голое «расскажи историю» — это сказки (fn_tell_story); сюда — «из жизни», «случай», «интересную историю»…
      var life = lang === 'ru' ? (cw.indexOf('жизни') >= 0 || /^(случай|случаи|случаев|случая|байку|байки)$/.test(cw.filter(function (w) { return ix.cls[w].S; })[0]) || cw.some(function (w) { return /^(интересную|реальную|настоящую|поучительную|жизненную)$/.test(w); }))
        : (cw.indexOf('life') >= 0 || cw.indexOf('real') >= 0 || cw.indexOf('true') >= 0 || cw.indexOf('leben') >= 0 || cw.indexOf('wahre') >= 0 || cw.indexOf('echte') >= 0);
      if (!life) return null;
      if (lang === 'ru' && cw.indexOf('из') >= 0 !== (cw.indexOf('жизни') >= 0)) return null;
      return { cat: 'story', more: false, lang: lang };
    }
    if (cw.indexOf('из') >= 0 || cw.indexOf('жизни') >= 0 || cw.indexOf('from') >= 0 || cw.indexOf('life') >= 0 || cw.indexOf('aus') >= 0 || cw.indexOf('dem') >= 0 || cw.indexOf('leben') >= 0) return null;
    if (has.T) {
      var ru = lang === 'ru';
      var thinkV = cw.some(function (w) { return /^(думаешь|думаете|считаешь|считаете|think|denkst|meinst|hältst)$/.test(w); });
      var q = cw.some(function (w) { return ru ? /^(как|что|потвоему)$/.test(w) : /^(what|whats|how|was|wie)$/.test(w); });
      if (thinkV && !q) return null;
      if (!thinkV && !(verb || weak || q || cw.some(function (w) { return /^(твое|ваше|какое|каково|your|deine)$/.test(w); }) || cw.indexOf('потвоему') >= 0)) return null;
      return { cat: 'thought', more: false, lang: lang };
    }
    if (has.FA && !has.X) return null;
    if (has.THERE && !verb) return null;
    if (verb) {
      if (lang === 'ru' && cw.indexOf('скажешь') >= 0 && cw.indexOf('что') >= 0 && !has.X) return { cat: 'thought', more: false, lang: lang };
      return { cat: null, more: false, lang: lang };
    }
    if (has.X) {
      var adj = cw.some(function (w) { return ix.cls[w].X && !/^(чтото|чтонибудь|something|anything|etwas|was|irgendwas|irgendetwas)$/.test(w); });
      if (weak || adj) return { cat: null, more: false, lang: lang };
    }
    return null;
  }
  function match(text, lang) {
    var s = String(text || '');
    if (!s.trim() || s.length > 160) return null;
    var order = /[а-яё]/i.test(s) ? ['ru'] : (lang === 'de' ? ['de', 'en'] : lang === 'en' ? ['en', 'de'] : ['en', 'de']);
    for (var i = 0; i < order.length; i++) { var m = matchLang(s, order[i]); if (m) return m; }
    return null;
  }
  function load(p) {
    if (!p || p.format !== 'eiti-tell' || !p.pools || !p.pools.ru) return false;
    PACK = p; return true;
  }
  function loaded() { return !!PACK; }
  function create() { return { decks: {}, lastIdx: {}, lastCat: null, req: null, armed: false, at: 0, n: 0 }; }
  function disarm(st) { if (st) st.armed = false; }
  function rnd01(o) { return o && typeof o.rnd === 'function' ? o.rnd() : Math.random(); }
  function poolOf(lang, cat) { var p = PACK && (PACK.pools[lang] || PACK.pools.ru); return (p && p[cat]) || []; }
  function pick(st, lang, cat, o) {
    if (!cat) {
      var c = CATS.filter(function (x) { return x !== st.lastCat && poolOf(lang, x).length; });
      if (!c.length) c = CATS.slice();
      cat = c[Math.floor(rnd01(o) * c.length) % c.length];
    }
    var pool = poolOf(lang, cat), key = lang + ':' + cat;
    if (!pool.length) return null;
    var deck = st.decks[key];
    if (!deck || !deck.length) {
      deck = pool.map(function (_x, i) { return i; });
      for (var i = deck.length - 1; i > 0; i--) { var j = Math.floor(rnd01(o) * (i + 1)) % (i + 1); var tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp; }
      if (deck.length > 1 && deck[deck.length - 1] === st.lastIdx[key]) { var t0 = deck[0]; deck[0] = deck[deck.length - 1]; deck[deck.length - 1] = t0; }
      st.decks[key] = deck;
    }
    var idx = deck.pop();
    st.lastIdx[key] = idx; st.lastCat = cat; st.n++;
    return { cat: cat, idx: idx, item: pool[idx] };
  }
  function format(r, lang) {
    var ui = (PACK.ui && (PACK.ui[lang] || PACK.ui.ru)) || {}, it = r.item, q = lang === 'en' ? ['“', '”'] : lang === 'de' ? ['„', '“'] : ['«', '»'];
    var h = ui[r.cat] || '';
    var body = r.cat === 'wisdom' ? q[0] + it.t + q[1] + (it.a ? '\n— ' + it.a : '') + (it.m ? '\n\n' + it.m : '')
      : r.cat === 'story' ? it.t : it.t;
    if (r.cat === 'story' && it.k) h += ' · ' + it.k;
    return h + '\n\n' + body + (ui.more ? '\n\n' + ui.more : '');
  }
  // respond(text, st, {lang, now, rnd}) → строка или null (не наша фраза — хост передаёт дальше)
  function respond(text, st, o) {
    o = o || {};
    if (!PACK || !st) return null;
    var m = match(text, o.lang);
    if (!m) return null;
    var now = o.now || Date.now();
    if (m.more && !(st.armed && now - st.at < 15 * 60 * 1000)) return null;
    var lang = PACK.pools[o.lang] ? o.lang : m.lang;
    var cat = m.more ? st.req : m.cat;
    var r = pick(st, lang, cat, o);
    if (!r) return null;
    if (!m.more) st.req = m.cat;
    st.armed = true; st.at = now; st.last = r;
    return format(r, lang);
  }
  function sizes() {
    var o = {}; if (!PACK) return o;
    Object.keys(PACK.pools).forEach(function (l) { o[l] = {}; CATS.forEach(function (c) { o[l][c] = (PACK.pools[l][c] || []).length; }); });
    return o;
  }
  return { load: load, loaded: loaded, create: create, match: match, respond: respond, disarm: disarm, pick: pick, format: format, sizes: sizes, toks: toks, CATS: CATS };
});
