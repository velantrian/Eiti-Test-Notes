// v14.8.0: typo-set evaluation — behaviour of the offline layers (EITI Local → offline dialogs) for
// typo text without / with EitiTypo, compared with the behaviour for the clean text.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '..');
const T = require(path.join(ROOT, 'local', 'eiti_typo.js'));
const L = require(path.join(ROOT, 'local', 'eiti_local.js'));
const E = require(path.join(ROOT, 'offline', 'eiti_offline_dialogs.js'));
const DE = require(path.join(ROOT, 'offline', 'eiti_offline_de.js'));
const OD = path.join(ROOT, 'offline');
const J = (f) => JSON.parse(fs.readFileSync(path.join(OD, f), 'utf8'));
const core = J('core.json');
const NOW = Date.UTC(2026, 9, 23, 12);
const DATA = { notes: [{ id: 'n1', title: 'Кошка Муся', body: 'ветеринар в среду', created: NOW - 3600e3, tags: ['кошка'] }, { id: 'n2', title: 'План поездки', body: 'Тбилиси весной', created: NOW - 86400e3, tags: ['путешествия'] }], files: [] };
let packs = null;
function engine() {
  if (!packs) { packs = {}; for (const [n, p] of Object.entries(core.intentPacks)) packs[n] = J(p.file); }
  const eng = E.create(core, { rng: () => 0.42, inserts: false, loadPack: (n) => { if (packs[n]) return packs[n]; const g = /^tales_(.+)$/.exec(n); return J(g ? core.tales.groups[g[1]].file : (core.packs[n] || {}).file || 'packs/' + n + '.json'); } });
  if (eng.loadPacks) try { eng.loadPacks(Object.keys(packs)); } catch (e) {}
  return eng;
}
let ENG = null, SNAP = null;
function behaviour(text, lang) {
  const loc = L.reply(text, DATA, NOW, { lang });
  if (loc) return 'local:' + (loc.value != null ? loc.value : loc.intent);
  if (!ENG) { ENG = engine(); SNAP = JSON.stringify(ENG.state); }
  let inp = text;
  if (lang === 'de' && !/[а-яё]/i.test(inp)) inp = DE.toEn(inp) || inp;
  // stateless: a fresh context per question (contexts would make results order-dependent)
  const s0 = JSON.parse(SNAP), st = ENG.state; for (const k of Object.keys(st)) delete st[k]; Object.assign(st, s0);
  const r = ENG.reply(inp);
  return 'dlg:' + (r && r.intent ? r.intent : 'none');
}
function loadVocab() { if (!T.loaded()) T.load(fs.readFileSync(path.join(ROOT, 'local', 'eiti_typo_vocab.json'), 'utf8')); }
module.exports = function evalTypo(cases) {
  loadVocab();
  cases = cases || JSON.parse(fs.readFileSync(path.join(__dirname, 'typo_cases.json'), 'utf8'));
  let before = 0, after = 0, textOk = 0; const fails = [];
  for (const [typo, clean, lang] of cases) {
    const want = behaviour(clean, lang);
    const b = behaviour(typo, lang) === want;
    const fixed = T.correct(typo, lang).text;
    const a = behaviour(fixed, lang) === want;
    if (T.fold(fixed).replace(/[^a-zа-я0-9]+/g, ' ').trim() === T.fold(clean).replace(/[^a-zа-я0-9]+/g, ' ').trim()) textOk++;
    before += b; after += a;
    if (!a) fails.push({ typo, fixed, clean, want, got: behaviour(fixed, lang) });
  }
  return { n: cases.length, before: before / cases.length, after: after / cases.length, text: textOk / cases.length, fails };
};
module.exports.behaviour = behaviour;
module.exports.loadVocab = loadVocab;
