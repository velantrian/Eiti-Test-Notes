'use strict';
// v14.15.2: «📱 Экран телефона» — пресеты выреза, ранний скрипт, подсказка по устройству, i18n.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const { loadFunctions, INDEX_HTML } = require('./harness');

const SRC = fs.readFileSync(INDEX_HTML, 'utf8');
const HEAD = SRC.slice(0, SRC.indexOf('</head>'));

function runHead(stored) {
  const a = HEAD.indexOf('window.EITI_PHONE_PRESETS=');
  const tail = "try{window.eitiPhoneScreenApply(localStorage.getItem('eiti_phone_screen'));}catch(e){}";
  const b = HEAD.indexOf(tail, a) + tail.length;
  assert.ok(a > 0 && b > a, 'early phone-screen script present');
  const cls = new Set(); const attrs = {}; const props = {};
  const root = {
    classList: { add: (c) => cls.add(c), remove: (c) => cls.delete(c), contains: (c) => cls.has(c) },
    setAttribute: (k, v) => { attrs[k] = String(v); }, removeAttribute: (k) => { delete attrs[k]; },
    style: { setProperty: (k, v) => { props[k] = v; }, removeProperty: (k) => { delete props[k]; } },
  };
  const ctx = { window: {}, document: { documentElement: root }, localStorage: { getItem: () => (stored === undefined ? null : stored) } };
  vm.runInNewContext(HEAD.slice(a, b), ctx);
  return { win: ctx.window, cls, attrs, props };
}

test('нет ключа → «Авто»: ни класса, ни переменных (как раньше)', () => {
  const r = runHead(undefined);
  assert.equal(r.cls.has('eiti-phone'), false);
  assert.deepEqual(r.props, {});
  assert.deepEqual(r.attrs, {});
});

test('мусорный ключ → тоже «Авто»', () => {
  const r = runHead('nokia-3310');
  assert.equal(r.cls.has('eiti-phone'), false);
  assert.equal(r.win.eitiPhoneScreenApply('nope'), 'auto');
});

test('пресеты: значения и применение до первой отрисовки', () => {
  const want = { 'iphone-notch': [47, 34, 47, 21], 'iphone-island': [59, 34, 59, 21], 'iphone-se': [20, 0, 0, 0], 'galaxy-s': [32, 16, 32, 16], 'galaxy-fold': [28, 16, 28, 16], xiaomi: [34, 16, 34, 16], pixel: [36, 20, 36, 20], none: [0, 0, 0, 0] };
  for (const [id, [t, b, s, bl]] of Object.entries(want)) {
    const r = runHead(id);
    assert.equal(r.cls.has('eiti-phone'), true, id);
    assert.equal(r.attrs['data-eiti-phone'], id);
    assert.deepEqual([r.props['--eiti-pt'], r.props['--eiti-pb'], r.props['--eiti-ps'], r.props['--eiti-pbl']], [t + 'px', b + 'px', s + 'px', bl + 'px'], id);
  }
});

test('переключение обратно на «Авто» снимает класс и переменные', () => {
  const r = runHead('iphone-island');
  assert.equal(r.win.eitiPhoneScreenApply('auto'), 'auto');
  assert.equal(r.cls.has('eiti-phone'), false);
  assert.deepEqual(r.props, {});
  assert.deepEqual(r.attrs, {});
});

test('подсказка по устройству: только предложение (iPhone по размеру экрана, Android по модели)', () => {
  const { eitiPhoneScreenGuess: g } = loadFunctions(['eitiPhoneScreenGuess'], {});
  const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)';
  assert.equal(g(IOS, 390, 844), 'iphone-notch');
  assert.equal(g(IOS, 844, 390), 'iphone-notch');
  assert.equal(g(IOS, 393, 852), 'iphone-island');
  assert.equal(g(IOS, 440, 956), 'iphone-island');
  assert.equal(g(IOS, 375, 667), 'iphone-se');
  assert.equal(g(IOS, 500, 500), null);
  assert.equal(g('Mozilla/5.0 (Linux; Android 14; SM-S921U)', 360, 780), 'galaxy-s');
  assert.equal(g('Mozilla/5.0 (Linux; Android 14; SM-F946B)', 373, 839), 'galaxy-fold');
  assert.equal(g('Mozilla/5.0 (Linux; Android 14; Pixel 7)', 412, 915), 'pixel');
  assert.equal(g('Mozilla/5.0 (Linux; Android 13; 23049PCD8G Build/TKQ1) Redmi', 393, 873), 'xiaomi');
  // урезанный UA Chrome («K») — модель берём из userAgentData
  assert.equal(g('Mozilla/5.0 (Linux; Android 10; K)', 412, 915), null);
  assert.equal(g('Mozilla/5.0 (Linux; Android 10; K)', 412, 915, 'Xiaomi 14'), 'xiaomi');
  assert.equal(g('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 1920, 1080), null);
});

test('CSS: всё под html.eiti-phone, max(env, пресет), альбомная — боковые', () => {
  const block = HEAD.slice(HEAD.indexOf('/* v14.15.2: «📱 Экран телефона»'));
  const flat = block.replace(/\s+/g, '');
  assert.ok(flat.includes('--eiti-top-inset:max(var(--eiti-env-top),var(--eiti-pt,0px))'));
  assert.ok(flat.includes('--eiti-bottom-inset:max(var(--eiti-env-bottom),var(--eiti-pb,0px))'));
  assert.ok(/@media\(orientation:landscape\)/.test(flat));
  assert.ok(flat.includes('html.eiti-phone.eiti-small-icons.app-header'));
});

test('i18n EN/DE для раздела без кириллицы', () => {
  for (const lang of ['en', 'de']) {
    const m = SRC.match(new RegExp("addDict\\('" + lang + "', (\\{\"📱 Экран телефона\"[^\\n]*\\})\\); // v14\\.15\\.2"));
    assert.ok(m, lang);
    const d = JSON.parse(m[1]);
    assert.ok(Object.keys(d).length >= 18);
    for (const [k, v] of Object.entries(d)) assert.ok(!/[а-яё]/i.test(v), lang + ': ' + k);
    assert.ok(d['Похоже, у вас {x} — применить?'].includes('{x}'));
  }
});

// Ревью #62 [P2]: ключи из прототипа Object не должны считаться пресетами
const PROTO_KEYS = ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'valueOf', 'isPrototypeOf'];

