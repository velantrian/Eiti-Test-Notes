/* EITI KB Library v1 (v14.1.0) — lazy general-knowledge base.
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
   'просто вообще пожалуйста плиз так вот там тут его ее её их им нам вам себя свой своя к ко за при над под без через ' +
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
    var E = (index && index.entries) || [], N = E.length;
    var inv = {}, df = {}, trig = new Array(N);
    function addRange(from, to) {
      for (var i = from; i < to; i++) {
        var e = E[i], seen = {}, ts = String(e.t || '').split('|'), tt = [];
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
    function idf(t) { return Math.log(1 + (N - (df[t] || 0) + 0.5) / ((df[t] || 0) + 0.5)); }

    // search(query, k) → [{id, d, score, cov}] sorted; cov = доля IDF запроса, найденная в записи (0..1)
    function search(query, k) {
      var q = tokens(query), uq = [], u = {};
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
        var cov = wsum[di] / tot;
        res.push({ i: di, id: E[di].i, d: E[di].d, cov: Math.round(cov * 1000) / 1000, prec: Math.round(best * 1000) / 1000, mt: bm, qn: uq.length,
                   score: acc[di] * (0.55 + 0.45 * best) });
      }
      res.sort(function (p1, p2) { return p2.score - p1.score; });
      return res.slice(0, k || 5);
    }
    // confident(hit) — достаточно ли уверен ответ для прямой выдачи офлайн
    function confident(h) {
      if (!h || h.cov < 0.6 || h.prec < 0.5) return false;
      if (h.qn === 1) return h.prec === 1;          // одно слово — только точный короткий триггер
      return h.mt >= 2;                              // иначе минимум два слова триггера совпали
    }
    function domains() { return index.domains || {}; }
    return { search: search, confident: confident, domains: domains, size: N, tokens: tokens, _addRange: addRange };
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
  return { create: create, createAsync: createAsync, tokens: tokens, norm: norm, version: 1 };
});
