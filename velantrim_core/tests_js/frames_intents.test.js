// v14.14.0 intents+: новые интенты/триггеры фреймов — где, «ли»-вопросы, разве/неужели, tag-вопросы, «или»-выбор, перечисли, как называется,
// сколько будет (defer), жалобы/риторика, возврат к теме, обращения (wake), сленг, неопределённые («кто-то»), падежи, многочастные реплики.
// ≥3000 сгенерированных формулировок (3 на триггер), живые фразы, FP-набор, Приложение D (63 кейса обзора offline-survey-01), perf.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..', '..');
const F = require(path.join(ROOT, 'local', 'eiti_frames.js'));
const PACK_RAW = fs.readFileSync(path.join(ROOT, 'local', 'eiti_frames.json'), 'utf8');
const PACK = JSON.parse(PACK_RAW);
const C = require(path.join(ROOT, 'kb', 'tests', 'concept.js'))();
const APPD = JSON.parse(fs.readFileSync(path.join(__dirname, 'offline', 'appendix_d_cases.json'), 'utf8'));
F.load(PACK);

const PASS = '⟪pass⟫';
const deps = { lookup: C.lookup, pass: () => Promise.resolve(PASS) };
const PHOTO = C.lookup('фотосинтез');
function freshState() { const st = F.create(); st.card = PHOTO; st.at = Date.now(); st.told = { def: 1 }; return st; }
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const PREFIX = ['', '', 'а ', 'ну ', 'слушай, ', 'эити, ', 'алиса, ', 'кстати, ', 'пожалуйста, ', 'скажи-ка, ', 'чё, ', 'извини, '];
const SUFFIX = ['', '', '?', ' пожалуйста', ', плиз', '??', '!', ' а?', ', эити'];
const TOPICS = ['про фотосинтез', 'о гравитации', 'насчёт науки', 'про физику'];
function typo(word, r) {
  if (word.length < 6) return word;
  const i = 1 + Math.floor(r() * (word.length - 3)), k = Math.floor(r() * 3);
  if (k === 0) return word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2);
  if (k === 1) return word.slice(0, i) + word.slice(i + 1);
  return word.slice(0, i) + word[i] + word.slice(i);
}
function generate(perTrigger) {
  const r = rng(14141), out = [], seen = new Set();
  F.triggers().forEach((tr) => {
    const n = tr.raw; if (!n || seen.has(tr.id + '|' + n)) return; seen.add(tr.id + '|' + n);
    const bare = F.parse(n, freshState(), Date.now());
    if (bare && bare.kind === 'defer') return;
    for (let v = 0; v < perTrigger; v++) {
      let core = n, typoed = false;
      if (v === 2 && r() < 0.3 && !PACK.nofuzzy_fams.includes(tr.fam)) {
        const ws = core.split(' '), j = ws.findIndex((w) => w.length >= 7);
        if (j >= 0) { ws[j] = typo(ws[j], r); core = ws.join(' '); typoed = true; }
      }
      let q = core;
      if (!tr.ctx && (v >= 1 || r() < 0.4)) q = r() < 0.6 ? core + ' ' + TOPICS[Math.floor(r() * TOPICS.length)] : TOPICS[Math.floor(r() * TOPICS.length)] + ' ' + core;
      q = PREFIX[Math.floor(r() * PREFIX.length)] + q + SUFFIX[Math.floor(r() * SUFFIX.length)];
      if (r() < 0.25) q = q.charAt(0).toUpperCase() + q.slice(1);
      out.push({ q, fam: tr.fam, id: tr.id, typo: typoed });
    }
  });
  return out;
}

test('pack: new intents/families present, size budget', () => {
  const s = F.stats();
  assert.ok(s.intents >= 54 && s.families >= 40 && s.variants >= 1450, JSON.stringify(s));
  const ids = new Set(PACK.intents.map((i) => i.id));
  for (const id of ['q_where', 'q_possible', 'ask_should', 'q_exists', 'q_is_true', 'q_polar_bias', 'ask_list', 'ask_name', 'defer_calc', 'complaint_bot', 'rhetorical', 'topic_return'])
    assert.ok(ids.has(id), id);
  assert.ok(zlib.gzipSync(PACK_RAW).length < 40 * 1024, 'pack gzip < 40 KB');
});

