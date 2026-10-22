// Pool/packs tests: categories, levels, topics, meaning/author follow-ups, genre switch, no repeats, lazy packs, prefilter parity.
const fs = require('fs'), path = require('path'), D = __dirname;
const OD = path.join(__dirname, '..', '..', '..', 'offline'); const E = require(path.join(OD, 'eiti_offline_dialogs.js'));
const load = () => JSON.parse(fs.readFileSync(path.join(OD, 'core.json'), 'utf8'));
const pack = n => JSON.parse(fs.readFileSync(path.join(OD, 'packs', 'pack_' + n + '.json'), 'utf8'));
function seeded(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
let pass = 0, fail = 0; const out = [];
function ok(c, msg) { if (c) pass++; else { fail++; out.push('FAIL ' + msg); } }
const loader = n => fs.existsSync(path.join(OD, 'packs', n + '.json')) ? JSON.parse(fs.readFileSync(path.join(OD, 'packs', n + '.json'), 'utf8')) : fs.existsSync(path.join(OD, 'packs', 'ipack_' + n + '.json')) ? JSON.parse(fs.readFileSync(path.join(OD, 'packs', 'ipack_' + n + '.json'), 'utf8')) : pack(n);
function eng(o) { return E.create(load(), Object.assign({ rng: seeded(3), loadPack: loader, inserts: false }, o || {})); }
const SC = [
  ['programmers', [['расскажи анекдот про программистов', 'pj_programmers', r => /программ|код|баг|stack|юзер|ctrl|бэкап|дизайнер|массив|кофе|0, 1|релиз|логи|google|гугл|тестировщ|лампочк|сервер|девопс|фронт|бэкенд|api|прод/i.test(r.text)], ['ещё', 'pool_more']]],
  ['stirlitz', [['анекдот про штирлица', 'pj_stirlitz', r => /Штирлиц/.test(r.text)], ['еще', 'pool_more', r => /Штирлиц/.test(r.text)]]],
  ['twister harder', [['скороговорку', 'fn_tongue'], ['посложнее', 'pt_harder_ctx', r => /★★/.test(r.text)], ['еще сложнее', 'pt_harder_ctx', r => /★★★/.test(r.text)], ['попроще', 'pt_easier_ctx', r => /★★☆/.test(r.text)]]],
  ['twister direct', [['скороговорку посложнее', 'pt_harder', r => /★★/.test(r.text)]]],
  ['quote love + author', [['цитату про любовь', 'pq_love', r => /«/.test(r.text)], ['чья это цитата', 'pool_author', r => /Автор|атрибуц/.test(r.text)]]],
  ['quote success', [['цитату про успех', 'pq_success']]],
  ['proverb meaning', [['пословицу и что она значит', 'pw_meaning_ask', r => /Значение:/.test(r.text)]]],
  ['proverb → что это значит', [['пословицу', 'pool_proverb'], ['что это значит', 'pool_meaning', r => /Смысл|буквальн/.test(r.text)], ['кто автор', 'pool_author', r => /народн/.test(r.text)]]],
  ['proverb topic', [['пословицу про дружбу', 'pw_friendship', r => /Значение/.test(r.text)]]],
  ['joke unfunny → other kind', [['расскажи анекдот', 'pool_joke'], ['не смешно', 'f_joke_unfunny', r => /жанр|пластинку|другое/.test(r.text)], ['да', 'pool_more']]],
  ['joke other kind', [['анекдот про работу', 'pj_work'], ['другой вид', 'joke_other_kind']]],
  ['en programmers', [['tell me a programmer joke', 'pj_programmers']]],
  ['en twister harder', [['tongue twister', 'fn_tongue'], ['harder', 'pt_harder_ctx', r => /★★/.test(r.text)]]],
  ['en quote + who', [['quote about love', 'pq_love'], ['who said that', 'pool_author']]],
  ['en proverb meaning', [['proverb and its meaning', 'pw_meaning_ask', r => /Meaning:/.test(r.text)]]],
  ['riddle hint from pack', [['загадку', null], ['подсказка', 'riddle_hint', r => /Подсказка/.test(r.text)]]],
];
for (const [name, turns] of SC) {
  const e = eng();
  for (const [q, want, chk] of turns) {
    const r = e.reply(q);
    ok(!want || r.intent === want, `${name}: "${q}" → ${r.intent} (want ${want})`);
    if (chk) ok(chk(r), `${name}: "${q}" content check: ${String(r.text).slice(0, 120)}`);
  }
}
// no repeats within a session until pool exhausted
for (const [kind, q, n] of [['joke', 'расскажи анекдот', 300], ['quote', 'цитату', 300], ['wisdom', 'пословицу', 300], ['twister', 'скороговорку', 150]]) {
  const e = eng(), seen = new Set(); let dup = 0;
  e.reply(q);
  for (let i = 0; i < n; i++) { const r = e.reply('ещё'); const t = (e.state.lastItem && (e.state.lastItem.x.t || e.state.lastItem.x)) || ''; if (seen.has(t)) dup++; seen.add(t); }
  ok(dup === 0, `${kind}: ${dup} repeats in ${n} 'ещё'`);
}
// category stays within category on 'ещё'
{ const e = eng(); e.reply('анекдот про программистов'); let bad = 0; for (let i = 0; i < 15; i++) { e.reply('ещё'); if (e.state.lastItem.x.c !== 'programmers') bad++; } ok(bad === 0, 'programmers ещё drift ' + bad); }
// lazy packs: without loader → needPack flag + core fallback
{ const e = E.create(load(), { rng: seeded(1), inserts: false }); const r = e.reply('цитату'); ok(r.needPack === 'quotes' && /«/.test(r.text), 'needPack flag ' + r.needPack); e.addPack(pack('quotes')); const r2 = e.reply('цитату'); ok(!r2.needPack, 'after addPack no needPack'); }
// inserts are mood-aware: support inserts only from mood-tagged lines
{ const e = E.create(load(), { rng: seeded(5), loadPack: loader, insertRate: 1, insertGap: 1 }); let ins = 0;
  for (const q of ['мне грустно', 'всё плохо', 'мне так грустно', 'я устал', 'грустно мне', 'всё надоело']) { const r = e.reply(q); if (r.insert) ins++; }
  ok(ins >= 1, 'mood inserts ' + ins); }
// prefilter parity: same intent with and without prefilter on held-out phrases
{ const cases = JSON.parse(fs.readFileSync(path.join(D, 'heldout_cases.json'), 'utf8')).map(x => x[0]).concat(JSON.parse(fs.readFileSync(path.join(D, 'heldout_v2.json'), 'utf8')).map(x => x[1]));
  const d = load(); let diff = 0, n = 0;
  for (const q of cases) { const a = E.create(d, { rng: seeded(7) }).reply(q).intent, b = E.create(d, { rng: seeded(7), prefilter: false }).reply(q).intent; n++; if (a !== b) { diff++; if (diff < 6) out.push(`  prefilter diff: ${q} → ${a} vs ${b}`); } }
  out.push(`prefilter parity: ${n - diff}/${n} identical`); ok(diff <= Math.ceil(n * 0.005), 'prefilter parity diff ' + diff); }
// family-safety scan of joke packs
{ const bad = /(?:\bсмерт|\bубил|\bтруп|водк|пьян|\bсекс|whisk|\bdrunk|\bdeath|\bkill|негр|еврей|чукч)/i, J = pack('jokes').pools.joke; let hits = [];
  for (const L of ['ru', 'en']) for (const x of J[L]) if (bad.test(x.t)) hits.push(x.t); ok(hits.length === 0, 'unsafe joke words: ' + hits.slice(0, 5).join(' || ')); }
console.log(out.join('\n')); console.log(`POOL TESTS: ${pass}/${pass + fail} passed`);
process.exitCode = fail ? 1 : 0;
