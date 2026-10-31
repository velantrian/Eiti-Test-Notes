// v14.14.0: node mirror of EitiKBHost.concept(topic) — for tests/tools (frames dialogs, card checks)
var fs = require('fs'), path = require('path'), K = require('../eiti_kb.js'), load = require('./load_all.js');
module.exports = function () {
  var dir = path.join(__dirname, '..'), all = load(), eng = K.create(all.index), PK = {};
  function pack(d, p) {
    var k = d + '#' + (p || 0); if (PK[k]) return PK[k];
    return (PK[k] = JSON.parse(fs.readFileSync(path.join(dir, all.manifest.domains[d].packs[p || 0]), 'utf8')));
  }
  function title(q, d) {
    if (/^kn_/.test(d)) return String(q[0]);
    var b = null; q.forEach(function (t) { if (!/(^|\s)(что|кто|как|какой|какая|почему|зачем|сколько|где|когда|формула|это)(\s|$)|[a-z]/i.test(t) && (!b || t.length < b.length)) b = t; });
    return String(b || q[0]);
  }
  function concept(topic) {
    var q = String(topic || '').trim(); if (!q || q.length > 80) return null;
    var h = eng.search(q, 6), pick = null, top = h[0];
    for (var i = 0; i < h.length; i++) { var x = h[i]; if (/^kn_/.test(x.d) && x.nx > 0 && x.cov >= 0.6 && x.prec >= 0.75 && !x.hom && x.score >= top.score * 0.6) { pick = x; break; } }
    if (!pick && eng.confident(top)) pick = top;
    if (!pick) return null;
    var e = pack(pick.d, pick.p).entries[pick.id]; if (!e) return null;
    var kn = /^kn_/.test(pick.d) || !!e.f;
    return { id: pick.id, domain: pick.d, title: kn ? title(e.q, pick.d) : (all.manifest.domains[pick.d].title || pick.d), q: e.q, a: e.a, f: e.f || null, kn: kn };
  }
  return { concept: concept, lookup: function (t) { return Promise.resolve(concept(t)); }, engine: eng, all: all };
};