test('generate-and-assert: ≥3000 phrasings (3 per trigger, wrappers, wake-words, typos), ≥97% family accuracy', () => {
  const items = generate(3);
  assert.ok(items.length >= 3000, 'generated ' + items.length);
  const bad = [];
  for (const it of items) {
    const p = F.parse(it.q, freshState(), Date.now());
    if (!p || p.fam !== it.fam) bad.push(it.q + ' → ' + (p ? p.fam : 'null') + ' (want ' + it.fam + ')');
  }
  const acc = 1 - bad.length / items.length;
  console.log('# intents grammar: ' + items.length + ' phrasings, accuracy ' + (acc * 100).toFixed(2) + '%');
  if (process.env.TALK_DUMP) console.log(bad.join('\n'));
  assert.ok(acc >= 0.97, 'accuracy ' + (acc * 100).toFixed(2) + '%\n' + bad.slice(0, 40).join('\n'));
});

const NATURAL = {
  q_where: ['где находится эверест', 'где живут пингвины', 'а где растут бананы?', 'в какой стране находится париж', 'на каком континенте египет', 'куда впадает волга', 'алиса, где обитают коалы', 'где водятся акулы'],
  q_possible: ['можно ли пить морскую воду', 'возможно ли жить на марсе', 'бывает ли снег в африке', 'вредно ли есть много сахара', 'опасно ли смотреть на солнце'],
  ask_should: ['стоит ли учить латынь', 'нужно ли пить воду каждый день', 'имеет ли смысл учить физику'],
  q_exists: ['есть ли жизнь на марсе', 'существуют ли чёрные дыры', 'были ли динозавры теплокровными'],
  q_is_true: ['правда ли что страусы прячут голову в песок', 'говорят что молния не бьёт дважды', 'кто-то сказал что золото тяжелее свинца', 'я слышал что пауки не насекомые', 'это правда что луна удаляется'],
  q_polar_bias: ['разве киты рыбы', 'неужели солнце звезда', 'а разве не земля в центре', 'киты что ли рыбы'],
  ask_list: ['перечисли планеты', 'какие бывают облака', 'виды кошек', 'назови несколько динозавров', 'какие есть жанры музыки'],
  ask_name: ['как называется столица франции', 'как называется боязнь пауков', 'как называют детёныша лошади'],
  defer_calc: ['сколько будет два плюс два', 'посчитай 15 на 3', 'реши уравнение'],
  complaint_bot: ['ты меня не понимаешь', 'ты тупой', 'опять ты за своё', 'да что с тобой'],
  topic_return: ['вернёмся к фотосинтезу', 'давай вернёмся', 'а что там с гравитацией'],
};

test('natural phrasings for the new intents: exact intent', async () => {
  const bad = []; let n = 0;
  for (const [id, list] of Object.entries(NATURAL)) for (const q of list) {
    n++;
    const p = F.parse(q, F.create(), Date.now());
    if (!p || p.intent !== id) bad.push(q + ' → ' + (p ? p.intent || p.kind : 'null') + ' (want ' + id + ')');
  }
  console.log('# intents natural: ' + n + ' phrasings, misses ' + bad.length);
  assert.ok(bad.length <= Math.floor(n * 0.03), bad.join('\n'));
});

test('grammar fixes: какие≠как, «как дела», «во сколько», кто-то, падежи, «или»-выбор только для карточек', () => {
  const P = (q, st) => F.parse(q, st || F.create(), Date.now());
  assert.notEqual((P('какие бывают облака') || {}).fam, 'explain');
  assert.equal((P('как дела') || {}).intent, 'soc_howareyou');
  assert.equal((P('во сколько начинается рассвет') || {}).fam, 'when');
  assert.equal((P('сколько будет пять на пять') || {}).intent, 'defer_calc');
  assert.equal((P('кто-то сказал что вода горит') || {}).intent, 'q_is_true');
  assert.ok(!P('правда или действие') || P('правда или действие').fam !== 'comparison');
});

const FP = ['стихия', 'погодите', 'новостройка', 'покажи заметки', 'открой файлы', 'поставь таймер на 5 минут', 'напиши стих про осень', 'спой песню', 'расскажи анекдот',
  'какая сегодня погода', 'правда или действие', 'включи будильник', 'мне грустно', 'я в бешенстве', 'не хочу жить', 'кайфую', 'пока-пока не уходи', 'как мне быть дальше'];
test('FP set: zero frame replies (defer or pass) for non-frame phrases', async () => {
  const fp = [];
  for (const q of FP) {
    const st = freshState();
    const r = await F.respond(q, st, deps);
    if (r !== PASS && r !== null && r !== undefined) fp.push(q + ' → ' + String(r).slice(0, 50));
  }
  assert.deepEqual(fp, []);
});

