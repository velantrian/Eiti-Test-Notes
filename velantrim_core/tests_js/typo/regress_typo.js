// Regression: typo correction must not change behaviour on clean held-out text.
const fs = require('fs'), path = require('path');
const e = require('./eval_typo.js'); e.loadVocab();
const T = require('../../../local/eiti_typo.js');
module.exports = function () {
  const off = path.join(__dirname, '..', 'offline'), items = [];
  JSON.parse(fs.readFileSync(path.join(off, 'heldout_cases.json'))).forEach((c) => items.push(c[0]));
  JSON.parse(fs.readFileSync(path.join(off, 'heldout_v2.json'))).forEach((c) => items.push(c[1]));
  JSON.parse(fs.readFileSync(path.join(off, 'heldout_v3.json'))).forEach((c) => items.push(c[1]));
  const w = path.join(__dirname, '..', '..', '..', 'kb', 'tests', 'heldout_wide.txt');
  if (fs.existsSync(w)) fs.readFileSync(w, 'utf8').split('\n').forEach((l) => { l = l.split('\t')[0].trim(); if (l && l[0] !== '#') items.push(l); });
  let changed = 0, broke = [];
  for (const q of items) {
    const lang = /[а-яё]/i.test(q) ? 'ru' : (/[äöüß]|\b(ich|du|ist|und|wie|was)\b/i.test(q) ? 'de' : 'en');
    const r = T.correct(q, lang); if (r.text === q) continue;
    changed++;
    const a = e.behaviour(q, lang), b = e.behaviour(r.text, lang);
    if (a !== b && a !== 'dlg:none') broke.push({ q, fixed: r.text, a, b });
  }
  return { n: items.length, changed, broke };
};
if (require.main === module) { const r = module.exports(); console.log(r.n, 'changed', r.changed, 'broke', r.broke.length); r.broke.forEach((x) => console.log(x.q, '→', x.fixed, x.a, x.b)); }
