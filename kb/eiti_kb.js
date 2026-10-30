/* EITI KB Library v2 (v14.1.0, sharded index) — lazy general-knowledge base.
 * index.json (triggers + short keys, ~all domains) is searched in memory;
 * full answers live in per-domain packs loaded on demand by the host.
 * UMD: window.EitiKBLib / module.exports. No deps, ES5. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EitiKBLib = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var STOP = {};
  ('что как где когда кто почему зачем какой какая какое какие каков сколько ли это такое такой такая тот эта этот ' +
   'чем чём про о об в во на и или а но для по от до из у с со же бы ты вы мне меня мой моя скажи расскажи объясни ' +
   'подскажи знаешь есть был была было были быть значит называется можно нужно надо ли то не ни уже еще ещё очень ' +
   'делать сделать делаешь просто вообще пожалуйста плиз так вот там тут его ее её их им нам вам себя свой своя к ко за при над под без через ' +
   // v14.14.0: глаголы-просьбы и «рамки» вопроса — не тема («поясни науку», «растолкуй по сути»): раньше снижали покрытие ниже 0.6
   'поясни поясните растолкуй растолкуйте разложи разложите разъясни разъясните объясните расскажите скажите опиши опишите поведай ' +
   'объяснить рассказать пояснить сути вкратце ' +
   'the a an of what how why who when where which is are was were be in on at to and or for does do did can could ' +
   'tell me about please explain i you it its this that with from by as').split(' ').forEach(function (w) { STOP[w] = 1; });

  // v14.10.0: аббревиатуры и бренды → полные названия, как они записаны в триггерах базы (запрос расширяется, не заменяется)
  var ALIAS = {
    'мгу': 'московский государственный университет', 'спбгу': 'санкт петербургский государственный университет',
    'мфти': 'московский физико технический институт', 'мгту': 'московский государственный технический университет',
    'мгимо': 'московский государственный институт международных отношений', 'вшэ': 'высшая школа экономики',
    'сша': 'соединенные штаты америки', 'ссср': 'советский союз', 'рф': 'россия', 'оон': 'организация объединенных наций',
    'нато': 'североатлантический альянс', 'мкс': 'международная космическая станция', 'днк': 'дезоксирибонуклеиновая кислота',
    'эппл': 'apple', 'эпл': 'apple', 'гугл': 'google', 'майкрософт': 'microsoft', 'амазон': 'amazon'
  };
  // v14.10.0: грубая «лемма» для бонуса точного слова — падежные окончания не мешают («Наполеона» = «Наполеон»)
  function lem(w) {
    if (!/[а-я]/.test(w) || w.length < 5) return w;
    return w.replace(/(ами|ями|ого|его|ому|ему|ой|ей|ом|ем|ам|ям|ах|ях|ов|ев|ую|юю|ая|яя|ые|ие|ый|ий|а|я|у|ю|е|ы|и|о)$/, '');
  }
  // транслитерация латиница ↔ кириллица (для имён: «napoleon» → «наполеон», «эпл» уже в ALIAS)
  var L2C = [['shch', 'щ'], ['sch', 'ш'], ['sh', 'ш'], ['ch', 'ч'], ['zh', 'ж'], ['kh', 'х'], ['ts', 'ц'], ['yu', 'ю'], ['ya', 'я'], ['yo', 'е'],
    ['ph', 'ф'], ['th', 'т'], ['a', 'а'], ['b', 'б'], ['c', 'к'], ['d', 'д'], ['e', 'е'], ['f', 'ф'], ['g', 'г'], ['h', 'х'], ['i', 'и'], ['j', 'дж'],
    ['k', 'к'], ['l', 'л'], ['m', 'м'], ['n', 'н'], ['o', 'о'], ['p', 'п'], ['q', 'к'], ['r', 'р'], ['s', 'с'], ['t', 'т'], ['u', 'у'], ['v', 'в'],
    ['w', 'в'], ['x', 'кс'], ['y', 'й'], ['z', 'з']];
  var C2L = { 'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
    'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y',
    'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya' };
  function translit(w) {
    if (/^[a-z]+$/.test(w)) { var o = '', i = 0; outer: while (i < w.length) { for (var k = 0; k < L2C.length; k++) if (w.substr(i, L2C[k][0].length) === L2C[k][0]) { o += L2C[k][1]; i += L2C[k][0].length; continue outer; } o += w[i++]; } return o; }
    if (/^[а-я]+$/.test(w)) { var r = ''; for (var j = 0; j < w.length; j++) r += C2L[w[j]] != null ? C2L[w[j]] : w[j]; return r; }
    return null;
  }
  function norm(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е')
      .replace(/[^a-zа-я0-9+#²³ ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function stem(w) {
    if (/^[0-9]/.test(w) || w.length <= 3) return w;
    return w.slice(0, Math.max(3, Math.min(5, w.length - 1)));
  }
  // words(s) — полные (нестеммированные) значимые слова: бонус за точное совпадение формы (Чайковский ≠ чайковые)
  function words(s) {
    var out = [], ws = norm(s).split(' ');
    for (var i = 0; i < ws.length; i++) if (ws[i] && !STOP[ws[i]] && ws[i].length > 3) out.push(ws[i]);
    return out;
  }
  function tokens(s) {
    var out = [], ws = norm(s).split(' ');
    for (var i = 0; i < ws.length; i++) {
      var w = ws[i];
      if (!w || STOP[w] || (w.length < 2 && !/[0-9]/.test(w))) continue;
      out.push(stem(w));
    }
    return out;
  }

  // v14.14.0: омонимы-названия (фильм «Гравитация», книга «Космос», «Весёлая наука») — без слова-подсказки
  // («фильм», «книга», «песня» …) такие статьи уступают понятиям и не выдаются как уверенный ответ
  var HOM = {
    films: ['фильм', 'кино', 'сериал', 'режисс', 'снял', 'экраниз', 'movie', 'film'],
    books: ['книг', 'роман', 'повест', 'написал', 'автор', 'произведен', 'поэм', 'book', 'novel'],
    games: ['игр', 'game'],
    music: ['песн', 'альбом', 'сингл', 'исполн', 'спел', 'композиц', 'song', 'album', 'track'],
    paintings: ['картин', 'полотн', 'художн', 'написал', 'painting'],
    stage: ['спектакл', 'опер', 'балет', 'пьес', 'мюзикл', 'театр', 'постанов', 'play']
  };
  function cue(d, nq) {
    var c = HOM[d]; if (!c) return true;
    var ws = nq.split(' ');
    for (var i = 0; i < ws.length; i++) for (var j = 0; j < c.length; j++) if (ws[i].indexOf(c[j]) === 0) return true;
    return false;
  }

  // v14.14.0: почти точное совпадение слова для карточек понятий: общий префикс ≥ 3 и не короче длинного слова минус 2
  function near(qw, fl) {
    var fw = fl.split('|'), n = 0;
    for (var i = 0; i < qw.length; i++) for (var j = 0; j < fw.length; j++) {
      var a = qw[i], b = fw[j], k = 0; if (!b) continue;
      while (k < a.length && k < b.length && a[k] === b[k]) k++;
      if (k >= 3 && k >= Math.max(a.length, b.length) - 2) { n++; break; }
    }
    return n;
  }
  function create(index, opts) {
    var E = ((index && index.entries) || []).slice(), N = E.length;
    var inv = {}, df = {}, trig = [], full = [];
    function addRange(from, to) {
      for (var i = from; i < to; i++) {
        var e = E[i], seen = {}, ts = String(e.t || '').split('|'), tt = [], fw = words(e.t.replace(/\|/g, ' ')).map(lem);
        full[i] = fw.length ? '|' + fw.join('|') + '|' : '';
        for (var j = 0; j < ts.length; j++) {
          var tk = tokens(ts[j]);
          tt.push(tk);
          for (var a = 0; a < tk.length; a++) seen[tk[a]] = 2;
        }
        var kk = tokens(e.k || '');
        for (var b = 0; b < kk.length; b++) if (!seen[kk[b]]) seen[kk[b]] = 1;
        trig[i] = tt;
        for (var t in seen) {
          (inv[t] || (inv[t] = [])).push(i, seen[t]);
          df[t] = (df[t] || 0) + 1;
        }
      }
    }
    if (!opts || !opts.deferBuild) addRange(0, N);
    // add(entries) — дописать записи (шард домена) в индекс; возвращает [from, to) для порционной индексации
    function add(list, defer) {
      var from = E.length;
      for (var i = 0; i < list.length; i++) E.push(list[i]);
      N = E.length; api.size = N;
      if (!defer) addRange(from, N);
      return [from, N];
    }
    function idf(t) { return Math.log(1 + (N - (df[t] || 0) + 0.5) / ((df[t] || 0) + 0.5)); }

    // search(query, k) → [{id, d, score, cov}] sorted; cov = доля IDF запроса, найденная в записи (0..1)
    function search(query, k) {
      // v14.10.0: расширение запроса — аббревиатуры (МГУ), бренды по-русски (Эппл), транслит для слов, которых нет в индексе
      var nq = norm(query), extra = [], drop = {};
      nq.split(' ').forEach(function (w) {
        if (ALIAS[w]) extra.push(ALIAS[w]);
        else if (w.length >= 4 && !STOP[w] && !inv[stem(w)]) { var tr = translit(w); if (tr && inv[stem(tr)]) { extra.push(tr); drop[w] = 1; } }
      });
      if (extra.length) query = nq.split(' ').filter(function (w) { return !ALIAS[w] && !drop[w]; }).join(' ') + ' ' + extra.join(' ');
      var q = tokens(query), uq = [], u = {}, qw = words(query).map(lem);
      // «почему / как / зачем …» — вопрос-объяснение: справочные карточки (имена, города) уступают объясняющим статьям
      var why = /(^|\s)(почему|отчего|зачем|как|каким образом|why|how)(\s|$)/.test(norm(query)) ? 0.6 : 1;
      for (var i = 0; i < q.length; i++) if (!u[q[i]]) { u[q[i]] = 1; uq.push(q[i]); }
      if (!uq.length) return [];
      var tot = 0, acc = {}, wsum = {}, nqh = norm(query);
      for (var a = 0; a < uq.length; a++) {
        var t = uq[a], w = idf(t); tot += w;
        var p = inv[t]; if (!p) continue;
        for (var j = 0; j < p.length; j += 2) {
          var d = p[j];
          acc[d] = (acc[d] || 0) + w * (p[j + 1] === 2 ? 1 : 0.6);
          wsum[d] = (wsum[d] || 0) + w;
        }
      }
      var res = [];
      for (var key in acc) {
        var di = +key, best = 0, bm = 0, tt = trig[di];
        // точность триггера: какая доля слов лучшего триггера есть в запросе
        for (var x = 0; x < tt.length; x++) {
          var tk = tt[x]; if (!tk.length) continue;
          var m = 0; for (var y = 0; y < tk.length; y++) if (u[tk[y]]) m++;
          var pr = m / tk.length; if (pr > best || (pr === best && m > bm)) { best = pr; bm = m; }
        }
        // v14.14.0: карточки понятий (kn_*) уступают рукописным статьям, особенно в длинных вопросах (покрытие < 0.6), и требуют совпадения
        // слова целиком («скороговорку» ≠ «скорость») — их явно выбирает EitiKBHost.concept
        var cov = wsum[di] / tot, ex = 0, gen = (E[di].w || 1) < 1, hom = !cue(E[di].d, nqh), kn = E[di].d.lastIndexOf('kn_', 0) === 0;
        if (full[di]) for (var z = 0; z < qw.length; z++) if (full[di].indexOf('|' + qw[z] + '|') >= 0) ex++;
        var nx = ex; if (kn && !ex && full[di]) nx = near(qw, full[di]);   // v14.14.0: «луне» ≈ «луна», но «скороговорку» ≠ «скорость»
        res.push({ i: di, id: E[di].i, d: E[di].d, p: E[di].p || 0, cov: Math.round(cov * 1000) / 1000, prec: Math.round(best * 1000) / 1000, mt: bm, qn: uq.length,
                   score: acc[di] * (0.55 + 0.45 * best) * (E[di].w || 1) * (1 + 0.3 * (qw.length ? ex / qw.length : 0)) * (gen && !ex ? 0.55 : 1) * (gen ? why : 1) * (hom ? 0.5 : 1) * (kn ? (cov < 0.6 ? 0.6 : 0.9) * (nx ? 1 : 0.55) : 1), ex: ex, g: gen ? 1 : 0, hom: hom ? 1 : 0, kn: kn ? 1 : 0, nx: nx });
      }
      res.sort(function (p1, p2) { return p2.score - p1.score; });
      return res.slice(0, k || 5);
    }
    // confident(hit) — достаточно ли уверен ответ для прямой выдачи офлайн
    function confident(h) {
      if (!h || h.cov < 0.6 || h.prec < 0.5) return false;
      if (h.kn) return false;                       // v14.14.0: карточки понятий отвечают только через EitiKBHost.concept (рамки фраз), не перехватывают обычный поиск
      if (h.hom) return false;                      // v14.14.0: название без подсказки («гравитация» ≠ фильм «Гравитация»)
      if (h.g && !h.ex) return false;               // справочные (сгенерированные) статьи — только при точном совпадении слова
      if (h.g && h.prec < 0.75) return false;       // v14.3.0: и почти весь триггер назван («доброе утро» ≠ «Доброе утро, Вьетнам»)
      if (h.qn === 1) return h.prec === 1;          // одно слово — только точный короткий триггер
      return h.mt >= 2;                              // иначе минимум два слова триггера совпали
    }
    function domains() { return index.domains || {}; }
    var api = { search: search, confident: confident, domains: domains, size: N, tokens: tokens, add: add, _addRange: addRange };
    return api;
  }
  // createAsync — строит индекс порциями (по умолчанию 120 записей), уступая поток между порциями:
  // на слабом iPhone нет одной длинной задачи.
  function createAsync(index, opts) {
    opts = opts || {};
    var eng = create(index, { deferBuild: true }), N = eng.size, step = opts.step || 120, i = 0;
    var tick = opts.yieldFn || function (fn) { setTimeout(fn, 0); };
    return new Promise(function (res) {
      (function next() {
        var to = Math.min(N, i + step); eng._addRange(i, to); i = to;
        if (i >= N) res(eng); else tick(next);
      })();
    });
  }
  // shardRows(domain, shard) → записи индекса из компактного шарда v2 {d, e: [[hash, triggers, keys, part]]} или v3 {d, g, px, pp, e: [[hash, triggers, keys]]}
  function shardRows(sh) {
    // сгенерированные (энциклопедические) шарды g=1 весят чуть меньше рукописных объясняющих статей
    // v3 (v14.3.0, компактный): px — таблица префиксов («кто такой »), «~N» = px[N] + первый триггер; часть пакета = позиция / pp
    var d = sh.d, e = sh.e || [], w = sh.g ? 0.8 : 1, out = new Array(e.length), px = sh.px, pp = sh.pp;
    for (var i = 0; i < e.length; i++) {
      var t = e[i][1];
      if (px && t.indexOf('~') >= 0) {
        var ts = t.split('|');
        for (var j = 1; j < ts.length; j++) { var m = /^~(\d+)$/.exec(ts[j]); if (m) ts[j] = px[+m[1]] + ts[0]; }
        t = ts.join('|');
      }
      out[i] = { i: 'kbl_' + d + '_' + e[i][0], d: d, t: t, k: e[i][2], p: e[i].length > 3 ? e[i][3] : (pp ? Math.floor(i / pp) : 0), w: w };
    }
    return out;
  }
  // addAsync(engine, rows, opts) — индексирует порциями по opts.step (120), уступая поток между порциями
  function addAsync(eng, rows, opts) {
    opts = opts || {};
    var r = eng.add(rows, true), i = r[0], N = r[1], step = opts.step || 120;
    var tick = opts.yieldFn || function (fn) { setTimeout(fn, 0); };
    return new Promise(function (res) {
      (function next() {
        var to = Math.min(N, i + step); eng._addRange(i, to); i = to;
        if (i >= N) res(eng); else tick(next);
      })();
    });
  }
  return { lem: lem, translit: translit, alias: ALIAS, create: create, createAsync: createAsync, shardRows: shardRows, addAsync: addAsync, tokens: tokens, norm: norm, cue: cue, version: 2 };
});
