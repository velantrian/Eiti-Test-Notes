'use strict';
// v13.7.23: история правок заметки ↶↷ — группировка, лимит 50, сброс «повтора», шаг ИИ.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { loadFunctions, extractFunction, INDEX_HTML } = require('./harness');

const INDEX = fs.readFileSync(INDEX_HTML, 'utf8');

function core() {
  return loadFunctions(['eitiNoteUndoCreate', 'eitiNoteUndoSame', 'eitiNoteUndoPush', 'eitiNoteUndoCanUndo', 'eitiNoteUndoCanRedo', 'eitiNoteUndoStep'],
    { EITI_NOTE_UNDO_LIMIT: 50, EITI_NOTE_UNDO_GROUP_MS: 700 });
}
const S = (body, extra) => Object.assign({ title: 'T', body, tags: '', selStart: body.length, selEnd: body.length, scroll: 0 }, extra || {});

test('набор текста группируется по паузе < 700 мс; пауза — новый шаг', () => {
  const c = core();
  const h = c.eitiNoteUndoCreate(S(''));
  c.eitiNoteUndoPush(h, S('П'), 'type', 1000);
  c.eitiNoteUndoPush(h, S('Пр'), 'type', 1300);
  c.eitiNoteUndoPush(h, S('При'), 'type', 1900);
  assert.equal(h.stack.length, 2);
  c.eitiNoteUndoPush(h, S('Привет'), 'type', 3000); // пауза 1.1 c
  assert.equal(h.stack.length, 3);
  assert.equal(c.eitiNoteUndoStep(h, -1).body, 'При');
  assert.equal(c.eitiNoteUndoStep(h, -1).body, '');
  assert.equal(c.eitiNoteUndoCanUndo(h), false);
  assert.equal(c.eitiNoteUndoStep(h, -1), null);
  assert.equal(c.eitiNoteUndoStep(h, 1).body, 'При');
  assert.equal(c.eitiNoteUndoStep(h, 1).body, 'Привет');
  assert.equal(c.eitiNoteUndoCanRedo(h), false);
});

test('перевод строки, вставка, вырезание, формат, ИИ, заголовок/теги — отдельные шаги', () => {
  const c = core();
  const h = c.eitiNoteUndoCreate(S('a'));
  c.eitiNoteUndoPush(h, S('ab'), 'type', 10);
  c.eitiNoteUndoPush(h, S('ab\n'), 'type', 20);      // новая строка — граница
  c.eitiNoteUndoPush(h, S('ab\nc'), 'type', 30);
  c.eitiNoteUndoPush(h, S('ab\ncXYZ'), 'paste', 40);
  c.eitiNoteUndoPush(h, S('ab\ncXYZ!'), 'paste', 50);
  c.eitiNoteUndoPush(h, S('ab\nc'), 'cut', 60);
  c.eitiNoteUndoPush(h, S('**ab**\nc'), 'format', 70);
  c.eitiNoteUndoPush(h, S('ИИ'), 'ai', 80);
  c.eitiNoteUndoPush(h, S('ИИ', { title: 'Новый' }), 'title', 90);
  c.eitiNoteUndoPush(h, S('ИИ', { title: 'Новый', tags: 'x' }), 'tag', 100);
  assert.deepEqual([...h.stack].map((x) => x.body + '|' + x.title + '|' + x.tags), [
    'a|T|', 'ab|T|', 'ab\n|T|', 'ab\nc|T|', 'ab\ncXYZ|T|', 'ab\ncXYZ!|T|', 'ab\nc|T|', '**ab**\nc|T|', 'ИИ|T|', 'ИИ|Новый|', 'ИИ|Новый|x',
  ]);
});

test('лимит 50 шагов: старые снимки отбрасываются, отмена — ровно 50 раз', () => {
  const c = core();
  const h = c.eitiNoteUndoCreate(S(''));
  for (let i = 1; i <= 80; i++) c.eitiNoteUndoPush(h, S('v' + i), 'paste', i * 1000);
  assert.equal(h.stack.length, 51);
  assert.equal(h.index, 50);
  let n = 0;
  while (c.eitiNoteUndoStep(h, -1)) n++;
  assert.equal(n, 50);
  assert.equal(h.stack[h.index].body, 'v30');
});

test('новая правка после отмены очищает «повтор»; повтор одинакового снимка — не шаг', () => {
  const c = core();
  const h = c.eitiNoteUndoCreate(S('1'));
  c.eitiNoteUndoPush(h, S('12'), 'paste', 1);
  c.eitiNoteUndoPush(h, S('123'), 'paste', 2);
  c.eitiNoteUndoStep(h, -1);
  assert.equal(c.eitiNoteUndoCanRedo(h), true);
  c.eitiNoteUndoPush(h, S('12', { selStart: 0, selEnd: 0 }), 'type', 3); // тот же текст — только курсор
  assert.equal(c.eitiNoteUndoCanRedo(h), true);
  assert.equal(h.stack[h.index].selStart, 0);
  c.eitiNoteUndoPush(h, S('12x'), 'type', 4);
  assert.equal(c.eitiNoteUndoCanRedo(h), false);
  assert.deepEqual([...h.stack].map((x) => x.body), ['1', '12', '12x']);
  // после отмены набор не «приклеивается» к прежней группе
  c.eitiNoteUndoStep(h, -1);
  c.eitiNoteUndoPush(h, S('12y'), 'type', 5);
  assert.deepEqual([...h.stack].map((x) => x.body), ['1', '12', '12y']);
});

