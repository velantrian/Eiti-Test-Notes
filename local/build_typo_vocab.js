#!/usr/bin/env node
// v14.6.0: builds local/eiti_typo_vocab.json — the vocabulary of every offline layer for EitiTypo.
// Sources: offline intents (core + intent packs), DE layer, EITI Local (notes/calculator), dialogue-state words,
// KB triggers (targets) and KB/offline answers (known words only — never correction targets).
// Format: { v, n, t: "word word*freq …" } — words are folded (ё→е, ü→ue, ä→ae, ö→oe, ß→ss); freq 0 = known only.
// Run: node local/build_typo_vocab.js
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const T = require('./eiti_typo.js');
const W = new Map(), CANON = new Map();
const tokens = (s) => String(s || '').toLowerCase().match(/[a-zа-яёäöüß]+(?:-[a-zа-яёäöüß]+)*/g) || [];
function add(s, w) {
  for (const raw of tokens(s)) {
    const k = T.fold(raw);
    if (k.length < 2 || k.length > 24) continue;
    W.set(k, (W.get(k) || 0) + w);
    if (raw.includes('-')) { const j = k.replace(/-/g, ''); if (!W.has(j) || W.get(j) === 0) W.set(j, 0); CANON.set(j, k); for (const p of k.split('-')) if (!W.has(p)) W.set(p, 0); }
  }
}
const J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
function intents(list) { for (const it of list) { for (const l in it.patterns || {}) (it.patterns[l] || []).forEach((p) => add(String(p).replace(/\{[^}]*\}/g, ' '), 3)); for (const l in it.replies || {}) (it.replies[l] || []).forEach((p) => add(p, 0)); } }
const core = J('offline/core.json');
intents(Object.values(core.intents));
for (const p of Object.values(core.intentPacks)) intents(J('offline/' + p.file).intents || []);
for (const f of fs.readdirSync(path.join(ROOT, 'offline/packs'))) if (!f.startsWith('ipack')) add(fs.readFileSync(path.join(ROOT, 'offline/packs', f), 'utf8'), 0);
// code layers: strings/regexes of the DE layer, EITI Local (calculator words, note commands), dialogue state, KB host
for (const f of ['offline/eiti_offline_de.js', 'local/eiti_local.js', 'local/eiti_dstate.js', 'offline/eiti_offline_dialogs.js']) add(fs.readFileSync(path.join(ROOT, f), 'utf8'), 3);
add(T.EXTRA_WORDS, 6);
for (const f of fs.readdirSync(path.join(ROOT, 'kb/idx'))) {
  const j = J('kb/idx/' + f);
  for (const e of j.e || []) { add(e[1], 1); add(e[2], 0); }
}
// General-language guard words (valid words that must never be "corrected" into a vocabulary word).
// local/typo_guard.txt is derived from the FrequencyWords top-50k lists (OpenSubtitles 2018, github.com/hermitdave/FrequencyWords);
// regenerate with: node local/build_typo_vocab.js --freq-dir DIR   (DIR contains ru.txt, en.txt, de.txt)
const GUARD = path.join(__dirname, 'typo_guard.txt');
const fdIdx = process.argv.indexOf('--freq-dir');
const guardWords = [];
if (fdIdx > 0) {
  for (const l of ['ru', 'en', 'de']) for (const line of fs.readFileSync(path.join(process.argv[fdIdx + 1], l + '.txt'), 'utf8').split('\n')) {
    const w = T.fold(line.split(' ')[0] || ''); if (/^[a-zа-я-]{4,24}$/.test(w)) guardWords.push(w);
  }
} else if (fs.existsSync(GUARD)) guardWords.push(...fs.readFileSync(GUARD, 'utf8').split(/\s+/).filter(Boolean));
for (const w of guardWords) if (!W.has(w)) W.set(w, 0);
// Prune known-only words that could never be "corrected" anyway (no target within the edit limit, no split):
// they only matter as a guard. Keeps the file small for phones.
const tmp = []; for (const [k, f] of W) tmp.push(f ? k + '*' + f : k);
T.load({ t: tmp.join(' ') });
const out = [];
let pruned = 0;
for (const [k, f] of W) {
  if (f >= 2) { out.push(k + '*' + f); continue; }
  if (k.length <= 3) { pruned++; continue; }
  const keep = T.wouldChange(k);
  if (keep) out.push(k); else pruned++;
}
console.log('pruned known-only', pruned);
if (fdIdx > 0) { const keep = new Set(out.map((x) => x.split('*')[0])); fs.writeFileSync(GUARD, [...new Set(guardWords)].filter((w) => keep.has(w) && !(W.get(w) >= 2)).sort().join('\n') + '\n'); }
const canon = [...CANON].map(([j, k]) => j + '=' + k).join(' ');
fs.writeFileSync(path.join(__dirname, 'eiti_typo_vocab.json'), JSON.stringify({ v: 1, n: out.length, t: out.join(' '), c: canon }));
console.log('words', out.length, 'targets', out.filter((x) => /\*([2-9]|\d\d)/.test(x)).length, 'bytes', fs.statSync(path.join(__dirname, 'eiti_typo_vocab.json')).size);