test('ранний скрипт: __proto__ / constructor / toString / hasOwnProperty в localStorage → «Авто»', () => {
  for (const k of PROTO_KEYS) {
    const r = runHead(k);
    assert.equal(r.cls.has('eiti-phone'), false, k);
    assert.deepEqual(r.props, {}, k);
    assert.deepEqual(r.attrs, {}, k);
    assert.equal(r.win.eitiPhoneScreenApply(k), 'auto', k);
  }
  assert.match(HEAD, /Object\.prototype\.hasOwnProperty\.call\(P,id\)/);
});

function psEnv(stored, extra) {
  const { win } = runHead(undefined);
  const store = { eiti_phone_screen: stored };
  return Object.assign({
    window: win,
    localStorage: { getItem: (k) => (store[k] === undefined ? null : store[k]), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
    store,
  }, extra || {});
}

test('eitiPhoneScreenGet: ключи прототипа → «Авто», настоящие пресеты — как есть', () => {
  for (const k of PROTO_KEYS) {
    const f = loadFunctions(['_eitiPsHas', 'eitiPhoneScreenGet'], psEnv(k));
    assert.equal(f.eitiPhoneScreenGet(), 'auto', k);
    assert.equal(f._eitiPsHas(k), false, k);
  }
  const f = loadFunctions(['_eitiPsHas', 'eitiPhoneScreenGet'], psEnv('pixel'));
  assert.equal(f.eitiPhoneScreenGet(), 'pixel');
  assert.doesNotMatch(SRC, /EITI_PHONE_PRESETS\[v\]|\(window\.EITI_PHONE_PRESETS \|\| \{\}\)\[id\]|!EITI_PHONE_PRESETS\[id\]/);
});

// Ревью #62 [P3]: поздний ответ getHighEntropyValues не показывает подсказку после ручного выбора
function hintEnv(stored) {
  let resolve; const p = new Promise((r) => { resolve = r; });
  const el = {}; const get = (id) => (el[id] = el[id] || { hidden: true, textContent: '', onclick: null });
  const env = psEnv(stored, {
    document: { getElementById: get },
    navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 10; K)', userAgentData: { getHighEntropyValues: () => p } },
    screen: { width: 412, height: 915 },
    _eitiPsHintGen: 0,
    _eitiPsL: (x) => x,
    EITI_PS_LABELS: { pixel: ['Google Pixel', ''] },
  });
  const f = loadFunctions(['_eitiPsHas', 'eitiPhoneScreenGet', 'eitiPhoneScreenGuess', '_eitiPsRenderHint'], env);
  return { f, env, box: () => get('eiti-ps-hint'), resolve };
}

test('подсказка: ответ модели после ручного выбора пресета не показывается', async () => {
  // 1) ручной выбор без перерисовки: пресет перечитывается в момент ответа
  let h = hintEnv(undefined);
  h.f._eitiPsRenderHint('auto');
  assert.equal(h.box().hidden, true);
  h.env.store.eiti_phone_screen = 'galaxy-s';
  h.resolve({ model: 'Pixel 8' });
  await new Promise((r) => setImmediate(r));
  assert.equal(h.box().hidden, true);
  // 2) ручной выбор с перерисовкой: старое поколение игнорируется
  h = hintEnv(undefined);
  h.f._eitiPsRenderHint('auto');
  h.env.store.eiti_phone_screen = 'none';
  h.f._eitiPsHintGen++; // eitiSetPhoneScreen
  h.resolve({ model: 'Pixel 8' });
  await new Promise((r) => setImmediate(r));
  assert.equal(h.box().hidden, true);
  // 3) контроль: в «Авто» без вмешательства подсказка появляется
  h = hintEnv(undefined);
  h.f._eitiPsRenderHint('auto');
  h.resolve({ model: 'Pixel 8' });
  await new Promise((r) => setImmediate(r));
  assert.equal(h.box().hidden, false);
  assert.match(h.env.document.getElementById('eiti-ps-hint-text').textContent, /Google Pixel/);
});

test('small icons × пресет: safe-area small icons берётся из отступов пресета', () => {
  assert.match(SRC, /html\.eiti-phone \{[^}]*--eiti-si-safe-top: var\(--eiti-top-inset\);[^}]*--eiti-si-safe-bottom: var\(--eiti-bottom-inset\);/);
});