test('правка ИИ — шаг истории: «до» дописывается, если его нет; «после» отдельным шагом', () => {
  const store = {};
  const vals = { noteEditorTitle: { value: 'T' }, noteEditorBody: { value: 'до', selectionStart: 2, selectionEnd: 2, scrollTop: 0 }, noteEditorTags: { value: '' } };
  const sb = loadFunctions(['eitiNoteUndoCreate', 'eitiNoteUndoSame', 'eitiNoteUndoPush', 'eitiNoteUndoCanUndo', 'eitiNoteUndoCanRedo', 'eitiNoteUndoStep',
    'eitiNoteUndoSnapshot', 'eitiNoteUndoRecordAi'], {
    EITI_NOTE_UNDO_LIMIT: 50, EITI_NOTE_UNDO_GROUP_MS: 700,
    document: { getElementById: (id) => vals[id] || null },
    eitiNoteUndoSyncButtons: () => {},
    eitiNoteUndoHistory: () => store.h,
  });
  store.h = sb.eitiNoteUndoCreate(sb.eitiNoteUndoSnapshot());
  vals.noteEditorBody.value = 'до правки';           // ручной набор, ещё не записан
  store.h = sb.eitiNoteUndoPush(store.h, sb.eitiNoteUndoSnapshot(), 'type', 1);
  sb.eitiNoteUndoRecordAi('до правки', 'после ИИ');
  assert.deepEqual([...store.h.stack].map((x) => x.body), ['до', 'до правки', 'после ИИ']);
  assert.equal(store.h.lastKind, '');
  assert.equal(sb.eitiNoteUndoStep(store.h, -1).body, 'до правки');
  // «до» отличается от вершины (например, правка вне истории) — добавляется
  store.h = sb.eitiNoteUndoCreate({ title: 'T', body: 'X', tags: '' });
  sb.eitiNoteUndoRecordAi('Y', 'Z');
  assert.deepEqual([...store.h.stack].map((x) => x.body), ['X', 'Y', 'Z']);
});

test('интеграция: ИИ, вставка, формат, восстановление версии, клавиши, автосохранение', () => {
  assert.match(extractFunction('eitiNotesAiRememberUndo'), /eitiNoteUndoRecordAi\(before, after\)/);
  assert.match(extractFunction('eitiNotesPasteAsIs'), /_eitiNoteUndoNextKind = 'paste'/);
  assert.match(extractFunction('notesInsertFmt'), /eitiNoteUndoRecord\('format'\)/);
  assert.match(extractFunction('notesInsertFmt'), /notesAutoSaveSchedule\(\)/);
  assert.match(INDEX, /eitiNoteUndoRecord\('restore'\)/);
  const apply = extractFunction('eitiNoteUndoApply');
  assert.match(apply, /notesAutoSaveFlush\(\)/);
  assert.match(apply, /eitiNotesHlOnAiChange\(note\.aiBefore, note\.aiAfter\)/);
  const kd = extractFunction('eitiNoteUndoKeydown');
  assert.match(kd, /k === 'y' && !e\.shiftKey\) \|\| \(k === 'z' && e\.shiftKey\)/);
  assert.match(kd, /e\.preventDefault\(\)/);
});

test('разметка: ↶↷ в шапке перед 📋, нижний ряд убран, Аб в ⋯, теги без пустой полосы', () => {
  const head = INDEX.slice(INDEX.indexOf('<div class="note-editor-topbar-actions">'), INDEX.indexOf('id="noteMoreBtn"'));
  assert.ok(head.indexOf('id="noteUndoBtn"') < head.indexOf('id="noteRedoBtn"'));
  assert.ok(head.indexOf('id="noteRedoBtn"') < head.indexOf('id="noteCopyAllBtn"'));
  assert.match(head, /id="noteUndoBtn" title="Отменить" aria-label="Отменить" disabled><svg/);
  assert.match(head, /id="noteRedoBtn" title="Повторить" aria-label="Повторить" disabled><svg/);
  assert.equal(INDEX.includes('id="noteAiTools"'), false);
  assert.equal(INDEX.includes('id="noteAiUndoBtn"'), false);
  assert.match(INDEX, /id="noteHlToggle" class="note-hl-menu-item"[^>]*>.*Подсветка правок ИИ/);
  assert.match(INDEX, /\.note-editor-overlay\.active \.note-tags-row \{ padding-bottom: calc\(6px \+ env\(safe-area-inset-bottom, 0px\)\); \}/);
  assert.equal(INDEX.includes('.note-editor-overlay.active .note-tags-row { padding-bottom: 52px; }'), false);
  assert.match(INDEX, /\.note-editor-topbar \.note-editor-title:not\(:focus\) \{ text-overflow: ellipsis; \}/);
  assert.match(INDEX, /\.note-undo-btn:disabled \{ opacity: 0\.38;/);
});
