// VELANTRIM EITI v14.15.0 — EITI Frames: офлайн-понимание формулировок (RU).
// Чистая логика без DOM, без сети и без localStorage (UMD: window.EitiFrames / module.exports).
//   • нормализация, выкидывание слов-паразитов, оговорки диктовки («поцелуй» → «поясни», только если дальше тема);
//   • маленький стеммер в духе Snowball-RU (без lookbehind — работает и в старом Safari);
//   • речевые акты и вопросы (расскажи / объясни / по сути / зачем / когда / сколько / откуда / это точно…) в любом порядке слов;
//   • тема + местоимения («поясни это», «а кто это открыл?») → последняя карточка;
//   • ответы по полям карточек понятий KB (def/short/ex/why/use/how/when/origin/count/who/verify), честное «нет данных»;
//   • продолжение диалога («да / ещё / а зачем? / короче / хватит») — только после ответа фреймов;
//   • v14.14.0 talk: мнение / рассуждение / «что будет, если» / другой вариант / за и против / по шагам / итог / эмоции / «повтори» —
//     грамматика триггеров (pack.slots), ranked-шаблоны ответов (pack.acts) с ротацией без повтора подряд, контекст (тема, прошлая тема, последний ответ);
//   • defer-список (стихи, сказки, заметки, файлы, погода…) → молчим, отвечают другие движки; только точные формы (не «стихия», не «погодите»).
//   • v14.14.0 intents+: где / можно ли / стоит ли / есть ли / правда ли / разве / tag («…, да?») / «X или Y» / «перечисли» / «как называется» /
//     постпозиция («квазар это что») / эллипсис («а собака?») / обращения («алиса, …») / сленг («чё», «скока») / индефиниты («кто-то») /
//     составные («что такое X и почему») / творительный падеж («с китом» → «кит»); личные эмоции → мимо фреймов (EitiCare/диалоги).
//   • v14.15.0 intents-next: чей / с кем·для кого / насколько / до каких пор / «который из» / небось·авось·ведь; «дальше-то», «скажи-ка» (частицы через дефис),
//     «неее» (повторы букв), «двадцать один» → 21; контекстные реплики без контекста («повтори», «в смысле») → pass, а не null.
// Данные — local/eiti_frames.json (правится без кода). Хост (index.html) даёт lookup(тема) и pass(текст).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EitiFrames = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var TTL = 20 * 60 * 1000;
  var P = null;

  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/ё/g, 'е')
      .replace(/[^a-zа-я0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  // v14.14.0 intents+: «кто-то / что-нибудь / кое-что» → одно слово (не вопрос); сленг («чё», «скока») → норма (pack.canon_words)
  var INDEF = { 'кто': 1, 'что': 1, 'где': 1, 'когда': 1, 'как': 1, 'какой': 1, 'какая': 1, 'какое': 1, 'какие': 1, 'куда': 1, 'почему': 1, 'зачем': 1, 'сколько': 1, 'чей': 1, 'чего': 1, 'кого': 1, 'кому': 1, 'чем': 1, 'откуда': 1 };
  var INDEF_T = { 'то': 1, 'нибудь': 1, 'либо': 1 };
  var CW = {};
  // v14.15.0: «дальше-то», «скажи-ка», «всё-таки» → без частицы (кроме «кто-то/что-то…»: это индефиниты)
  function unhyph(s) {
    return String(s == null ? '' : s).replace(/([A-Za-zА-Яа-яЁё]+)-(то|ка|таки)(?![A-Za-zА-Яа-яЁё])/gi, function (m, b) { return INDEF[norm(b)] ? m : b; });
  }
  // «неее» → «нее» (если это слово сленга) или «не»; «хммм» → «хм»: три и больше одинаковых букв подряд
  function squeeze(x) {
    if (!/([а-яa-z])\1\1/.test(x)) return x;
    var two = x.replace(/([а-яa-z])\1\1+/g, '$1$1');
    return CW[two] ? two : x.replace(/([а-яa-z])\1\1+/g, '$1');
  }
  // «двадцать один» → «21», «сто двадцать пять» → «125»: только составные числительные (≥2 слов), одиночные слова не трогаем
  var NUM = { 'ноль': 0, 'один': 1, 'одна': 1, 'одно': 1, 'два': 2, 'две': 2, 'три': 3, 'четыре': 4, 'пять': 5, 'шесть': 6, 'семь': 7, 'восемь': 8, 'девять': 9, 'десять': 10,
    'одиннадцать': 11, 'двенадцать': 12, 'тринадцать': 13, 'четырнадцать': 14, 'пятнадцать': 15, 'шестнадцать': 16, 'семнадцать': 17, 'восемнадцать': 18, 'девятнадцать': 19,
    'двадцать': 20, 'тридцать': 30, 'сорок': 40, 'пятьдесят': 50, 'шестьдесят': 60, 'семьдесят': 70, 'восемьдесят': 80, 'девяносто': 90,
    'сто': 100, 'двести': 200, 'триста': 300, 'четыреста': 400, 'пятьсот': 500, 'шестьсот': 600, 'семьсот': 700, 'восемьсот': 800, 'девятьсот': 900 };
  function numbers(a) {
    var o = [], i = 0;
    while (i < a.length) {
      var j = i, val = 0, last = 1e9, ok = true;
      while (j < a.length && NUM[a[j]] != null) {
        var v = NUM[a[j]], rank = v >= 100 ? 100 : v >= 20 ? 10 : 1;
        // порядок разрядов: сотни → десятки → единицы, каждый разряд один раз («два три» — не число)
        if (rank >= last || (rank === 1 && last === 1)) break;
        if (rank === 1 && v >= 10 && last < 100) break;
        val += v; last = rank === 1 && v >= 10 ? 1 : rank; j++;
      }
      if (j - i >= 2 && ok) { o.push(String(val)); i = j; } else { o.push(a[i]); i++; }
    }
    return o;
  }
  function toks(s) {
    var n = norm(unhyph(s)); if (!n) return [];
    var a = numbers(n.split(' ').map(squeeze)), o = [];
    for (var i = 0; i < a.length; i++) {
      var x = a[i], nx = a[i + 1];
      if (CW[x]) { if (CW[x].length === 1 && INDEF[CW[x][0]] && nx && INDEF_T[nx]) { o.push(CW[x][0] + nx); i++; continue; } o.push.apply(o, CW[x]); continue; }
      if (nx && INDEF[x] && INDEF_T[nx]) { o.push(x + nx); i++; continue; }
      if (x === 'кое' && nx && INDEF[nx]) { o.push('кое' + nx); i++; continue; }
      o.push(x);
    }
    return o;
  }

  // ── стеммер (упрощённый Snowball-RU; группы «после а/я» проверяются вручную, без lookbehind) ──
  var VOW = /[аеиоуыэюя]/;
  var PERF_P = ['ив', 'ивши', 'ившись', 'ыв', 'ывши', 'ывшись'], PERF_A = ['в', 'вши', 'вшись'];
  var REFL = ['ся', 'сь'];
  var ADJ = ['ее', 'ие', 'ые', 'ое', 'ими', 'ыми', 'ей', 'ий', 'ый', 'ой', 'ем', 'им', 'ым', 'ом', 'его', 'ого', 'ему', 'ому', 'их', 'ых', 'ую', 'юю', 'ая', 'яя', 'ою', 'ею'];
  var PART_P = ['ивш', 'ывш', 'ующ'], PART_A = ['ем', 'нн', 'вш', 'ющ', 'щ'];
  var VERB_P = ['ила', 'ыла', 'ена', 'ейте', 'уйте', 'ите', 'или', 'ыли', 'ей', 'уй', 'ил', 'ыл', 'им', 'ым', 'ен', 'ило', 'ыло', 'ено', 'ят', 'ует', 'уют', 'ит', 'ыт', 'ены', 'ить', 'ыть', 'ишь', 'ую', 'ю'];
  var VERB_A = ['ла', 'на', 'ете', 'йте', 'ли', 'й', 'л', 'ем', 'н', 'ло', 'но', 'ет', 'ют', 'ны', 'ть', 'ешь', 'нно'];
  var NOUN = ['а', 'ев', 'ов', 'ие', 'ье', 'е', 'иями', 'ями', 'ами', 'еи', 'ии', 'и', 'ией', 'ей', 'ой', 'ий', 'й', 'иям', 'ям', 'ием', 'ем', 'ам', 'ом', 'о', 'у', 'ах', 'иях', 'ях', 'ы', 'ь', 'ию', 'ью', 'ю', 'ия', 'ья', 'я'];
  var SUPER = ['ейш', 'ейше'];
  function ends(w, s) { return w.length >= s.length && w.slice(w.length - s.length) === s; }
  // cut(rv, plain, afterAYa) → rv без самого длинного подходящего окончания или null
  function cut(rv, plain, ay) {
    var best = 0, i, s;
    for (i = 0; i < plain.length; i++) { s = plain[i]; if (s.length > best && ends(rv, s)) best = s.length; }
    if (ay) for (i = 0; i < ay.length; i++) {
      s = ay[i];
      if (s.length > best && ends(rv, s)) { var c = rv.charAt(rv.length - s.length - 1); if (c === 'а' || c === 'я') best = s.length; }
    }
    return best ? rv.slice(0, rv.length - best) : null;
  }
  function stem(w) {
    w = String(w || '');
    if (w.length < 4 || !/^[а-я]+$/.test(w)) return w;
    var m = w.search(VOW); if (m < 0) return w;
    var pre = w.slice(0, m + 1), rv = w.slice(m + 1), r = cut(rv, PERF_P, PERF_A);
    if (r === null) {
      var t = cut(rv, REFL); if (t !== null) rv = t;
      r = cut(rv, ADJ);
      if (r !== null) { var t2 = cut(r, PART_P, PART_A); if (t2 !== null) r = t2; }
      else { r = cut(rv, VERB_P, VERB_A); if (r === null) { r = cut(rv, NOUN); if (r === null) r = rv; } }
    }
    rv = r;
    if (ends(rv, 'и')) rv = rv.slice(0, -1);
    var t3 = cut(rv, SUPER); if (t3 !== null) rv = t3;
    if (ends(rv, 'нн')) rv = rv.slice(0, -1); else if (ends(rv, 'ь')) rv = rv.slice(0, -1);
    return pre + rv;
  }

  // ── пакет ──
  var PRIO = { ask_compare: 9, q_verify: 8, q_origin: 8, q_purpose: 7, q_why: 7, q_when: 7, q_count: 7, q_who: 6, q_how: 5, ask_example: 5, ask_advice: 5, ask_define: 4, ask_essence: 3, ask_explain: 2, ask_tell: 1 };
  var SEP = { 'и': 1, 'или': 1, 'от': 1, 'между': 1, 'vs': 1, 'versus': 1, 'с': 1, 'со': 1 };
  var XCAP = 800;
  // v14.14.0 talk: грамматика триггеров — «(a|b)» варианты, «[x]» или «(x)?» необязательно, «$slot» — список из pack.slots
  function expand(src, slots) {
    var s = String(src == null ? '' : src), i = 0;
    function cross(out, part) {
      var nx = [];
      for (var a = 0; a < out.length; a++) for (var b = 0; b < part.length; b++) { if (nx.length >= XCAP) return nx; nx.push(out[a] + part[b]); }
      return nx;
    }
    function seq() {
      var out = [''];
      while (i < s.length) {
        var ch = s.charAt(i), part;
        if (ch === ')' || ch === ']' || ch === '|') break;
        if (ch === '(' || ch === '[') {
          var close = ch === '(' ? ')' : ']'; i++;
          part = alts(close);
          var opt = close === ']';
          if (s.charAt(i) === '?') { opt = true; i++; }
          if (opt) part = part.concat(['']);
        } else if (ch === '$') {
          var m = /^\$([a-z_0-9]+)/i.exec(s.slice(i)); i += m ? m[0].length : 1;
          part = m && slots && Array.isArray(slots[m[1]]) ? slots[m[1]].map(String) : [''];
        } else if (ch === ' ') { i++; part = [' ']; }
        else { var w = /^[^()\[\]|$ ]+/.exec(s.slice(i))[0]; i += w.length; part = [w]; }
        out = cross(out, part);
      }
      return out;
    }
    function alts(close) {
      var res = [];
      for (;;) {
        res = res.concat(seq());
        var c = s.charAt(i);
        if (c === '|') { i++; continue; }
        if (c === close) i++;
        return res;
      }
    }
    var r = seq();
    while (i < s.length) { if (s.charAt(i) === '|') { i++; r = r.concat(seq()); } else i++; }
    return r;
  }
  function phrases(list, slots) {
    var o = [];
    (list || []).forEach(function (x) {
      (Array.isArray(x) ? [x.join(' ')] : expand(x, slots)).forEach(function (e) { var t = toks(e); if (t.length) o.push(t); });
    });
    return o;
  }
  function stemmed(list, sx) { return phrases(list).map(function (t) { return t.map(sx || stem); }); }
  function set(list) { var o = {}; (list || []).forEach(function (x) { o[norm(x)] = 1; }); return o; }
  function compile(pack) {
    if (!pack || !Array.isArray(pack.intents)) return null;
    var slots = pack.slots || {};
    CW = {};
    Object.keys(pack.canon_words || {}).forEach(function (k) { var v = norm(pack.canon_words[k]); if (norm(k) && v) CW[norm(k)] = v.split(' '); });
    // defer — только точные формы (грамматика разворачивается): «стих/стихи», но не «стихия»; «погода», но не «погодите»
    var defer = {};
    (pack.defer || []).forEach(function (x) { expand(x, slots).forEach(function (e) { var n = norm(e); if (n) defer[n] = 1; }); });
    var c = { raw: pack, fillers: phrases(pack.fillers), stop: phrases(pack.stop), self: set(pack.self), pron: set(pack.pron), slips: {}, defer: defer,
      wake: phrases(pack.wake), wakeSoft: phrases(pack.wake_soft), tags: phrases(pack.tags), interj: set(pack.interj), nofz: set(pack.nofuzzy_fams), post: phrases(pack.postdef),
      ell: set(pack.ellipsis_lead), ellStop: set(pack.ellipsis_stop), whole: {}, keep: phrases(pack.filler_keep), deferNot: phrases(pack.defer_not), emo: null,
      mods: [], intents: [], idx: {}, byId: {}, fu: [], vocab: {}, vfirst: {}, fams: {}, nvar: 0, chain: pack.chain || ['def', 'ex', 'why', 'use', 'how', 'when', 'origin'] };
    Object.keys(pack.slips || {}).forEach(function (k) { c.slips[norm(k)] = norm(pack.slips[k]); });
    Object.keys(pack.whole || {}).forEach(function (id) { phrases(pack.whole[id], slots).forEach(function (t) { c.whole[t.join(' ')] = id; }); });
    var eg = pack.emotion_guard;
    if (eg) c.emo = { crisis: phrases(eg.crisis).map(function (t) { return ' ' + t.join(' ') + ' '; }), strong: set(eg.strong), weak: set(eg.weak), weakPh: phrases(eg.weak).filter(function (t) { return t.length > 1; }).map(function (t) { return ' ' + t.join(' ') + ' '; }), me: set(eg.me), notq: set(eg.notq) };
    // exact: слова без стемминга («сложнее» ≠ «сложно», «понятнее» ≠ «понятно»)
    var exact = set(pack.exact), sx = c.sx = function (w) { return exact[w] ? w + '!' : stem(w); };
    Object.keys(pack.modifiers || {}).forEach(function (k) { stemmed(pack.modifiers[k], sx).forEach(function (t) { c.mods.push({ id: k, t: t }); }); });
    // «максимально подробно» раньше «подробно» — иначе «максимально» уходит в тему
    c.mods.sort(function (a, b) { return b.t.length - a.t.length; });
    // социальный зачин: «ок, …», «спасибо! …» (после зачина — знак препинания)
    var ls = (pack.lead_social || []).map(function (x) { return norm(x).replace(/ /g, '\\s+'); }).filter(Boolean);
    c.leadRe = ls.length ? new RegExp('^\\s*(?:' + ls.join('|') + ')\\s*[,.!?…:;—–-]+\\s*([\\s\\S]+)$', 'i') : null;
    var stopRaw = {}, fill1 = {}, multiF = c.fillers.filter(function (t) { return t.length > 1; });
    c.fillers.forEach(function (t) { if (t.length === 1) { stopRaw[t[0]] = 1; fill1[t[0]] = 1; } });
    c.stop.forEach(function (t) { if (t.length === 1) stopRaw[t[0]] = 1; });
    c.stopRaw = stopRaw;
    c.pronS = {}; Object.keys(c.pron).forEach(function (k) { c.pronS[sx(k)] = 1; });
    function voc(w) { c.vocab[w] = 1; if (w.length >= 5) { var f = w.charAt(0); (c.vfirst[f] = c.vfirst[f] || []).push(w); } }
    c.fillers.concat(c.stop).forEach(function (t) { t.forEach(function (w) { c.vocab[w] = 1; }); });
    pack.intents.forEach(function (it) {
      var meta = { id: it.id, field: it.field, fam: it.fam || it.id, ctx: !!it.ctx, prio: it.prio != null ? +it.prio : (PRIO[it.id] || 0), drop: set(it.drop), dropS: {} };
      Object.keys(meta.drop).forEach(function (k) { meta.dropS[sx(k)] = 1; });
      c.byId[it.id] = meta; c.fams[meta.fam] = 1;
      var seen = {};
      phrases(it.triggers, slots).forEach(function (t) {
        // слова-паразиты внутри триггера прозрачны (они размечаются раньше); одиночное служебное слово — не триггер
        var n0 = t.length;
        var kp = {}; c.keep.forEach(function (ph) { var i = find(t, [], ph, 0); if (i >= 0) for (var j = 0; j < ph.length; j++) kp[i + j] = 1; });
        t = t.filter(function (w, i) { return kp[i] || !fill1[w]; });
        multiF.forEach(function (ph) { var i; while ((i = find(t, [], ph, 0)) >= 0) t.splice(i, ph.length); });
        // «(ну)? так» → «так»: укороченный до одного служебного слова вариант — не триггер (исходные «как», «почему» остаются)
        if (!t.length || (t.length === 1 && n0 > 1 && ((stopRaw[t[0]] && t[0].length <= 4) || c.pron[t[0]] || SEP[t[0]]))) return;
        var st = t.map(sx), key = st.join(' ');
        if (seen[key]) return; seen[key] = 1;
        t.forEach(voc);
        var e = { id: it.id, field: it.field, meta: meta, t: st, raw: t.join(' '), prio: meta.prio, ctx: meta.ctx };
        c.intents.push(e); (c.idx[st[0]] = c.idx[st[0]] || []).push(e);
      });
    });
    c.nvar = c.intents.length;
    (pack.followups || []).forEach(function (f) {
      if (f.fam) c.fams[f.fam] = 1;
      phrases(f.triggers).forEach(function (t) {
        var red = t.filter(function (w) { return !stopRaw[w] && !c.pron[w]; }).map(sx);
        c.fu.push({ go: f.go, fam: f.fam || f.go, raw: t.join(' '), red: red.join(' ') });
      });
    });
    return c;
  }
  function load(pack) { var c = null; try { c = compile(pack); } catch (e) { c = null; } P = c; return !!P; }
  function loaded() { return !!P; }
  function create() { return { card: null, told: {}, offer: null, at: 0, rot: {}, last: null, prev: null, lastGo: null, lastIntent: null, lastFam: null }; }
  function prep(st) { if (!st.told) st.told = {}; if (!st.rot) st.rot = {}; return st; }
  function fresh(st, now) { return !!(st && st.card && (now || Date.now()) - st.at < TTL); }
  // статистика пакета (для тестов и отчёта): интенты, семейства речевых актов, развёрнутые варианты триггеров
  // скомпилированные триггеры (как их видит движок) — для генеративных тестов
  function triggers() { return P ? P.intents.map(function (e) { return { id: e.id, fam: e.meta.fam, ctx: e.ctx, raw: e.raw }; }) : []; }
  function stats() {
    if (!P) return null;
    return { intents: Object.keys(P.byId).length, followups: (P.raw.followups || []).length, families: Object.keys(P.fams).length, variants: P.nvar, fu: P.fu.length };
  }

  // найти фразу (массив) в массиве слов wl начиная с любой позиции среди неиспользованных; → индекс или -1
  function find(wl, used, ph, from) {
    for (var i = from || 0; i + ph.length <= wl.length; i++) {
      var ok = true;
      for (var j = 0; j < ph.length; j++) if (used[i + j] || wl[i + j] !== ph[j]) { ok = false; break; }
      if (ok) return i;
    }
    return -1;
  }
  // то же, но слова-паразиты внутри фразы пропускаются («как, ну, думаешь») → массив позиций или null
  function findP(wl, used, ph) {
    for (var i = 0; i < wl.length; i++) {
      if (used[i] || wl[i] !== ph[0]) continue;
      var pos = [i], k = i + 1, j = 1;
      for (; j < ph.length; j++) {
        // паразиты и местоимения внутри фразы прозрачны («как ты это считаешь»), если они не часть самой фразы
        while (k < wl.length && wl[k] !== ph[j] && (used[k] === 'f' || (P && P.pronS[wl[k]] && !used[k]))) k++;
        if (k >= wl.length || used[k] || wl[k] !== ph[j]) break;
        pos.push(k); k++;
      }
      if (j === ph.length) return pos;
    }
    return null;
  }
  function markAll(wl, used, list, tag) {
    var hit = false;
    list.forEach(function (ph) { var i; while ((i = find(wl, used, ph, 0)) >= 0) { for (var j = 0; j < ph.length; j++) used[i + j] = tag || 1; hit = true; } });
    return hit;
  }
  function isDefer(w) { return !!P.defer[w]; }
  // v14.14.0 intents+: личная эмоция («мне грустно», «я устала») → не тема для фреймов (EitiCare / диалоги / тёплый ответ)
  function emoGuard(w) {
    var E = P && P.emo; if (!E || !w.length) return false;
    var s = ' ' + w.join(' ') + ' ', i, me = false, strong = false, weak = false, notq = false;
    for (i = 0; i < E.crisis.length; i++) if (s.indexOf(E.crisis[i]) >= 0) return true;
    for (i = 0; i < w.length; i++) { if (E.me[w[i]]) me = true; if (E.strong[w[i]]) strong = true; if (E.weak[w[i]]) weak = true; if (E.notq[w[i]]) notq = true; }
    if (strong && !notq && (me || w.length <= 3)) return true;
    if (weak && me && !notq && w.length <= 4) return true;
    if (me && !notq && w.length <= 6) for (i = 0; i < E.weakPh.length; i++) if (s.indexOf(E.weakPh[i]) >= 0) return true;
    return false;
  }
  function startsWith(w, ph) { if (ph.length > w.length) return false; for (var i = 0; i < ph.length; i++) if (w[i] !== ph[i]) return false; return true; }
  function endsWith(w, ph) { var o = w.length - ph.length; if (o < 0) return false; for (var i = 0; i < ph.length; i++) if (w[o + i] !== ph[i]) return false; return true; }
  // обращения («алиса, …», «эити»): имена — в начале и в конце; «бот / робот / ассистент» — только в начале и только как обращение
  function stripWake(w, raw) {
    var out = w.slice(), ch = true, n = 0, head = norm(String(raw || '').split(/[,!:?]/)[0]);
    while (ch && n++ < 4) {
      ch = false;
      var lead = 0; while (lead < out.length && P.stopRaw[out[lead]] && P.fillers.some(function (f) { return f.length === 1 && f[0] === out[lead]; }) && lead < 2) lead++;
      for (var i = 0; i < P.wake.length; i++) {
        var ph = P.wake[i], rest = out.slice(lead);
        if (out.length - ph.length >= 1 && startsWith(rest, ph)) { out = out.slice(0, lead).concat(rest.slice(ph.length)); ch = true; break; }
        if (out.length - ph.length >= 2 && endsWith(out, ph)) { out = out.slice(0, out.length - ph.length); ch = true; break; }
      }
      if (ch) continue;
      for (var j = 0; j < P.wakeSoft.length; j++) {
        var q = P.wakeSoft[j];
        if (out.length - q.length >= 2 && startsWith(out, q) && (head === q.join(' ') || head === 'эй ' + q.join(' '))) { out = out.slice(q.length); ch = true; head = ''; break; }
      }
    }
    return out;
  }
  // опечатка на одну букву (замена/пропуск/лишняя/перестановка), первая буква совпадает
  function dl1(a, b) {
    if (a === b) return false;
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    var i = 0; while (i < la && i < lb && a.charAt(i) === b.charAt(i)) i++;
    if (i === 0) return false;
    if (la === lb) {
      if (a.slice(i + 1) === b.slice(i + 1)) return true;
      return a.charAt(i) === b.charAt(i + 1) && a.charAt(i + 1) === b.charAt(i) && a.slice(i + 2) === b.slice(i + 2);
    }
    return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
  }
  function fuzzy(wl) {
    var out = wl.slice(), ch = false;
    for (var i = 0; i < wl.length; i++) {
      var w = wl[i];
      if (w.length < 5 || P.vocab[w]) continue;
      var L = P.vfirst[w.charAt(0)] || [];
      for (var j = 0; j < L.length; j++) if (dl1(w, L[j])) { out[i] = L[j]; ch = true; break; }
    }
    return ch ? out : null;
  }

  // core → результат | null (нет интента) | 0 (сработал только «продолжающий» интент без контекста — повторить без них)
  function core(w, fixedW, st, now, noCtx, slip, any) {
    var used = [], sw = fixedW.map(P.sx), fr = fresh(st, now);
    markAll(fixedW, used, P.fillers, 'f');
    // «что значит X»: «значит» здесь не паразит
    P.keep.forEach(function (ph) { var i = find(fixedW, [], ph, 0); if (i >= 0) for (var j = 0; j < ph.length; j++) if (used[i + j] === 'f') used[i + j] = undefined; });
    var best = null, bestN = 0, mods = {}, also = [], alsoF = {};
    P.mods.forEach(function (m) { var pos = findP(sw, used, m.t); if (pos) { mods[m.id] = 1; pos.forEach(function (j) { used[j] = 'm'; }); } });
    var hits = [], seen = {};
    for (var a = 0; a < sw.length; a++) {
      var L = P.idx[sw[a]];
      if (!L || seen[sw[a]]) continue;
      seen[sw[a]] = 1;
      for (var b = 0; b < L.length; b++) {
        var it = L[b];
        if (it.ctx && !any && (noCtx || !fr)) continue;
        if (findP(sw, used, it.t)) hits.push({ it: it, sc: it.t.length * 100 + it.prio });
      }
    }
    hits.sort(function (x, y) { return y.sc - x.sc; });
    hits.forEach(function (h) {
      var pos = findP(sw, used, h.it.t); if (!pos) return;
      if (!best) { best = h.it.meta; bestN = h.it.t.length; alsoF[best.field] = 1; }
      else if (ALSO[h.it.field] && !h.it.ctx && !alsoF[h.it.field] && also.length < 2) { alsoF[h.it.field] = 1; also.push({ intent: h.it.id, fam: h.it.meta.fam, field: h.it.field, at: pos[0] }); }
      pos.forEach(function (j) { used[j] = 'i'; });
    });
    // «как, короче?» — одиночное «как» при модификаторе — это модификатор
    if (best && best.id === 'q_how' && bestN === 1 && (mods.short || mods.simple || mods.long)) { best = null; also = []; }
    // «хм, а в двух словах?» — модификатор сильнее слабого реплики-интента (хм/ну/да)
    if (best && best.prio <= 2 && (mods.short || mods.simple || mods.long)) best = null;
    if (!best && mods.short) best = P.byId.ask_essence || { id: 'ask_essence', field: 'short', fam: 'essence', drop: {}, dropS: {} };
    if (!best && mods.simple) best = P.byId.fu_simple || P.byId.ask_explain || { id: 'ask_explain', field: 'def', fam: 'explain', drop: {}, dropS: {} };
    if (!best && mods.long) best = P.byId.ask_explain || { id: 'ask_explain', field: 'def', fam: 'explain', drop: {}, dropS: {} };
    if (!best) return null;
    var self = false;
    for (var y = 0; y < fixedW.length; y++) if (P.self[fixedW[y]] && used[y] !== 'i') self = true;
    markAll(fixedW, used, P.stop, 's');
    var topic = [], topics = [[]], pron = false, drop = best.drop || {}, dropS = best.dropS || {};
    for (var x = 0; x < fixedW.length; x++) {
      var t = fixedW[x];
      if (SEP[t]) { if (topics[topics.length - 1].length) topics.push([]); continue; }
      if (used[x]) continue;
      if (P.pron[t]) { pron = true; continue; }
      if (P.self[t]) { self = true; continue; }
      if (P.interj[t]) continue;
      if (drop[t] || dropS[P.sx(t)]) continue;
      topic.push(w[x]); topics[topics.length - 1].push(w[x]);
    }
    topics = topics.filter(function (q) { return q.length; }).map(function (q) { return q.join(' '); });
    var tp = topic.join(' ');
    // составной вопрос («что такое квазар и почему он светится») — тема из первой части
    if (also.length && topics.length > 1) tp = topics[0];
    if (best.ctx && !any && (tp || !fr)) return 0;
    // оговорка диктовки («поцелуй» → «поясни») — только если есть тема или «это/он» («поцелуй меня» — не вопрос)
    if (slip && !tp && !pron) return null;
    var field = best.field;
    if (field === 'def' && mods.short) field = 'short';
    var tpl = (P.raw.canon || {})[field];
    also.sort(function (a, b) { return a.at - b.at; });
    return { kind: 'ask', n: bestN, intent: best.id, fam: best.fam || best.id, field: field, mods: mods, topic: tp, topics: topics, pron: pron, self: self, slip: slip,
      fixed: slip ? fixedW.join(' ') : null, canon: tp && tpl ? tpl.replace('{t}', tp) : null, also: also };
  }
  var ALSO = { why: 1, use: 1, when: 1, how: 1, who: 1, origin: 1, count: 1, ex: 1, where: 1, verify: 1 };
  function run(w, fixedW, st, now, slip) { var r = core(w, fixedW, st, now, false, slip); if (r === 0) r = core(w, fixedW, st, now, true, slip); return r; }
  // слова темы без служебных/паразитов/местоимений
  function content(w) {
    var used = [];
    markAll(w, used, P.fillers, 'f'); markAll(w, used, P.stop, 's');
    return w.filter(function (x, i) { return !used[i] && !P.self[x] && !P.pron[x] && !P.interj[x] && !SEP[x]; });
  }
  function mk(intent, fam, field, topic, topics, extra) {
    var m = P.byId[intent], tpl = (P.raw.canon || {})[field];
    var r = { kind: 'ask', n: 2, intent: intent, fam: (m && m.fam) || fam, field: (m && m.field) || field, mods: {}, topic: topic, topics: topics || (topic ? [topic] : []), pron: false, self: false, slip: null, fixed: null,
      canon: topic && tpl ? tpl.replace('{t}', topic) : null, also: [] };
    for (var k in extra || {}) r[k] = extra[k];
    return r;
  }
  // формы без явного триггера: tag-вопрос, «X или Y», постпозиция «X это (что)», эллипсис «а собака?»
  function shapes(w, st, now, r) {
    var fr = fresh(st, now), i;
    // «X или Y» — выбор/сравнение
    var oi = w.indexOf('или');
    if (oi > 0 && oi < w.length - 1 && w[w.length - 1] !== 'нет' && (!r || /^(ask_define|ask_tell|q_verify|ask_advice|ask_essence)$/.test(r.intent))) {
      var L = content(w.slice(0, oi)), R = content(w.slice(oi + 1));
      if (r && r.topics && r.topics.length === 2) { L = r.topics[0].split(' '); R = r.topics[1].split(' '); }
      if (L.length && R.length && L.length <= 4 && R.length <= 4) return mk('ask_choose', 'choice', 'cmp', L.join(' ') + ' ' + R.join(' '), [L.join(' '), R.join(' ')], { choice: true });
    }
    if (r) return r;
    // постпозиция: «квазар это», «марс это что», «песнь о нибелунгах что такое» (последнее ловит обычный триггер)
    for (i = 0; i < P.post.length; i++) {
      if (endsWith(w, P.post[i]) && w.length > P.post[i].length) {
        var c = content(w.slice(0, w.length - P.post[i].length));
        if (c.length && c.length <= 5) return mk('ask_define', 'define', 'def', c.join(' '), null, { post: true });
      }
    }
    // эллипсис: «а собака?» после ответа фреймов → тот же вопрос про новую тему
    if (fr && st.lastGo && w.length >= 2 && w.length <= 5 && P.ell[w[0]] && !P.ellStop[w[1]]) {
      var e = content(w.slice(1));
      if (e.length && e.length === w.length - 1 - w.slice(1).filter(function (x) { return P.stopRaw[x]; }).length) {
        var go = st.lastGo, fld = (go === 'def' || go === 'short' || ALSO[go]) ? go : 'def';
        return mk(st.lastIntent && P.byId[st.lastIntent] && P.byId[st.lastIntent].field === fld ? st.lastIntent : 'ask_define', st.lastFam || 'define', fld, e.join(' '), null, { ellipsis: true, field: fld });
      }
    }
    return null;
  }

  // составные реплики (v14.15.0):
  //  «ок, расскажи о космосе» / «спасибо! а что такое луна?» — зачин снимается;
  //  «что такое наука. а зачем она?» — второй вопрос о той же теме идёт в also (ответы подряд)
  function compound(s, st, now) {
    var m = P.leadRe && P.leadRe.exec(s.replace(/ё/gi, 'е'));
    if (m && /[а-яё]/i.test(m[1])) { var pl = parse(m[1], st, now); if (pl && pl.kind === 'ask') return pl; }
    var parts = s.split(/[.!?…]+\s+/).filter(function (x) { return /[а-яё]/i.test(x); });
    if (parts.length < 2 || parts.length > 3) return null;
    var pa = parse(parts[0], st, now);
    if (!pa || pa.kind !== 'ask' || !pa.topic || (pa.also || []).length >= 2) return null;
    var also = (pa.also || []).slice(), got = {}; got[pa.field] = 1; also.forEach(function (a) { got[a.field] = 1; });
    for (var i = 1; i < parts.length; i++) {
      var pb = parse(parts[i], st, now);
      if (!pb || pb.kind !== 'ask' || !ALSO[pb.field] || got[pb.field]) return null;
      if (pb.topic && pb.topic !== pa.topic) return null;
      if (!pb.topic && !pb.pron) return null;
      got[pb.field] = 1; also.push({ intent: pb.intent, fam: pb.fam, field: pb.field, at: 1000 + i });
    }
    var r = {}; for (var k in pa) r[k] = pa[k];
    r.also = also; r.compound = parts.length;
    return r;
  }
  // parse(text, st, now) → null | {kind:'defer'} | {kind:'fu', go, fam} | {kind:'ask', intent, fam, field, mods, topic, topics, pron, slip, fixed, canon}
  function parse(text, st, now) {
    if (!P) return null;
    var s = String(text || '');
    if (!s || s.length > LIM_C || !/[а-яё]/i.test(s)) return null;
    var cp = compound(s, st, now); if (cp) return cp;
    var w = toks(s); if (!w.length || w.length > LIM_W) return null;
    // defer — только если это не вопрос о понятии («песнь о нибелунгах что такое», «что такое стих»)
    var dq = P.deferNot.some(function (ph) { return find(w, [], ph, 0) >= 0; });
    if (!dq) for (var d = 0; d < w.length; d++) if (isDefer(w[d])) return { kind: 'defer' };
    if (emoGuard(w)) return { kind: 'pass', intent: 'mood', fam: 'mood' };
    w = stripWake(w, s);
    var fr = fresh(st, now);
    // целые реплики («как дела», «а ты», «что ты умеешь») — отвечают диалоги, не карточки
    var wf = w.filter(function (x) { return !(P.stopRaw[x] && P.fillers.some(function (f) { return f.length === 1 && f[0] === x; })) || x === 'а'; }).join(' '), wid = P.whole[wf] || P.whole[w.join(' ')];
    if (wid) return { kind: 'pass', intent: wid, fam: (P.byId[wid] && P.byId[wid].fam) || 'social' };
    // продолжение диалога — только после ответа фреймов
    if (fr) {
      var raw = w.join(' '), rw = w.filter(function (x) { return !P.stopRaw[x] && !P.pron[x]; }), red = rw.map(P.sx).join(' ');
      // по «очищенной» форме — только если отброшено не больше одного слова («ну да», но не «вот это да»)
      if (w.length - rw.length > 1) red = '';
      for (var f = 0; f < P.fu.length; f++) if (P.fu[f].raw === raw || (red && P.fu[f].red === red)) return { kind: 'fu', go: P.fu[f].go, fam: P.fu[f].fam };
    }
    var slip = null, fixedW = w.slice();
    for (var k = 0; k < w.length; k++) if (P.slips[w[k]]) { slip = w[k]; fixedW[k] = P.slips[w[k]]; }
    // tag-вопрос: «марс красный, да?» / «…, не так ли?» — хвост снимается
    for (var g = 0; g < P.tags.length; g++) {
      var tg = P.tags[g];
      if (w.length - tg.length >= 2 && endsWith(w, tg)) {
        var tw = w.slice(0, w.length - tg.length), tf = fixedW.slice(0, w.length - tg.length), tr = run(tw, tf, st, now, slip);
        if (tr) { tr.tag = true; return tr; }
        var tc = content(tw);
        if (tc.length) return mk('q_tag', 'doubt', 'verify', tc.slice(0, 1).join(' '), null, { tag: true, claim: tc.join(' ') });
      }
    }
    var r = run(w, fixedW, st, now, slip);
    if (!r || r.n === 1) {
      // опечатки в словах-триггерах («обьясни», «щитаешь», «премер») — одна буква; также когда сработало лишь одно слово
      // («как ты ситаешь» → не «как», а «как ты считаешь»)
      var fz = fuzzy(fixedW);
      if (fz) {
        var r2 = core(w, fz, st, now, false, slip);
        if (r2 === 0) r2 = core(w, fz, st, now, true, slip);
        if (r2 && !r2.topic && !r2.pron && !fr) r2 = null;
        // эмоции/реплики — без «исправления опечаток» («кайф» ≠ «кафе», «бывай» ≠ «бывает»)
        if (r2 && P.nofz[r2.fam]) r2 = null;
        if (r2 && (!r || r2.n > 1)) { r = r2; r.typo = true; }
      }
    }
    if (r && r.field === 'pass') return { kind: 'pass', intent: r.intent, fam: r.fam, topic: r.topic };
    return shapes(w, st, now, r) || ctxOnly(w, fixedW, st, now, slip);
  }
  var LIM_C = 400, LIM_W = 40;
  // v14.15.0: реплика продолжения без свежего ответа фреймов («повтори последний пункт», «в смысле, речь о сроке?», «я про другое», «а цена?»)
  // — не null, а pass с интентом: отвечают диалоги/KB, как и раньше (respond ведёт себя как при null), но разбор виден в аудите и в тестах
  function ctxOnly(w, fixedW, st, now, slip) {
    var r = core(w, fixedW, st, now, false, slip, true);
    if (r && r.field !== 'pass' && P.byId[r.intent] && P.byId[r.intent].ctx) return { kind: 'pass', intent: r.intent, fam: r.fam, topic: r.topic, ctxOnly: true };
    if (!fresh(st, now) && w.length >= 2 && w.length <= 3 && P.ell[w[0]] && !P.ellStop[w[1]]) {
      var e = content(w.slice(1));
      if (e.length === w.length - 1) return { kind: 'pass', intent: 'fu_ellipsis', fam: 'ellipsis', topic: e.join(' '), ctxOnly: true };
    }
    return null;
  }

  function fill(tpl, o) { return String(tpl || '').replace(/\{(\w+)\}/g, function (_m, k) { return o[k] != null ? o[k] : ''; }); }
  // ротация вариантов формулировки: по кругу, без повтора подряд (st.rot[key])
  function rot(list, key, st) {
    if (!Array.isArray(list)) return list == null ? '' : String(list);
    if (list.length < 2 || !st) return list[0] || '';
    if (!st.rot) st.rot = {};
    var i = st.rot[key] == null ? 0 : (st.rot[key] + 1) % list.length;
    st.rot[key] = i;
    return list[i];
  }
  function has(card, field) { if (!card) return false; if (field === 'def') return !!card.a; return !!(card.f && card.f[field]); }
  function nextField(card, st) {
    for (var i = 0; i < P.chain.length; i++) { var f = P.chain[i]; if (!st.told[f] && has(card, f)) return f; }
    return null;
  }
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function val(card, f) { return f === 'def' ? card.a : (card.f && card.f[f]) || ''; }
  function vars(card, st) {
    var R = P.raw, f = card.f || {}, fru = R.field_ru || {}, o = {}, k;
    for (k in f) if (Object.prototype.hasOwnProperty.call(f, k)) o[k] = f[k];
    o.title = o.Title = cap(card.title); o.title_l = String(card.title || '').toLowerCase();
    o.def = card.a; o.short = f.short || card.a;
    var m = /^[\s\S]*?[.!?](\s|$)/.exec(card.a || ''); o.first = m ? m[0].trim() : card.a;
    var told = Object.keys(st.told || {}).filter(function (x) { return st.told[x] && x !== 'def' && fru[x] && has(card, x); }).map(function (x) { return fru[x]; });
    o.told_tail = told.length && R.talk && R.talk.told ? fill(R.talk.told, { list: told.join(', ') }) : '';
    return o;
  }
  // карточка сменилась — прошлую помним (для «а в чём разница?»)
  function setCard(card, st, now) {
    if (!st.card || st.card.id !== card.id) { if (st.card) st.prev = st.card; st.told = {}; }
    st.card = card; st.at = now || Date.now();
  }
  function tail(card, st, text) {
    var R = P.raw, nx = nextField(card, st);
    st.offer = nx;
    if (nx && R.offers && R.offers[nx]) text += '\n\n' + fill(R.offer_tail, { offer: R.offers[nx] });
    return text;
  }
  // answer(card, field, mods, st, now) → {text, field, offer}
  function answer(card, field, mods, st, now, noTail) {
    mods = mods || {}; st = prep(st || create());
    setCard(card, st, now);
    var R = P.raw, fr = R.frames || {}, fru = R.field_ru || {}, f = card.f || {}, title = cap(card.title), text, v = vars(card, st);
    if (field === 'def' && mods.simple && f.short) field = 'short';
    if (field === 'def' || (field === 'short' && !f.short)) {
      field = 'def';
      text = '📘 **' + title + '**\n\n' + card.a;
      if (mods.long && f.ex && !st.told.ex) { text += '\n\n' + fill(rot(fr.ex, 'f:ex', st), v); st.told.ex = 1; }
    } else if (f[field]) {
      text = '📘 **' + title + '** · ' + (fru[field] || field) + '\n\n' + fill(rot(fr[field], 'f:' + field, st), v);
    } else if (field === 'verify') {
      v.verify = R.verify_default || '';
      text = '📘 **' + title + '** · ' + (fru.verify || '') + '\n\n' + fill(rot(fr.verify, 'f:verify', st), v);
    } else {
      text = fill(rot(fr.missing, 'f:missing', st), { field: fru[field] || field, title: title, def: f.short || card.a });
    }
    st.told[field] = 1; st.lastGo = field;
    if (!noTail) text = tail(card, st, text);
    st.last = text;
    return { text: text, field: field, offer: st.offer };
  }
  function stepsOf(s) {
    return String(s || '').split(/[.;!]\s+|\s+(?:→|->)\s+|,\s+(?:затем|потом|после этого|а затем|и затем|а потом|и потом)\s+/)
      .map(function (x) { return cap(x.trim().replace(/[.;!]+$/, '')); }).filter(function (x) { return x.length > 2; });
  }
  // ranked-варианты из pack.acts: первый подходящий (need — поля есть; new — ещё не сказано; list — ≥min полей; steps — ≥2 шага)
  function renderAct(opts, field, card, st, v) {
    var R = P.raw, labels = R.labels || {};
    for (var oi = 0; oi < opts.length; oi++) {
      var o = opts[oi], key = field + ':' + oi, text, marks = [];
      if (o.need && !o.need.every(function (x) { return has(card, x); })) continue;
      if (o.new && !o.new.every(function (x) { return has(card, x) && !st.told[x]; })) continue;
      if (o.steps) {
        var parts = stepsOf(val(card, o.steps));
        if (parts.length < 2) continue;
        text = fill(rot(o.intro, key + ':i', st), v) + '\n\n' + parts.map(function (x, n) { return (n + 1) + '. ' + x; }).join('\n');
        marks = [o.steps];
      } else if (o.list) {
        var fs = o.list.filter(function (x) { return has(card, x); });
        if (fs.length < (o.min || 1)) continue;
        var lb = o.labels || {};
        text = fill(rot(o.intro, key + ':i', st), v) + '\n\n' + fs.map(function (x, n) {
          return (o.num ? (n + 1) + '. ' : '• ') + '**' + (lb[x] || labels[x] || x) + ':** ' + val(card, x);
        }).join('\n') + (o.outro ? '\n\n' + fill(rot(o.outro, key + ':o', st), v) : '');
        marks = fs;
      } else {
        text = fill(rot(o.t, key, st), v);
        marks = (o.need || []).concat(o.new || []);
      }
      marks.forEach(function (x) { st.told[x] = 1; });
      return text;
    }
    return null;
  }
  // talk(card, act, st, now) → текст: мнение, «что будет, если», другой вариант, за и против, по шагам, итог, эмоции, «повтори»…
  function talk(card, field, st, now) {
    st = prep(st); now = now || Date.now();
    var R = P.raw, T = R.talk || {}, acts = R.acts || {}, fru = R.field_ru || {}, text;
    if (field === 'repeat') { st.at = now; return st.last ? fill(rot(T.repeat, 't:repeat', st), { last: st.last }) : rot(T.repeat_none, 't:rn', st); }
    if (field === 'bye') { var b = rot(T.bye, 't:bye', st); st.card = null; st.offer = null; return b; }
    setCard(card, st, now);
    var v = vars(card, st);
    if (acts[field]) {
      text = renderAct(acts[field], field, card, st, v);
      if (text == null) text = fill(rot(R.frames && R.frames.missing, 'f:missing', st), { field: fru[field] || field, title: v.title, def: v.short });
      text = '📘 **' + v.title + '** · ' + (fru[field] || field) + '\n\n' + text;
    } else {
      text = fill(rot(T[field] || T.agree, 't:' + field, st), v);
      if (field === 'emo_neg') st.told.short = 1;
    }
    st.lastGo = field;
    text = tail(card, st, text);
    if (!st.offer && !acts[field] && T.nothing_more) text += ' ' + rot(T.nothing_more, 't:nm', st);
    st.last = text;
    return text;
  }
  // followUp(go, st, now) → текст или null
  function followUp(go, st, now) {
    if (!fresh(st, now)) return null;
    prep(st);
    var card = st.card;
    if (go === 'stop') { st.card = null; st.offer = null; return P.raw.stopped || '👌'; }
    if (go === 'offer') go = st.offer || 'next';
    if (go === 'next') {
      var nx = nextField(card, st);
      if (!nx) { var t = fill(P.raw.done, { title: cap(card.title) }); st.card = null; st.offer = null; return t; }
      go = nx;
    }
    if (go === 'short' && !(card.f && card.f.short)) go = 'def';
    return answer(card, go, {}, st, now).text;
  }
  function compare(a, b, st, now) {
    var sa = (a.f && a.f.short) || a.a, sb = (b.f && b.f.short) || b.a;
    // «• **Гравитация** — Гравитация — это…» → без повтора названия
    function line(c, x) { var T = cap(c.title); return '• ' + (norm(x).indexOf(norm(c.title)) === 0 ? x.replace(new RegExp('^' + T.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '**' + T + '**') : '**' + T + '** — ' + x); }
    var text = '⚖️ **' + cap(a.title) + '** и **' + cap(b.title) + '**\n\n' + line(a, sa) + '\n\n' + line(b, sb);
    if (st) {
      // контекст остаётся: «подведи итог» / «а пример?» — про первую тему, «прошлая» — вторая
      prep(st);
      if (!st.card || st.card.id !== a.id) st.told = {};
      st.card = a; st.prev = b; st.at = now || Date.now(); st.lastGo = 'cmp'; st.offer = null;
      text += rot((P.raw.talk || {}).cmp_intro, 't:cmp', st) || '';
      st.last = text;
    }
    return text;
  }
  function isTalk(field) { var R = P.raw; return !!((R.acts && R.acts[field]) || (R.talk && R.talk[field] && field !== 'told')); }

  // respond(text, st, deps) → Promise<string|null>
  // deps: { lookup(topic) → Promise<card|null>, pass(text) → Promise<string|null>, now? }
  // card: { id, title, a, f|null, kn:boolean }
  function respond(text, st, deps) {
    st = prep(st || create());
    var now = deps.now || Date.now();
    function pass(q) {
      return Promise.resolve(deps.pass(q)).then(function (r) { if (r != null) { st.card = null; st.offer = null; } return r; });
    }
    var p = null;
    try { p = parse(text, st, now); } catch (e) { p = null; }
    if (p && p.ctxOnly) p = null;
    if (p && (p.kind === 'defer' || p.kind === 'pass')) return pass(text);
    if (!p) {
      // v14.14.0: голое понятие («наука», «фотосинтез») — сначала обычный путь, затем карточка понятия (только kn)
      var bare = toks(text);
      if (!P || !bare.length || bare.length > 3) return pass(text);
      return pass(text).then(function (r) {
        if (r != null) return r;
        return Promise.resolve(deps.lookup(norm(text))).then(function (c) { return c && c.kn ? answer(c, 'def', {}, st, now).text : null; });
      });
    }
    if (p.kind === 'fu') return Promise.resolve(followUp(p.go, st, now));
    st.lastIntent = p.intent; st.lastFam = p.fam;
    var field = p.field;
    // тема в косвенном падеже («с китом», «водой») — пробуем начальную форму (только карточки понятий)
    function look(t) {
      return Promise.resolve(deps.lookup(t)).then(function (c) {
        if (c) return c;
        var vs = caseVariants(t), k = 0;
        function nx() { if (k >= vs.length) return null; return Promise.resolve(deps.lookup(vs[k++])).then(function (c2) { return c2 && c2.kn ? c2 : nx(); }); }
        return nx();
      });
    }
    var cur = fresh(st, now) ? st.card : null;
    if (field === 'next' || field === 'stop') return Promise.resolve(followUp(field, st, now));
    if (field === 'another' && st.lastGo === 'alt') field = 'alt';
    if (field === 'how_to') {
      // «посоветуй / что делать» — про текущую карточку понятия; иначе — другим движкам (как раньше)
      if (!p.topic && !cur) return pass(text);
      // «а что ты советуешь» без темы и без «это/об этом» — личный совет, не карточка
      if (!p.topic && !p.pron) return pass(text);
      field = 'advice';
    }
    var tk = isTalk(field);
    if (!p.topic) {
      if (cur && (p.pron || !p.self || tk)) {
        if (field === 'cmp') return Promise.resolve(st.prev && st.prev.id !== cur.id ? compare(cur, st.prev, st, now) : fill(rot((P.raw.talk || {}).cmp_ask, 't:ca', st), vars(cur, st)));
        if (tk) return Promise.resolve(talk(cur, field, st, now));
        // «расскажи ещё о нём» — без нового поля → следующее по цепочке
        if (field === 'def' && st.told.def) return Promise.resolve(followUp('next', st, now));
        return Promise.resolve(answer(cur, field, p.mods, st, now).text);
      }
      return pass(text);
    }
    if (field === 'cmp') {
      if (p.topics.length === 1 && cur) {
        // «а сравни с гравитацией» — текущая тема + новая
        return look(p.topics[0]).then(function (c) {
          if (c && c.id !== cur.id) return compare(cur, c, st, now);
          return pass(text);
        });
      }
      if (p.topics.length !== 2) return pass(text);
      return Promise.all([look(p.topics[0]), look(p.topics[1])]).then(function (cs) {
        // «чай или кофе» — только если обе темы — точно найденные карточки понятий («правда или действие» — игра, не сравнение)
        if (p.choice && !(cs[0] && cs[1] && cs[0].kn && cs[1].kn && near(cs[0], p.topics[0]) && near(cs[1], p.topics[1]))) return pass(text);
        if (cs[0] && cs[1] && cs[0].id !== cs[1].id) return compare(cs[0], cs[1], st, now);
        return pass(text);
      });
    }
    return look(p.topic).then(function (card) {
      if (p.ellipsis) return card && card.kn ? answer(card, field, p.mods, st, now).text : pass(text);
      if (tk) return card && card.kn ? talk(card, field, st, now) : pass(text);
      if (card && !card.kn && (field === 'def' || field === 'short')) {
        // обычная запись KB (не карточка понятия) — пусть отвечает KB в своём формате (🧠 KB · …, «Похожие»); карточка — запасной вариант
        return pass(text).then(function (r) { return r != null || !p.canon ? r : pass(p.canon); })
          .then(function (r) { return r != null ? r : answer(card, field, p.mods, st, now).text; });
      }
      if (card && card.kn) {
        if (cur && cur.id === card.id && field === 'def' && st.told.def && !p.mods.long) return followUp('next', st, now);
        // составной вопрос: «что такое X и почему…» — ответы подряд, одно предложение продолжить в конце
        if (p.also && p.also.length) {
          var parts = [answer(card, field, p.mods, st, now, true).text];
          p.also.forEach(function (a) { if (a.field !== field) parts.push(answer(card, a.field, {}, st, now, true).text); });
          var out = tail(card, st, parts.join('\n\n'));
          st.last = out; return out;
        }
        return answer(card, field, p.mods, st, now).text;
      }
      return pass(text).then(function (r) {
        if (r != null || p.slip || !p.canon || norm(p.canon) === norm(text)) return r;
        return pass(p.canon);
      });
    });
  }

  // «китом» → «кит», «водой» → «вода», «солью» → «соль», «о гравитации» → «гравитация»: до 6 кандидатов начальной формы (последнее слово)
  var CASES = [['ями', 'я'], ['ами', ''], ['ами', 'а'], ['ьей', 'ья'], ['ой', 'а'], ['ей', 'я'], ['ей', 'ь'], ['ом', ''], ['ем', 'ь'], ['ем', 'е'], ['ью', 'ь'], ['ою', 'а'], ['ах', 'а'], ['ах', ''], ['ям', 'я'], ['ов', ''], ['е', 'а'], ['е', ''], ['у', 'а'], ['у', ''], ['ю', 'я'], ['ю', 'ь'],
    ['ии', 'ия'], ['ией', 'ия'], ['ию', 'ия'], ['ем', 'й'], ['ы', 'а'], ['и', 'а'], ['и', 'ь'], ['и', 'я'], ['а', ''], ['я', 'ь'], ['я', 'й'], ['ой', 'ый'], ['ой', 'ий'], ['ого', 'ый'], ['ому', 'ый'], ['ым', 'ый']];
  function caseVariants(t) {
    var w = norm(t).split(' '), last = w[w.length - 1] || '', out = [];
    if (last.length < 4) return out;
    for (var i = 0; i < CASES.length && out.length < 6; i++) {
      var e = CASES[i][0];
      if (ends(last, e) && last.length - e.length >= 2) {
        var v = w.slice(0, -1).concat([last.slice(0, last.length - e.length) + CASES[i][1]]).join(' ');
        if (out.indexOf(v) < 0 && v !== norm(t)) out.push(v);
      }
    }
    return out;
  }
  function near(card, t) { var a = stem(norm(card.title).split(' ')[0] || ''), b = stem(norm(t).split(' ')[0] || ''); return !!a && !!b && a.slice(0, 4) === b.slice(0, 4); }
  function emoText(text) { if (!P) return false; try { return emoGuard(toks(text)); } catch (e) { return false; } }
  // тема для запасных путей (журнал «нет в базе», карточки из Википедии, кнопки) — из фрейма, иначе вся фраза без паразитов
  function topicOf(text) {
    var p = null; try { p = parse(text, null, 0); } catch (e) {}
    if (p && p.kind === 'ask' && p.topic) return p.topic;
    if (p && p.kind === 'defer') return '';
    if (!P) return norm(text);
    var w = toks(text), used = [];
    markAll(w, used, P.fillers, 'f'); markAll(w, used, P.stop, 's');
    return w.filter(function (x, i) { return !used[i] && !P.self[x] && !P.pron[x]; }).join(' ');
  }
  function fallbackText(topic) {
    var R = (P && P.raw) || {}, t = String(topic || '').trim().slice(0, 80);
    var s = t ? fill(R.fallback || '🤷 Не знаю, этого нет в базе: «{topic}».', { topic: t }) : (R.fallback_notopic || '🤷 Не знаю, этого нет в базе.');
    // v14.14.0: коротко и честно + подсказка, где пополнить базу (Настройки → «🔄 Обновить базу офлайн-ответов»)
    if (R.fallback_hint) s += '\n' + R.fallback_hint;
    return s + '\n\n' + marker(t);
  }
  function marker(topic) { return '⟦EITIFB:' + encodeURIComponent(String(topic || '').slice(0, 80)) + '⟧'; }

  // ── Википедия (без ключа): только URL-ы и очистка ответа; сеть — у хоста и только по кнопке «🔄 Обновить базу» ──
  function wikiSearchUrl(q, lang) {
    return 'https://' + (lang === 'en' ? 'en' : 'ru') + '.wikipedia.org/w/api.php?action=query&list=search&srlimit=1&format=json&origin=*&srsearch=' + encodeURIComponent(String(q || '').slice(0, 120));
  }
  function wikiSummaryUrl(title, lang) {
    return 'https://' + (lang === 'en' ? 'en' : 'ru') + '.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(String(title || '').replace(/ /g, '_'));
  }
  function wikiPick(json) {
    var h = json && json.query && json.query.search && json.query.search[0];
    return h && typeof h.title === 'string' ? h.title : null;
  }
  function clean(s) {
    return String(s == null ? '' : s).replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001f\u007f\u2028\u2029\uE000-\uF8FF⟦⟧]/g, ' ')
      .replace(/[<>`*_\[\]|#~\\]/g, '').replace(/\s+/g, ' ').replace(/ ([,.;:!?)»])/g, '$1').trim();
  }
  function wikiClean(json, lang) {
    if (!json || typeof json !== 'object' || json.type === 'disambiguation') return null;
    var title = clean(json.title).slice(0, 120), ex = clean(json.extract);
    if (!title || ex.length < 20) return null;
    if (ex.length > 700) { var c = ex.slice(0, 700), d = c.lastIndexOf('. '); ex = (d > 200 ? c.slice(0, d + 1) : c + '…'); }
    var host = 'https://' + (lang === 'en' ? 'en' : 'ru') + '.wikipedia.org/wiki/';
    var u = json.content_urls && json.content_urls.desktop && json.content_urls.desktop.page;
    var url = (typeof u === 'string' && u.indexOf(host) === 0 && !/[\s<>"'`]/.test(u)) ? u : host + encodeURIComponent(title.replace(/ /g, '_'));
    return { title: title, text: ex, url: url, lang: lang === 'en' ? 'en' : 'ru' };
  }
  function wikiFormat(r) {
    // v14.14.0: локальная карточка, сохранённая кнопкой «🔄 Обновить базу офлайн-ответов» — дальше отвечает без сети
    var u = String(r.url || ''), d = u;
    try { d = decodeURI(u); } catch (e) { d = u; }
    if (/[\s<>"'`]/.test(d)) d = u;   // читаемая ссылка (кириллица), но без пробелов/кавычек
    return '🌐 **из Википедии · ' + r.title + '**' + (r.lang === 'en' ? ' (англ.)' : '') + '\n\n' + r.text + '\n\nИсточник: ' + d;
  }

  return { load: load, loaded: loaded, create: create, parse: parse, answer: answer, followUp: followUp, respond: respond, talk: talk, expand: expand, stats: stats, triggers: triggers,
    topicOf: topicOf, fallbackText: fallbackText, marker: marker, stem: stem, norm: norm, TTL: TTL, emoGuard: emoText, caseVariants: caseVariants, toks: toks,
    wikiSearchUrl: wikiSearchUrl, wikiSummaryUrl: wikiSummaryUrl, wikiPick: wikiPick, wikiClean: wikiClean, wikiFormat: wikiFormat };
});
