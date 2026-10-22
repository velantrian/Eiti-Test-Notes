// Tales tests: schema, dedupe, flows, kids/bed filter, no-repeat, lazy loading, sizes, speed, samples.
const fs = require('fs'), path = require('path'), zlib = require('zlib'), D = __dirname;
const OD = path.join(__dirname, '..', '..', '..', 'offline'); const E = require(path.join(OD, 'eiti_offline_dialogs.js'));
const core = () => JSON.parse(fs.readFileSync(path.join(OD, 'core.json'), 'utf8'));
const loads = [];
const loader = n => { loads.push(n); const f = path.join(OD, 'packs', (fs.existsSync(path.join(OD, 'packs', n + '.json')) ? n : /^tales_/.test(n) ? n : fs.existsSync(path.join(OD, 'packs', 'ipack_' + n + '.json')) ? 'ipack_' + n : 'pack_' + n) + '.json'); return JSON.parse(fs.readFileSync(f, 'utf8')); };
function seeded(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const eng = (seed) => E.create(core(), { rng: seeded(seed || 7), loadPack: loader, inserts: false });
let pass = 0, fail = 0; const out = [];
function ok(c, m) { if (c) pass++; else { fail++; out.push('FAIL ' + m); } }
const C = core(), G = C.tales.groups;
// ── schema + dedupe ──
const TYPES = new Set(['сказка', 'миф', 'предание', 'былина', 'легенда', 'персонаж', 'сказание', 'притча', 'анекдот', 'факт', 'эпос']);
const ids = new Set(), titles = new Set(), all = [], cnt = {}, ty = {}, age = {};
for (const g in G) {
  const p = JSON.parse(fs.readFileSync(path.join(OD, G[g].file), 'utf8'));
  ok(p.pack === 'tales_' + g && p.tales.length === G[g].n, 'pack header ' + g);
  for (const x of p.tales) {
    all.push(x);
    ok(x.id && x.t && x.cu && x.g === g && TYPES.has(x.ty) && Array.isArray(x.tg) && ['kids', 'all', 'adult-soft'].includes(x.age), 'schema ' + x.id);
    const ns = (x.s.match(/[.!?…](\s|$)/g) || []).length; ok(ns >= 2 && ns <= 7, `short 2-7 sentences ${x.id} (${ns})`);
    ok(!x.p || x.p.length >= 2, 'parts>=2 ' + x.id);
    ok(!x.en || (x.en.t && x.en.s), 'en ' + x.id);
    ok(!ids.has(x.id), 'dup id ' + x.id); ids.add(x.id);
    const tk = x.cu.split('/')[0] + '|' + x.t.toLowerCase(); ok(!titles.has(tk), 'dup title ' + tk); titles.add(tk);
    ok(!/\b(TODO|lorem|xxx)\b/i.test(JSON.stringify(x)), 'placeholder ' + x.id);
    cnt[g] = (cnt[g] || 0) + 1; ty[x.ty] = (ty[x.ty] || 0) + 1; age[x.age] = (age[x.age] || 0) + 1;
  }
}
for (const w in C.tales.who) ok(ids.has(C.tales.who[w][1]), 'who→id ' + w);
// near-duplicate shorts (shared 8-gram)
const grams = {}; let near = 0;
for (const x of all) { const w = x.s.toLowerCase().split(/\s+/); const seen = new Set(); for (let i = 0; i + 8 <= w.length; i++) { const k = w.slice(i, i + 8).join(' '); if (seen.has(k)) continue; seen.add(k); if (grams[k] && grams[k] !== x.id) { near++; out.push('near-dupe ' + x.id + ' ~ ' + grams[k]); break; } grams[k] = x.id; } }
ok(near === 0, 'near duplicate shorts');
// ── flows ──
function flow(name, steps, seed) {
  const e = eng(seed); let prev;
  for (const [q, want, chk] of steps) {
    const r = e.reply(q);
    const good = r.intent === want && (!chk || chk(r, prev));
    ok(good, `${name}: "${q}" → ${r.intent} (want ${want}) | ${String(r.text).slice(0, 90).replace(/\n/g, ' ⏎ ')}`);
    prev = r;
  }
  return e;
}
const has = re => r => re.test(r.text);
flow('generic→дальше→end→moral', [['расскажи сказку', 'fn_tell_story', has(/«/)], ['дальше', 'tl_next'], ['чем закончилось', 'tl_end'], ['а мораль?', 'tl_moral', has(/Мораль|морали/)]]);
flow('russian long parts', [['расскажи длинную сказку', 'tl_long', has(/\(1\/\d\)/)], ['что было потом', 'tl_next', has(/\(2\/\d\)/)], ['чем закончилось', 'tl_end', has(/Чем закончилось/)]]);
flow('bylina', [['расскажи былину', 'tl_bylina', has(/былин|богатыр|Илья|Добрыня|Алёша|Садко|Вольга|Святогор|Микул/i)], ['ещё из этой же культуры', 'tl_same', has(/той же традиции/)]]);
flow('irish', [['расскажи ирландскую легенду', 'tl_ie', has(/ирланд/)], ['ещё', 'tl_more', has(/«/)]]);
flow('narts', [['расскажи про нартов', 'tl_narts', has(/[Нн]арт/)]]);
flow('grimm', [['сказку братьев гримм', 'tl_grimm', has(/Гримм/)]]);
flow('manas', [['расскажи про манаса', 'tl_kg', has(/киргиз/)]]);
flow('nasreddin', [['историю про ходжу насреддина', 'tl_nasreddin', has(/Насреддин/)]]);
flow('druids', [['расскажи о друидах', 'tl_druid', has(/[Дд]руид|Самайн|огам|омел|Стоунхендж|Моргануг|Патрик|гейс|бард/)]]);
flow('who koschei', [['кто такой кощей', 'tl_who', has(/Кощ/)], ['ещё из этой же культуры', 'tl_same']]);
flow('who banshee', [['кто такая банши', 'tl_who', has(/[Бб]анши/)]]);
flow('who merlin', [['кто такой мерлин', 'tl_who', has(/Мерлин/)]]);
flow('who loki EN', [['who is loki', 'tl_who', has(/Loki/)]]);
flow('who leprechaun EN', [['what is a leprechaun', 'tl_who', has(/leprechaun/i)]]);
flow('EN story', [['tell me a fairy tale', 'fn_tell_story', r => !/[а-яё]{4}/i.test(r.text.split('\n\n')[1])], ['how did it end', 'tl_end'], ['another', 'tl_more']]);
flow('scary', [['расскажи страшную сказку', 'tl_scary', has(/«/)]]);
flow('short', [['короткую сказку', 'tl_short', has(/«/)]]);
flow('moral none-or-some', [['мудрую сказку', 'tl_wise', has(/мораль/)], ['а мораль', 'tl_moral', has(/Мораль:/)]]);
// unrelated phrases must not hit tale follow-ups without context
{ const e = eng(); for (const q of ['дальше', 'а мораль', 'чем закончилось']) { const r = e.reply(q); ok(!/^tl_/.test(r.intent || ''), 'no ctx ' + q + ' → ' + r.intent); } }
// ── kids / bedtime filter ──
const byT = {}; all.forEach(x => byT[x.t] = x);
const head = r => (r.text.match(/«([^»]+)»/) || [])[1];
const DARK = /страшное|грусть|война|предательство|наказание|конец света/;
for (const [q, id] of [['сказку для детей', 'tl_kids'], ['сказку на ночь', 'tl_bed']]) {
  const e = eng(11); let r = e.reply(q), bad = 0, n = 0, seen = new Set(), rep = 0;
  for (let i = 0; i < 40; i++) {
    const x = byT[head(r)]; n++;
    if (!x || x.age === 'adult-soft' || DARK.test(x.tg.join(',')) || x.ty === 'факт') { bad++; out.push(`${q} unsafe: ${head(r)}`); }
    if (seen.has(x && x.id) && !/начинаю круг/.test(r.text)) rep++; seen.add(x && x.id);
    r = e.reply(id === 'tl_bed' ? 'ещё' : q);
  }
  ok(bad === 0, q + ' filter: ' + bad + ' unsafe'); ok(rep === 0, q + ' repeats: ' + rep);
  if (id === 'tl_bed') { ok(/🌙/.test(r.text) && e.state.bed, 'bed mode persists'); const r2 = e.reply('расскажи страшную сказку'); ok(!byT[head(r2)] || !DARK.test(byT[head(r2)].tg.join(',')), 'bed mode blocks scary'); }
}
// ── no repeats per session (generic) ──
{ const e = eng(5); const seen = new Set(); let rep = 0, r = e.reply('расскажи сказку');
  for (let i = 0; i < 120; i++) { const t = head(r); if (seen.has(t) && !/начинаю круг/.test(r.text)) rep++; seen.add(t); r = e.reply('ещё'); }
  ok(rep === 0, 'generic no-repeat over 120: ' + rep); }
// ── laziness ──
{ loads.length = 0; const e = eng(3); e.reply('привет'); ok(loads.filter(n => /^tales_/.test(n)).length === 0, 'no tale pack at start');
  e.reply('расскажи грузинскую сказку'); ok(loads.filter(n => /^tales_/.test(n)).join() === 'tales_caucasian', 'only caucasian loaded: ' + loads.join()); }
// ── sizes + speed ──
const sz = {}; let tot = 0, totgz = 0;
for (const g in G) { const b = fs.readFileSync(path.join(OD, G[g].file)); const z = zlib.gzipSync(b, { level: 9 }).length; sz[g] = `${(b.length / 1024).toFixed(1)} KB / gz ${(z / 1024).toFixed(1)} KB`; tot += b.length; totgz += z; }
const cb = fs.readFileSync(path.join(OD, 'core.json'));
{ let t0 = process.hrtime.bigint(); const e = eng(9); const tInit = Number(process.hrtime.bigint() - t0) / 1e6;
  const qs = ['расскажи сказку', 'дальше', 'чем закончилось', 'а мораль', 'ещё', 'кто такой леший', 'расскажи ирландскую легенду', 'ещё из этой же культуры', 'сказку на ночь', 'ещё'];
  t0 = process.hrtime.bigint(); for (let i = 0; i < 30; i++) for (const q of qs) e.reply(q); const per = Number(process.hrtime.bigint() - t0) / 1e6 / 300;
  t0 = process.hrtime.bigint(); for (const g in G) loader('tales_' + g); const tLoad = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log(`SPEED init ${tInit.toFixed(1)} ms, tale reply avg ${per.toFixed(2)} ms, parse all tale packs ${tLoad.toFixed(1)} ms`);
  ok(per < 25, 'speed'); }
console.log('COUNTS', JSON.stringify(cnt), 'total', all.length);
console.log('TYPES', JSON.stringify(ty)); console.log('AGES', JSON.stringify(age));
const cu = {}; all.forEach(x => { const k = x.cu.split('/')[0]; cu[k] = (cu[k] || 0) + 1; }); console.log('CULTURES', JSON.stringify(cu));
console.log('WITH PARTS', all.filter(x => x.p).length, 'WITH EN', all.filter(x => x.en).length, 'WITH MORAL', all.filter(x => x.m).length, 'WHO KEYS', Object.keys(C.tales.who).length);
console.log('SIZES', JSON.stringify(sz), `total ${(tot / 1024).toFixed(1)} KB / gz ${(totgz / 1024).toFixed(1)} KB; core ${(cb.length / 1024).toFixed(0)} KB / gz ${(zlib.gzipSync(cb, { level: 9 }).length / 1024).toFixed(0)} KB`);
out.forEach(l => console.log('  ' + l));
console.log(`TALE TESTS: ${pass}/${pass + fail} passed`);
process.exitCode = fail ? 1 : 0;
