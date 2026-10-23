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
   'the a an of what how why who when where which is are was were be in on at to and or for does do did can could ' +
   'tell me about please explain i you it its this that with from by as').split(' ').forEach(function (w) { STOP[w] = 1; });

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

  function create(index, opts) {
    var E = ((index && index.entries) || []).slice(), N = E.length;
    var inv = {}, df = {}, trig = [], full = [];
    function addRange(from, to) {
      for (var i = from; i < to; i++) {
        var e = E[i], seen = {}, ts = String(e.t || '').split('|'), tt = [], fw = words(e.t.replace(/\|/g, ' '));
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
      var q = tokens(query), uq = [], u = {}, qw = words(query);
      // «почему / как / зачем …» — вопрос-объяснение: справочные карточки (имена, города) уступают объясняющим статьям
      var why = /(^|\s)(почему|отчего|зачем|как|каким образом|why|how)(\s|$)/.test(norm(query)) ? 0.6 : 1;
      for (var i = 0; i < q.length; i++) if (!u[q[i]]) { u[q[i]] = 1; uq.push(q[i]); }
      if (!uq.length) return [];
      var tot = 0, acc = {}, wsum = {};
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
        var cov = wsum[di] / tot, ex = 0, gen = (E[di].w || 1) < 1;
        if (full[di]) for (var z = 0; z < qw.length; z++) if (full[di].indexOf('|' + qw[z] + '|') >= 0) ex++;
        res.push({ i: di, id: E[di].i, d: E[di].d, p: E[di].p || 0, cov: Math.round(cov * 1000) / 1000, prec: Math.round(best * 1000) / 1000, mt: bm, qn: uq.length,
                   score: acc[di] * (0.55 + 0.45 * best) * (E[di].w || 1) * (1 + 0.3 * (qw.length ? ex / qw.length : 0)) * (gen && !ex ? 0.55 : 1) * (gen ? why : 1), ex: ex, g: gen ? 1 : 0 });
      }
      res.sort(function (p1, p2) { return p2.score - p1.score; });
      return res.slice(0, k || 5);
    }
    // confident(hit) — достаточно ли уверен ответ для прямой выдачи офлайн
    function confident(h) {
      if (!h || h.cov < 0.6 || h.prec < 0.5) return false;
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
  return { create: create, createAsync: createAsync, shardRows: shardRows, addAsync: addAsync, tokens: tokens, norm: norm, version: 2 };
});
