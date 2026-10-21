'use strict';
// v13.7.21: светлый режим заметки (☀️), вставка «как есть», markdown-рендер.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { loadFunctions, extractFunction, INDEX_HTML } = require('./harness');

const INDEX = fs.readFileSync(INDEX_HTML, 'utf8');

function md() {
  return loadFunctions(['eitiRenderMarkdown']).eitiRenderMarkdown;
}

test('☀️: paper-light переменные заданы на .note-editor-overlay.note-light-mode', () => {
  const m = INDEX.match(/\.note-editor-overlay\.note-light-mode \{([^}]*)\}/);
  assert.ok(m, 'scoped light-mode block');
  for (const v of ['--primary-color', '--secondary-color', '--text-color', '--panel-bg', '--border-color', '--accent-color']) {
    assert.match(m[1], new RegExp(v + ':'));
  }
  assert.match(m[1], /--text-color:\s*#1c1a17/);
  // старые точечные перекраски убраны
  assert.equal(INDEX.includes('.note-editor-overlay.note-light-mode .notes-ai-quick button {'), false);
  assert.equal(INDEX.includes('.note-editor-overlay.note-light-mode #noteFmtToggle'), false);
  assert.equal(INDEX.includes('.note-editor-overlay.note-light-mode .note-editor-save-icon'), false);
  // подсветка правок ИИ тоже светлая
  assert.match(INDEX, /\.note-editor-overlay\.note-light-mode \.note-editor-hl \{|\.note-editor-overlay\.note-light-mode \.note-editor-hl,|\.note-editor-overlay\.note-light-mode \.note-editor-body,\n\.note-editor-overlay\.note-light-mode \.note-editor-hl/);
});

test('☀️: состояние в localStorage, без бесполезного inline-фона', () => {
  const src = INDEX.slice(INDEX.indexOf('window.eitiNoteToggleLight = function'), INDEX.indexOf('window.eitiNoteToggleLight = function') + 900);
  assert.match(src, /localStorage\.setItem\('eiti_notes_light_mode'/);
  assert.equal(src.includes("btn.style.background"), false);
  assert.match(INDEX, /localStorage\.getItem\('eiti_notes_light_mode'\) === '1'/);
});

test('эмодзи-тумблер: тёмные красный/зелёный в светлом режиме', () => {
  assert.match(INDEX, /note-light-mode \.notes-ai-quick button\.notes-ai-emoji-toggle,[\s\S]{0,320}color: #b91c1c/);
  assert.match(INDEX, /emoji-toggle\.is-enabled \{\s*border-color: #16a34a;[^}]*color: #15803d/);
});

test('заметка сохраняется без trim тела; пустота — через trim()', () => {
  const fn = extractFunction('notesPersistEditor');
  assert.match(fn, /var body = String\(bodyEl\.value \|\| ''\);/);
  assert.equal(/bodyEl\.value \|\| ''\)\.trim\(\)/.test(fn), false);
  assert.match(fn, /\(_existing\.body \|\| ''\) === body/); // сравнение «сырых» значений — без лишних сохранений
  const ai = extractFunction('eitiNotesAIPersistCurrentNote');
  assert.equal(/bodyEl\.value \|\| ''\)\.trim\(\)/.test(ai), false);
  // 📋 копирует тело без обрезки
  assert.match(INDEX, /var b=\(document\.getElementById\('noteEditorBody'\)\.value\|\|''\);/);
});

test('превью карточки: white-space pre-line и срез без разрыва эмодзи', () => {
  const rule = INDEX.match(/\.note-card-preview \{([^}]*)\}/);
  assert.ok(rule);
  assert.match(rule[1], /white-space:\s*pre-line/);
  const { eitiNotesPreviewSlice } = loadFunctions(['eitiNotesPreviewSlice']);
  const s = 'a'.repeat(119) + '😀конец';
  const out = eitiNotesPreviewSlice(s, 0, 120);
  assert.equal(out, 'a'.repeat(119) + '😀');
  assert.equal(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(out), false);
  // по UTF-16 индексам (поиск): граница внутри пары расширяется
  const u = eitiNotesPreviewSlice('x😀y', 2, 4, true);
  assert.equal(u, '😀y');
  const v = eitiNotesPreviewSlice('x😀y', 0, 2, true);
  assert.equal(v, 'x😀');
});

function fakeTextarea(value, s0, s1) {
  const el = {
    id: 'noteEditorBody', value, selectionStart: s0, selectionEnd: s1, events: [],
    setRangeText(text, a, b) { this.value = this.value.slice(0, a) + text + this.value.slice(b); this.selectionStart = this.selectionEnd = a + text.length; },
    dispatchEvent(e) { this.events.push(e.type); return true; },
  };
  return el;
}

test('вставка «как есть»: text/plain вставляется точно (NBSP, \\r\\n, ZWJ, markdown)', () => {
  const sb = loadFunctions(['eitiNotesInsertExact', 'eitiNotesPasteAsIs'], {
    Event: class { constructor(t) { this.type = t; } },
    window: {},
  });
  const sample = '# H\r\n**b** `c` <i>&amp;\u00a0nb\u200bzw 👨‍👩‍👧\t\n  ';
  const el = fakeTextarea('AB', 1, 1);
  let prevented = false;
  const ok = sb.eitiNotesPasteAsIs({
    target: el,
    clipboardData: { getData: (t) => (t === 'text/plain' ? sample : '') },
    preventDefault() { prevented = true; },
  });
  assert.equal(ok, true);
  assert.equal(prevented, true);
  assert.equal(el.value, 'A' + sample + 'B');
  assert.deepEqual(el.events, ['input']);
  // пустой буфер → обычная вставка браузера
  const el2 = fakeTextarea('x', 1, 1);
  let prevented2 = false;
  assert.equal(sb.eitiNotesPasteAsIs({ target: el2, clipboardData: { getData: () => '' }, preventDefault() { prevented2 = true; } }), false);
  assert.equal(prevented2, false);
  assert.equal(el2.value, 'x');
  // другой элемент — не трогаем
  assert.equal(sb.eitiNotesPasteAsIs({ target: { id: 'input' }, clipboardData: { getData: () => 'z' }, preventDefault() {} }), false);
  assert.match(INDEX, /bodyEl\.addEventListener\('paste', eitiNotesPasteAsIs\)/);
});

test('Ask AI: многострочное поле (textarea), Enter — отправка, Shift+Enter — новая строка', () => {
  assert.match(INDEX, /<textarea id="notesAiInput" rows="1"/);
  assert.equal(INDEX.includes('<input id="notesAiInput"'), false);
  assert.match(INDEX, /e\.key === 'Enter' && !e\.shiftKey && !e\.isComposing/);
  const rule = INDEX.match(/\.notes-ai-msg\.user \{([^}]*)\}/);
  assert.match(rule[1], /white-space:\s*pre-wrap/);
  const { eitiNotesAIInputAutoGrow } = loadFunctions(['eitiNotesAIInputAutoGrow']);
  const el = { value: 'a\nb\nc', scrollHeight: 300, style: {} };
  eitiNotesAIInputAutoGrow(el);
  assert.equal(el.style.height, '140px');
  el.value = '';
  eitiNotesAIInputAutoGrow(el);
  assert.equal(el.style.height, '');
});

test('markdown: «2 * 3» и a*b не теряют звёздочку', () => {
  const r = md();
  const out = r('Итого 2 * 3 = 6 и a*b');
  assert.match(out, /2 \* 3 = 6/);
  assert.match(out, /a\*b/);
  assert.equal(r('*курсив*'), '<i>курсив</i>');
  assert.equal(r('**жирный**'), '<b>жирный</b>');
});

test('markdown: код (блок и инлайн) не изменяется', () => {
  const r = md();
  const out = r('```py\nx = a * b  # **не жирный** _y_\nfor i in range(3):\n    print(i)\n```');
  assert.match(out, /<pre[^>]*><code>x = a \* b  # \*\*не жирный\*\* _y_\nfor i in range\(3\):\n    print\(i\)<\/code><\/pre>/);
  assert.equal(out.includes('<b>'), false);
  const inl = r('см. `a * b **c**` тут');
  assert.match(inl, /<code[^>]*>a \* b \*\*c\*\*<\/code>/);
  assert.match(r('`<script>`'), /&lt;script&gt;/);
});

test('markdown: ####, цитаты, списки задач, нейтральные цвета', () => {
  const r = md();
  assert.match(r('#### Четвёртый'), /<div style="font-weight:700;[^"]*font-size:14px;">Четвёртый<\/div>/);
  assert.match(r('## Второй'), /font-size:15px;">Второй</);
  assert.match(r('> цитата'), /<div style="border-left:3px solid [^"]*">цитата<\/div>/);
  assert.match(r('- [ ] задача'), /☐ задача/);
  assert.match(r('- [x] готово'), /☑ готово/);
  assert.match(r('- пункт'), /· пункт/);
  const all = r('```\nc\n```\n`i`\n| a | b |\n|---|---|\n| 1 | 2 |\n---');
  assert.equal(all.includes('rgba(255,255,255'), false);
  assert.match(all, /rgba\(127,127,127,0\.15\)/);
  // HTML по-прежнему экранируется
  assert.match(r('<img src=x onerror=1>'), /^&lt;img src=x onerror=1&gt;$/);
});
