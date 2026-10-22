// node kb/tests/eval_kb.js — retrieval accuracy on held-out paraphrases
var fs = require('fs'), path = require('path');
var K = require('../eiti_kb.js'), idx = JSON.parse(fs.readFileSync(path.join(__dirname, '../index.json'), 'utf8'));
function run() {
  var eng = K.create(idx), byTrig = {};
  idx.entries.forEach(function (e) { e.t.split('|').forEach(function (t) { byTrig[K.norm(t)] = e.i; }); });
  var lines = fs.readFileSync(path.join(__dirname, 'heldout.txt'), 'utf8').split('\n').filter(Boolean);
  var top1 = 0, top3 = 0, conf = 0, confWrong = 0, miss = [];
  lines.forEach(function (l) {
    var p = l.split('=>'), q = p[0].trim(), want = byTrig[K.norm(p[1])];
    if (!want) throw new Error('unknown expected trigger: ' + p[1]);
    var r = eng.search(q, 3);
    if (r[0] && r[0].id === want) top1++; else miss.push(q + ' → ' + (r[0] ? r[0].id : '-') + ' (want ' + want + ')');
    if (r.some(function (h) { return h.id === want; })) top3++;
    if (eng.confident(r[0])) { conf++; if (r[0].id !== want) confWrong++; }
  });
  return { n: lines.length, top1: top1 / lines.length, top3: top3 / lines.length, confident: conf / lines.length,
           confPrecision: conf ? (conf - confWrong) / conf : 1, miss: miss };
}
module.exports = run;
if (require.main === module) { var r = run(); console.log(JSON.stringify(r, null, 1)); }