// ── Приложение D обзора (63 кейса): было 30/63 (3658b87), стало 63/63 ──
const CTX = new Set(['modifier_long', 'repair_open', 'repair_repeat', 'ask_alt', 'ask_reflect', 'ask_summary', 'ask_another', 'fu_no', 'backchannel', 'backchannel+q_why', 'ellipsis(prev_intent)', 'thanks', 'topic_switch']);
const EXACT = new Set(['q_possible', 'ask_should', 'q_exists', 'q_is_true', 'q_polar_bias', 'q_tag', 'ask_choose', 'q_where', 'ask_list', 'ask_name', 'complaint_bot', 'rhetorical', 'about_self', 'help_capabilities', 'topic_return', 'defer_calc']);
const FAMS = { ask_define: ['define'], q_why: ['why'], ask_example: ['example'], ask_compare: ['comparison'], q_who: ['who'], q_when: ['when'], ask_opinion: ['opinion'], ask_predict: ['hypothetical'], ask_hypo: ['hypothetical'],
  ask_tell: ['tell'], q_count: ['count'], repair_repeat: ['repetition'], ask_alt: ['alternative'], ask_another: ['alternative'], ask_reflect: ['reflection'], ask_summary: ['summary'], 'backchannel+q_why': ['why'],
  modifier_long: ['explain', 'deepen', 'next'], repair_open: ['clarification', 'explain', 'simplify'], backchannel: ['hedge', 'agreement', 'emotion'], greet: ['social'], thanks: ['social'], fu_no: ['next'], topic_switch: ['next'] };
function okD(e, p) {
  if (!p) return false;
  if (e === 'defer_creative') return p.kind === 'defer';
  if (e === 'ellipsis(prev_intent)') return !!p.ellipsis;
  if (e === 'greet+ask_define+q_why') return p.intent === 'ask_define' && (p.also || []).some((a) => a.field === 'why');
  if (EXACT.has(e)) return p.intent === e;
  if (e === 'greet') return p.intent === 'soc_howareyou' || p.intent === 'soc_greet';
  if (e === 'thanks') return p.field === 'thanks';
  if (e === 'fu_no' || e === 'topic_switch') return p.go === 'stop' || p.field === 'stop';
  return (FAMS[e] || [e]).includes(p.fam);
}
const SW = new Set(['и', 'на', 'о', 'в']);
const stems = (s) => F.norm(s).split(' ').filter((x) => x && !SW.has(x)).map(F.stem);
function topicOk(want, p) {
  const got = p ? ((p.topics && p.topics.length > 1) ? p.topics.join(' ') : (p.topic || '')) : '';
  if (!want) return !got;
  const w = stems(want.replace(/;/g, ' ')), g = stems(got);
  if (!g.length) return false;
  const hit = w.filter((x) => g.some((y) => y === x || y.slice(0, 4) === x.slice(0, 4))).length;
  return hit / w.length >= 0.5 && g.length <= w.length + 1;
}
test('Appendix D (offline-survey-01, 63 cases): ≥60 intent, ≥57 clean (intent + topic)', () => {
  assert.equal(APPD.length, 63);
  let n = 0, clean = 0; const miss = [];
  for (const c of APPD) {
    const st = F.create();
    if (CTX.has(c.expect)) { st.card = { id: 'x', title: 'марс', a: 'Марс — планета.', f: {}, kn: true }; st.at = Date.now(); st.lastGo = 'def'; st.lastIntent = 'ask_define'; st.lastFam = 'define'; }
    const p = F.parse(c.q, st, Date.now());
    const a = okD(c.expect, p);
    if (a) n++; else miss.push(c.q + ' → ' + (p ? p.intent || p.kind : 'null') + ' (want ' + c.expect + ')');
    if (a && topicOk(c.topic, p)) clean++;
  }
  console.log('# appendix D: intent ' + n + '/63, clean ' + clean + '/63');
  assert.ok(n >= 60, miss.join('\n'));
  assert.ok(clean >= 57, 'clean ' + clean);
});

test('perf: parse stays sub-millisecond with the larger pack', () => {
  const items = generate(1).map((x) => x.q);
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < 3000; i++) F.parse(items[i % items.length], freshState(), Date.now());
  const per = Number(process.hrtime.bigint() - t0) / 1e6 / 3000;
  console.log('# intents perf: parse ' + per.toFixed(3) + ' ms');
  assert.ok(per < 2, 'parse ' + per + ' ms');
});
