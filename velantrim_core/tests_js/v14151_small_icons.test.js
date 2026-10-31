'use strict';
// v14.15.1: «Меньше иконки (small icons)» — ключ eiti_small_icons, класс eiti-small-icons, мгновенное переключение.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { loadFunctions, INDEX_HTML } = require('./harness');

const SRC = fs.readFileSync(INDEX_HTML, 'utf8');

function makeEnv(initial) {
  const store = Object.assign({}, initial || {});
  const classes = (name) => {
    const set = new Set();
    return { set, toggle(c, on) { if (on) set.add(c); else set.delete(c); return on; }, contains: (c) => set.has(c), name };
  };
  const html = { classList: classes('html') };
  const body = { classList: classes('body') };
  const cb = { checked: false };
  const toasts = [];
  const env = loadFunctions(['eitiIsSmallIcons', 'eitiApplySmallIcons', 'eitiSetSmallIcons'], {
    localStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
    document: { documentElement: html, body, getElementById: (id) => (id === 'eiti-small-icons-toggle' ? cb : null) },
    showToast: (m) => toasts.push(m),
    window: {},
  });
  return { env, store, html, body, cb, toasts };
}

test('по умолчанию выкл (вид как раньше)', () => {
  const { env } = makeEnv();
  assert.equal(env.eitiIsSmallIcons(), false);
});

test('вкл → ключ "1", класс на <html> и <body>, галочка отмечена, тост', () => {
  const t = makeEnv();
  t.env.eitiSetSmallIcons(true);
  assert.equal(t.store.eiti_small_icons, '1');
  assert.equal(t.env.eitiIsSmallIcons(), true);
  assert.ok(t.html.classList.contains('eiti-small-icons'));
  assert.ok(t.body.classList.contains('eiti-small-icons'));
  assert.equal(t.cb.checked, true);
  assert.equal(t.toasts.length, 1);
});

test('выкл → ключ удалён, классы сняты', () => {
  const t = makeEnv({ eiti_small_icons: '1' });
  t.env.eitiApplySmallIcons(t.env.eitiIsSmallIcons());
  assert.ok(t.html.classList.contains('eiti-small-icons'));
  t.env.eitiSetSmallIcons(false);
  assert.equal('eiti_small_icons' in t.store, false);
  assert.equal(t.html.classList.contains('eiti-small-icons'), false);
  assert.equal(t.body.classList.contains('eiti-small-icons'), false);
  assert.equal(t.cb.checked, false);
});

test('ранний скрипт в <head> ставит класс до первой отрисовки', () => {
  const head = SRC.slice(0, SRC.indexOf('</head>'));
  assert.match(head, /localStorage\.getItem\('eiti_small_icons'\)==='1'\)document\.documentElement\.classList\.add\('eiti-small-icons'\)/);
});

test('CSS: компактные размеры только под html.eiti-small-icons; таб ≥36px; safe-area iOS', () => {
  assert.match(SRC, /html\.eiti-small-icons \{[^}]*--eiti-si-tabbar-h: 50px;[^}]*--eiti-si-tab-item-h: 38px;[^}]*--eiti-si-header-h: 44px;/);
  assert.match(SRC, /html\.eiti-small-icons\.is-ios \.tab-bar[^{]*\{[^}]*env\(safe-area-inset-bottom/);
  assert.match(SRC, /html\.eiti-small-icons\.is-ios \.app-header \{[^}]*env\(safe-area-inset-top/);
  // дефолтные размеры не тронуты
  assert.match(SRC, /\.tab-bar \{\n\s*height: 110px;/);
  assert.match(SRC, /\.app-header \{\n\s*height: 88px;/);
  const px = Number(SRC.match(/--eiti-si-tab-item-h: (\d+)px/)[1]);
  assert.ok(px >= 36);
});

test('галочка в «Настройке табов» + переводы EN/DE без кириллицы', () => {
  const i = SRC.indexOf('id="tabs-toggle-list"');
  const j = SRC.indexOf('id="eiti-small-icons-toggle"');
  assert.ok(i > 0 && j > i && j - i < 4000, 'checkbox рядом со списком табов');
  for (const lang of ['en', 'de']) {
    const m = SRC.match(new RegExp("addDict\\('" + lang + "', (\\{\"📌 Настройка табов\"[^\\n]*\\})\\); // v14\\.15\\.1"));
    assert.ok(m, 'dict ' + lang);
    const d = JSON.parse(m[1]);
    assert.equal(Object.keys(d).length, 5);
    assert.ok(d['Меньше иконки (small icons)'] && d['📌 Настройка табов'], 'ключи ' + lang);
    for (const v of Object.values(d)) assert.doesNotMatch(v, /[А-Яа-яЁё]/);
  }
});
