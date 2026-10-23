// VELANTRIM EITI — EitiTypo v14.6.0: offline typo tolerance (RU / EN / DE).
// Order: normalize (case, ё→е, folding ü→ue ä→ae ö→oe ß→ss — input and vocabulary are folded the same way,
// nothing is blindly rewritten) → wrong keyboard layout (ghbdtn → привет) → curated table (short words/slang,
// DE typos) → collapsed repeats → missing space/hyphen → Damerau-Levenshtein over the vocabulary of all offline
// layers (symmetric-delete index, built lazily on first use). A word that is already in the vocabulary
// (targets or "known" words from answers/KB) is never changed.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.EitiTypo = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  var VERSION = '14.6.0';

  function fold(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/ü/g, 'ue').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ß/g, 'ss');
  }

  // ── curated tables (keys folded). Short words (≤3 letters) are corrected ONLY from here. ──
  var TABLE = {
    ru: {
      'еше': 'ещё', 'ище': 'ещё', 'ешо': 'ещё', 'ещо': 'ещё', 'исчо': 'ещё', 'ищо': 'ещё', 'исче': 'ещё', 'ещ': 'ещё', 'есче': 'ещё', 'ишо': 'ещё', 'еще': null,
      'щас': 'сейчас', 'щя': 'сейчас', 'счас': 'сейчас', 'щаз': 'сейчас', 'чо': 'что', 'че': 'что', 'шо': 'что', 'што': 'что', 'чта': 'что', 'чтл': 'что', 'xnj': null,
      'плз': 'пожалуйста', 'пж': 'пожалуйста', 'пжл': 'пожалуйста', 'пожалуста': 'пожалуйста', 'спс': 'спасибо', 'пасиб': 'спасибо', 'пасибо': 'спасибо', 'сяп': 'спасибо',
      'прив': 'привет', 'ниче': 'ничего', 'тож': 'тоже', 'скок': 'сколько', 'скоко': 'сколько', 'ваще': 'вообще', 'вобще': 'вообще', 'кароч': 'короче',
      'токо': 'только', 'тока': 'только', 'када': 'когда', 'кагда': 'когда', 'поч': 'почему', 'пч': 'почему', 'поче': 'почему', 'кк': 'как', 'кад': 'как',
      'дя': 'да', 'нт': 'нет', 'нее': 'нет', 'неа': 'нет', 'пт': 'пять', 'дв': 'два', 'тр': 'три'
    },
    en: {
      'u': 'you', 'ur': 'your', 'pls': 'please', 'plz': 'please', 'thx': 'thanks', 'thnx': 'thanks', 'ty': 'thank you', 'wat': 'what', 'wht': 'what', 'teh': 'the',
      'hw': 'how', 'cuz': 'because', 'bc': 'because', 'tmrw': 'tomorrow', 'abt': 'about', 'nd': 'and', 'hwo': 'how', 'waht': 'what', 'whta': 'what', 'yuo': 'you', 'hii': 'hi'
    },
    // DE: matching is on the folded form, so Taetigkeit/Tätigkeit, Strasse/Straße, Grüsse/Grüße are already equal.
    // These are only real typos / dropped umlauts (Tatigkeit → Tätigkeit) / colloquial speech-to-text forms.
    de: {
      'dnake': 'danke', 'dnke': 'danke', 'dake': 'danke', 'bitet': 'bitte', 'biite': 'bitte', 'bite': 'bitte', 'hallp': 'hallo', 'hlalo': 'hallo', 'wiso': 'wieso',
      'wieviele': 'wie viele', 'wieviel': 'wie viel', 'nochmal': 'noch mal', 'notitzen': 'notizen', 'notizn': 'notizen', 'tschuss': 'tschüss', 'tschues': 'tschüss',
      'gehts': 'geht es', 'kanst': 'kannst', 'gibts': 'gibt es', 'haste': 'hast du', 'biste': 'bist du', 'kannste': 'kannst du', 'mahl': 'mal', 'vileicht': 'vielleicht', 'vieleicht': 'vielleicht',
      'warscheinlich': 'wahrscheinlich', 'tatigkeit': 'tätigkeit', 'fur': 'für', 'uber': 'über', 'konnen': 'können', 'moglich': 'möglich', 'mochte': 'möchte',
      'spater': 'später', 'hore': 'höre', 'erzahl': 'erzähl', 'erzahle': 'erzähle', 'marchen': 'märchen', 'ratsel': 'rätsel', 'zuruck': 'zurück', 'naturlich': 'natürlich'
    }
  };
  // follow-up / command / calculator / dialogue-state words of the offline layers (vocabulary boost)
  var EXTRA_WORDS = [
    'ещё еще дальше продолжай продолжи почему зачем отчего как там туда оттуда тогда вернёмся вернемся говорили напомни повтори подробнее',
    'сколько заметок заметки заметку заметка последняя найди покажи тег тегом посчитай вычисли сколько будет умножить умножь разделить раздели поделить плюс минус прибавить отнять',
    'процент процентов процента корень квадратный кубический степени степень ноль один одна два две три четыре пять шесть семь восемь девять десять одиннадцать двенадцать',
    'двадцать тридцать сорок пятьдесят шестьдесят семьдесят восемьдесят девяносто сто двести триста тысяча миллион половина четверть',
    'расскажи сказку сказка анекдот шутку загадку загадка цитату факт привет пока спасибо пожалуйста хорошо нормально отлично',
    'more again next continue why how there then back multiply times divided divide plus minus percent root square notes note tag last tell story joke riddle hello thanks please',
    'noch weiter warum wieso dort dorthin damals zurück mal geteilt durch plus minus prozent wurzel notizen notiz erzähl märchen witz rätsel danke bitte hallo tschüss wie viele'
  ].join(' ');

  // ── keyboards ──
  var EN_KEYS = "`qwertyuiop[]asdfghjkl;'zxcvbnm,.", RU_KEYS = 'ёйцукенгшщзхъфывапролджэячсмитьбю';
  var E2R = {}, R2E = {};
  for (var i = 0; i < EN_KEYS.length; i++) { E2R[EN_KEYS[i]] = RU_KEYS[i]; R2E[RU_KEYS[i]] = EN_KEYS[i]; }
  var ROWS = [['йцукенгшщзхъ', 'фывапролджэ', 'ячсмитьбю'], ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'], ['qwertzuiopü', 'asdfghjklöä', 'yxcvbnm']];
  var POS = {};
  ROWS.forEach(function (kb, ki) { kb.forEach(function (row, r) { for (var c = 0; c < row.length; c++) (POS[row[c]] = POS[row[c]] || []).push([ki, r, c]); }); });
  function neighbors(a, b) {
    var pa = POS[a], pb = POS[b]; if (!pa || !pb) return false;
    for (var x = 0; x < pa.length; x++) for (var y = 0; y < pb.length; y++) {
      if (pa[x][0] !== pb[y][0]) continue;
      var dr = Math.abs(pa[x][1] - pb[y][1]), dc = pb[y][2] - pa[x][2];
      if ((dr === 0 && Math.abs(dc) === 1) || (dr === 1 && dc >= -1 && dc <= 1)) return true;
    }
    return false;
  }

  // ── Damerau-Levenshtein (optimal string alignment) with cutoff ──
  function dl(a, b, max) {
    var n = a.length, m = b.length;
    if (Math.abs(n - m) > max) return max + 1;
    var p2 = null, p = [], c, j;
    for (j = 0; j <= m; j++) p[j] = j;
    for (var i2 = 1; i2 <= n; i2++) {
      c = [i2]; var best = i2;
      for (j = 1; j <= m; j++) {
        var cost = a[i2 - 1] === b[j - 1] ? 0 : 1;
        var v = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + cost);
        if (p2 && i2 > 1 && j > 1 && a[i2 - 1] === b[j - 2] && a[i2 - 2] === b[j - 1]) v = Math.min(v, p2[j - 2] + 1);
        c[j] = v; if (v < best) best = v;
      }
      if (best > max) return max + 1;
      p2 = p; p = c;
    }
    return p[m];
  }
  // substitutions that are neighbouring keys / ш↔щ / е↔и — "cheap" typos, used as a tie-break
  function slipBonus(a, b) {
    if (a.length !== b.length) return 0;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) {
      var x = a[i], y = b[i];
      return (neighbors(x, y) || (x + y).match(/^(шщ|щш|еи|ие|ая|яа|оа|ао)$/)) ? 1 : 0;
    }
    return 0;
  }

  // ── vocabulary & lazy index ──
  var V = null, CANON = null, IDX = null, CACHE = new Map();
  function load(json) {
    var j = typeof json === 'string' ? JSON.parse(json) : json;
    V = new Map(); CANON = new Map(); IDX = null; CACHE = new Map();
    String(j.t || '').split(' ').forEach(function (w) { if (!w) return; var s = w.indexOf('*'); if (s < 0) V.set(w, 0); else V.set(w.slice(0, s), +w.slice(s + 1) || 0); });
    String(j.c || '').split(' ').forEach(function (p) { var e = p.indexOf('='); if (e > 0) CANON.set(p.slice(0, e), p.slice(e + 1)); });
    fold(EXTRA_WORDS).split(/\s+/).forEach(function (w) { V.set(w, Math.max(V.get(w) || 0, 6)); });
    return V.size;
  }
  function freq(k) { return V ? (V.get(k) || 0) : 0; }
  function known(k) { return !!V && (V.has(k) || V.has(k.replace(/-/g, ''))); }
  function dels(w, out) { for (var i = 0; i < w.length; i++) out.push(w.slice(0, i) + w.slice(i + 1)); return out; }
  function buildIndex() {
    var t0 = Date.now(); IDX = new Map();
    V.forEach(function (f, w) {
      if (f < 2 || w.length < 4 || w.indexOf('-') >= 0) return;
      dels(w, []).forEach(function (d) { var e = IDX.get(d); if (e === undefined) IDX.set(d, w); else if (typeof e === 'string') { if (e !== w) IDX.set(d, [e, w]); } else if (e.indexOf(w) < 0) e.push(w); });
    });
    stats.indexMs = Date.now() - t0; stats.indexKeys = IDX.size;
  }
  var stats = { indexMs: 0, indexKeys: 0 };
  function candidates(k, lim) {
    if (!IDX) buildIndex();
    var seen = {}, out = [];
    function take(w) { if (w && !seen[w]) { seen[w] = 1; out.push(w); } }
    function look(x) { if (freq(x) >= 2 && x.length >= 4) take(x); var e = IDX.get(x); if (typeof e === 'string') take(e); else if (e) e.forEach(take); }
    look(k);
    var d1 = dels(k, []);
    d1.forEach(look);
    if (lim >= 2) d1.forEach(function (d) { dels(d, []).forEach(look); });
    return out;
  }
  function fuzzy(k) {
    var lim = k.length >= 8 ? 2 : 1, best = null;
    candidates(k, lim).forEach(function (w) {
      var d = dl(k, w, lim); if (d > lim) return;
      var s = d * 10 - slipBonus(k, w) * 3 - (w[0] === k[0] ? 2 : 0) - Math.log(1 + freq(w)) - (w.length > k.length ? 1.5 : 0); // a dropped letter is the most common slip
      if (!best || s < best.s) best = { w: w, d: d, s: s };
    });
    return best;
  }
  // short words that may stand alone after a missing space (prepositions, pronouns, particles)
  var SHORT = {};
  ('в к с у о и а я на не по за до из от ты мы вы он мне как что где кто ну же ли бы ещё еще да нет ' +
   'a i to in on at of is it me my do so no we he am an or by up us ' +
   'zu im am um da es er du ich wie mir mal ja so').split(' ').forEach(function (w) { SHORT[fold(w)] = 1; });
  function split(k) {
    if (k.length < 5) return null;
    var best = null;
    for (var i = 1; i <= k.length - 1; i++) {
      var a = k.slice(0, i), b = k.slice(i), fa = SHORT[a] ? 99 : freq(a), fb = SHORT[b] ? 99 : freq(b);
      if ((a.length < 3 && !SHORT[a]) || (b.length < 3 && !SHORT[b])) continue;
      if (a === b) continue;                                            // ахахахах is laughter, not two words
      if (fa >= 2 && fb >= 2) { var s = Math.min(fa, fb); if (!best || s > best.s) best = { w: a + ' ' + b, s: s }; }
    }
    return best;
  }
  function tableFor(k, lang) {
    var order = lang === 'en' ? ['en', 'ru', 'de'] : lang === 'de' ? ['de', 'en', 'ru'] : ['ru', 'en', 'de'];
    for (var i = 0; i < order.length; i++) if (Object.prototype.hasOwnProperty.call(TABLE[order[i]], k)) return TABLE[order[i]][k];
    return undefined;
  }
  // correctToken(raw, lang) → { to, kind } | null
  // Cheap inflection guard: an unknown word that is a known stem + a common
  // ending is treated as valid (RU cases, EN plurals/-ed/-ing, DE endings).
  var ENDS = ['е','у','а','ом','ой','ам','ами','ах','ов','ы','и','ю','ем','ей','ями','ях','s','es','ed','ing','en','er','es','n'];
  function inflected(k) {
    for (var i = 0; i < ENDS.length; i++) {
      var e = ENDS[i]; if (k.length - e.length < 4 || k.slice(-e.length) !== e) continue;
      var st = k.slice(0, -e.length);
      if (freq(st) >= 2 || freq(st + 'а') >= 2 || freq(st + 'ь') >= 2 || freq(st + 'e') >= 2) return true;
    }
    return false;
  }
  function correctToken(raw, lang) {
    var k = fold(raw);
    if (!k || /\d/.test(k)) return null;
    var key = lang + '|' + k;
    if (CACHE.has(key)) return CACHE.get(key);
    var r = (function () {
      var t = tableFor(k, lang);
      if (t !== undefined && !(freq(k) >= 2)) return t ? { to: t, kind: 'table' } : null; // a vocabulary word is never rewritten
      if (known(k)) return CANON && CANON.has(k) ? { to: CANON.get(k), kind: 'hyphen' } : null;
      if (k.length <= 3 || !V) return null;
      var c2 = k.replace(/(.)\1{2,}/g, '$1$1');                      // threee → three
      if (c2 !== k && known(c2)) return { to: c2, kind: 'repeat' };
      var c = k.replace(/(.)\1{2,}/g, '$1');                         // привееет → привет
      if (c !== k && known(c)) return { to: c, kind: 'repeat' };
      // a close vocabulary word wins over splitting (myelf → myself, not "my elf")
      if (/^(..?.?)\1+.?$/.test(k)) return null;                       // ахахахах / hahaha / лололо: laughter, keep
      if (inflected(k)) return null;                               // стендапе = стендап + е: a valid form, keep it
      var f = fuzzy(k); if (f) return { to: CANON.get(f.w) || f.w, kind: 'fuzzy', d: f.d };
      var sp = split(k); if (sp) return { to: sp.w, kind: 'space' };
      return null;
    })();
    if (CACHE.size > 3000) CACHE.clear();
    CACHE.set(key, r);
    return r;
  }

  var TOK = /[a-zа-яёäöüß]+(?:-[a-zа-яёäöüß]+)*/gi;
  function knownShare(text) {
    var t = String(text).match(TOK) || []; if (!t.length) return 0;
    var n = 0; t.forEach(function (w) { var k = fold(w); if (known(k) || tableFor(k, 'ru') !== undefined && k.length > 1) n++; }); return n / t.length;
  }
  // wrong layout: whole message typed in the other layout
  function fixLayout(text) {
    var s = String(text);
    if (!V || s.length < 3) return null;
    var lat = /[a-z]/i.test(s), cyr = /[а-яё]/i.test(s);
    if (lat === cyr) return null;
    var conv;
    if (lat) conv = s.toLowerCase().replace(/[a-z`\[\];']|[,.](?=[a-z])/g, function (ch) { return E2R[ch] || ch; });
    else conv = s.toLowerCase().replace(/[а-яё]/g, function (ch) { return R2E[ch] || ch; });
    var a = knownShare(s), b = knownShare(conv);
    return b >= 0.6 && b > a + 0.3 ? conv : null;
  }

  // correct(text, lang) → { text, changes:[{from,to,kind}], layout }
  function correct(text, lang) {
    var src = String(text == null ? '' : text), out = { text: src, changes: [], layout: false };
    if (!V || !src.trim() || src.length > 400) return out;
    lang = lang || (/[а-яё]/i.test(src) ? 'ru' : /[äöüß]/i.test(src) ? 'de' : 'en');
    var lay = fixLayout(src);
    if (lay) { out.changes.push({ from: src, to: lay, kind: 'layout' }); out.layout = true; src = lay; lang = /[а-яё]/.test(lay) ? 'ru' : 'en'; }
    var first = true;
    out.text = src.replace(TOK, function (w, off) {
      var isFirst = first; first = false;
      // names in the middle of a sentence (Capitalized) are left alone
      if (!isFirst && /^[A-ZА-ЯЁÄÖÜ][a-zа-яёäöüß]/.test(w) && !/[.!?]\s*$/.test(src.slice(0, off))) return w;
      var r = correctToken(w, lang);
      if (!r || fold(r.to) === fold(w)) return w;
      var to = (w[0] !== w[0].toLowerCase() && r.to) ? r.to[0].toUpperCase() + r.to.slice(1) : r.to; // keep the user's capital letter
      out.changes.push({ from: w, to: to, kind: r.kind });
      return to;
    });
    return out;
  }

  // builder helper: would this (unknown) folded word be changed by split/fuzzy?
  function wouldChange(k) { if (k.length <= 3) return false; return !!(split(k) || fuzzy(k)); }
  return {
    wouldChange: wouldChange,
    version: VERSION, fold: fold, load: load, loaded: function () { return !!V; }, correct: correct, correctToken: correctToken,
    dl: dl, neighbors: neighbors, fixLayout: fixLayout, known: function (w) { return known(fold(w)); }, stats: stats,
    TABLE: TABLE, EXTRA_WORDS: EXTRA_WORDS, size: function () { return V ? V.size : 0; }
  };
});
