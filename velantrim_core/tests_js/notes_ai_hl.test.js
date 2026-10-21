'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { loadFunctions, INDEX_HTML } = require('./harness');

const INDEX = fs.readFileSync(INDEX_HTML, 'utf8');

function loadDiff() {
  return loadFunctions([
    'eitiNotesDiffNow',
    'eitiNotesDiffEscape',
    'eitiNotesDiffTokenize',
    'eitiNotesDiffCoalesce',
    'eitiNotesDiffLcsDp',
    'eitiNotesDiffLcs',
    'eitiNotesDiffWords',
    'eitiNotesDiffToHtml',
  ]);
}

function loadUndo() {
  return loadFunctions([
    'eitiNotesAiUndoRecord',
    'eitiNotesAiUndoCanUndo',
    'eitiNotesAiUndoCanRedo',
    'eitiNotesAiUndoNeedsConfirm',
    'eitiNotesAiMarkManualEdit',
    'eitiNotesAiApplyUndo',
    'eitiNotesAiApplyRedo',
  ]);
}

function loadExport() {
  return loadFunctions([
    'eitiNotesSanitizeFilename',
    'eitiNotesExportContent',
  ]);
}

test('подсветка Ask AI: ключи UI и хранилища есть в монолите', () => {
  assert.match(INDEX, /id="noteHlToggle"/);
  assert.match(INDEX, /aria-label="Подсветка правок ИИ"/);
  assert.match(INDEX, /note-hl-glyph/);
  assert.match(INDEX, />Аб</);
  assert.match(INDEX, /id="noteAiTools"/);
  assert.match(INDEX, /id="noteMoreBtn"/);
  assert.match(INDEX, /id="noteAiUndoBtn"/);
  assert.match(INDEX, /id="noteAiRedoBtn"/);
  assert.match(INDEX, /id="noteSaveAsBtn"/);
  assert.match(INDEX, /id="noteShareBtn"/);
  assert.match(INDEX, /id="noteExportMenu"/);
  assert.match(INDEX, /id="noteEditorHl"/);
  assert.match(INDEX, /id="noteEditorToolbar"/);
  assert.match(INDEX, /id="noteFmtToggle"/);
  assert.match(INDEX, /aria-label="Формат и цвет"/);
  assert.match(INDEX, /Шрифт и цвет/);
  assert.match(INDEX, /id="noteFmtPopover"/);
  assert.match(INDEX, /id="noteCopyAllBtn"/);
  assert.match(INDEX, /function eitiNotesSyncKeyboardChrome\(/);
  assert.match(INDEX, /eiti_notes_ai_highlight/);
  assert.match(INDEX, /eiti_notes_hl_add_color/);
  assert.match(INDEX, /eiti_notes_hl_del_color/);
  assert.match(INDEX, /function eitiNotesDiffWords\(/);
  assert.match(INDEX, /Сохранить как файл/);
  assert.match(INDEX, /📤 Отправить/);
  assert.match(INDEX, /title="Отправить"/);
  assert.match(INDEX, /Удалить заметку/);
  assert.match(INDEX, /note-more-danger/);
  assert.equal(INDEX.includes('id="noteEditorSave"'), false);
  assert.equal(INDEX.includes("getElementById('noteEditorSave')"), false);
  assert.match(INDEX, /function notesPersistEditor\(/);
  assert.match(INDEX, /function notesAutoSaveSchedule\(/);
  assert.match(INDEX, /function notesAutoSaveFlush\(/);
  assert.equal(INDEX.includes('id="notesAiChip"'), false);
  assert.equal(INDEX.includes('function eitiNotesAIUpdateChip('), false);
  const moreIdx = INDEX.indexOf('id="noteMoreMenu"');
  const fmtBtnIdx = INDEX.indexOf('id="noteFmtToggle"');
  const saveAsIdx = INDEX.indexOf('id="noteSaveAsBtn"');
  const shareIdx = INDEX.indexOf('id="noteShareBtn"');
  const reminderIdx = INDEX.indexOf('id="noteReminderBtn"');
  const lightIdx = INDEX.indexOf('id="noteLightBtn"');
  const histIdx = INDEX.indexOf('id="noteHistoryBtn"');
  const delIdx = INDEX.indexOf('id="noteEditorDelete"');
  const copyIdx = INDEX.indexOf('id="noteCopyAllBtn"');
  const topbarIdx = INDEX.indexOf('class="note-editor-topbar"');
  const topbarEnd = INDEX.indexOf('class="note-editor-toolbar"', topbarIdx);
  const fabIdx = INDEX.indexOf('id="notesAiFabBar"');
  assert.ok(moreIdx > 0 && fmtBtnIdx > moreIdx && saveAsIdx > fmtBtnIdx && shareIdx > saveAsIdx);
  assert.ok(reminderIdx > shareIdx && lightIdx > reminderIdx && histIdx > lightIdx && delIdx > histIdx);
  assert.ok(copyIdx > topbarIdx && (topbarEnd < 0 || copyIdx < topbarEnd));
  assert.ok(saveAsIdx > moreIdx && saveAsIdx < fabIdx);
  assert.ok(shareIdx > moreIdx && shareIdx < fabIdx);
  assert.ok(INDEX.indexOf('data-fmt="bold"') > INDEX.indexOf('id="noteFmtPopover"'));
});

test('diff: вставка, удаление и замена слов', () => {
  const s = loadDiff();
  const ins = s.eitiNotesDiffWords('один два', 'один два три');
  assert.equal(ins.ops.filter((op) => op.t === 'ins').map((op) => op.v).join('').trim(), 'три');
  assert.ok(ins.ops.some((op) => op.t === 'eq' && op.v.includes('один')));

  const del = s.eitiNotesDiffWords('один два три', 'один три');
  assert.ok(del.ops.some((op) => op.t === 'del' && /два/.test(op.v)));
  assert.equal(del.ops.filter((op) => op.t === 'ins').length, 0);

  const rep = s.eitiNotesDiffWords('alpha old omega', 'alpha new omega');
  assert.ok(rep.ops.some((op) => op.t === 'del' && op.v.includes('old')));
  assert.ok(rep.ops.some((op) => op.t === 'ins' && op.v.includes('new')));
});

test('diff: кириллица, пустые строки и HTML экранирование', () => {
  const s = loadDiff();
  const cyr = s.eitiNotesDiffWords('Привет мир', 'Привет свет');
  assert.ok(cyr.ops.some((op) => op.t === 'del' && op.v.includes('мир')));
  assert.ok(cyr.ops.some((op) => op.t === 'ins' && op.v.includes('свет')));

  const emptyToText = s.eitiNotesDiffWords('', 'начало');
  assert.equal(emptyToText.ops.length, 1);
  assert.equal(emptyToText.ops[0].t, 'ins');
  assert.equal(emptyToText.ops[0].v, 'начало');

  const textToEmpty = s.eitiNotesDiffWords('конец', '');
  assert.equal(textToEmpty.ops.length, 1);
  assert.equal(textToEmpty.ops[0].t, 'del');
  assert.equal(textToEmpty.ops[0].v, 'конец');

  const bothEmpty = s.eitiNotesDiffWords('', '');
  assert.equal(bothEmpty.ops.length, 0);

  const html = s.eitiNotesDiffToHtml([{ t: 'ins', v: '<script>' }]);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test('diff: длинный текст укладывается в бюджет 50 мс', () => {
  const s = loadDiff();
  const lines = [];
  for (let i = 0; i < 2500; i++) lines.push('строка номер ' + i + ' кириллица');
  const before = lines.join('\n');
  const after = before.replace('строка номер 1200 кириллица', 'строка номер 1200 изменена');
  const t0 = Date.now();
  const result = s.eitiNotesDiffWords(before, after, { budgetMs: 50 });
  const elapsed = Date.now() - t0;
  assert.ok(elapsed < 80, 'diff слишком долгий: ' + elapsed + 'ms');
  assert.ok(result.ops.some((op) => op.t === 'ins'));
  assert.ok(result.ops.some((op) => op.t === 'del'));
});

test('undo/redo: одна пара, подтверждение после ручного ввода', () => {
  const s = loadUndo();
  let note = { id: 'n1', body: 'до' };
  note = s.eitiNotesAiUndoRecord(note, 'до', 'после');
  assert.equal(note.aiBefore, 'до');
  assert.equal(note.aiAfter, 'после');
  assert.equal(note.aiUndoAt, 'after');
  assert.equal(s.eitiNotesAiUndoCanUndo(note), true);
  assert.equal(s.eitiNotesAiUndoCanRedo(note), false);
  assert.equal(s.eitiNotesAiUndoNeedsConfirm(note, 'после'), false);
  assert.equal(s.eitiNotesAiUndoNeedsConfirm(note, 'ручной текст'), true);

  const undone = s.eitiNotesAiApplyUndo(note);
  assert.equal(undone.ok, true);
  assert.equal(undone.body, 'до');
  assert.equal(undone.note.aiUndoAt, 'before');
  assert.equal(s.eitiNotesAiUndoCanUndo(undone.note), false);
  assert.equal(s.eitiNotesAiUndoCanRedo(undone.note), true);

  const redone = s.eitiNotesAiApplyRedo(undone.note);
  assert.equal(redone.ok, true);
  assert.equal(redone.body, 'после');
  assert.equal(redone.note.aiUndoAt, 'after');

  const next = s.eitiNotesAiUndoRecord(redone.note, 'после', 'ещё раз');
  assert.equal(next.aiBefore, 'после');
  assert.equal(next.aiAfter, 'ещё раз');
  assert.equal(s.eitiNotesAiApplyRedo(next).ok, false);
});

test('имя файла санитизируется, кириллица сохраняется', () => {
  const s = loadExport();
  assert.equal(s.eitiNotesSanitizeFilename('Идея MVP'), 'Идея MVP');
  assert.equal(s.eitiNotesSanitizeFilename('a/b\\c:d*e?f"g<h>i|j'), 'a_b_c_d_e_f_g_h_i_j');
  assert.equal(s.eitiNotesSanitizeFilename('   '), 'zametka');
  assert.equal(s.eitiNotesSanitizeFilename('../секрет.txt'), '.._секрет.txt');
  const long = s.eitiNotesSanitizeFilename('я'.repeat(120));
  assert.equal(long.length, 80);
});

test('экспорт md/txt: заголовок, тело, UTF-8 кириллица', () => {
  const s = loadExport();
  const md = s.eitiNotesExportContent('Заголовок', 'Текст заметки', 'md');
  assert.equal(md.filename, 'Заголовок.md');
  assert.match(md.mime, /text\/markdown/);
  assert.match(md.content, /^# Заголовок\n\nТекст заметки\n$/);

  const txt = s.eitiNotesExportContent('Заголовок', 'Текст заметки', 'txt');
  assert.equal(txt.filename, 'Заголовок.txt');
  assert.match(txt.mime, /text\/plain/);
  assert.equal(txt.content, 'Заголовок\n\nТекст заметки');

  const emptyTitle = s.eitiNotesExportContent('', 'только тело', 'md');
  assert.equal(emptyTitle.filename, 'zametka.md');
  assert.match(emptyTitle.content, /только тело/);
  assert.doesNotMatch(emptyTitle.content, /undefined/);
});

test('автосохранение: шапка без 💾, flush на закрытие/переключение/pagehide, без пустых заметок', () => {
  const top = INDEX.indexOf('class="note-editor-topbar-actions"');
  const topEnd = INDEX.indexOf('id="noteMoreMenu"', top);
  const actions = INDEX.slice(top, topEnd);
  assert.equal(actions.includes('💾'), false);
  assert.match(actions, /id="noteCopyAllBtn"/);
  assert.match(actions, /id="noteMoreBtn"/);
  const fn = (name) => {
    const i = INDEX.indexOf('function ' + name + '(');
    assert.ok(i > 0, name);
    return INDEX.slice(i, INDEX.indexOf('\n        }\n', i));
  };
  assert.match(fn('notesCloseEditor'), /notesAutoSaveFlush\(\)/);
  assert.match(fn('notesOpenEditor'), /notesAutoSaveFlush\(\)/);
  assert.match(fn('notesAutoSaveSchedule'), /800/);
  assert.match(fn('notesPersistEditor'), /if \(!title && !body\) return 'empty'/);
  assert.equal(/showToast/.test(fn('notesPersistEditor')), false);
  assert.match(INDEX, /addEventListener\('pagehide', function\(\) \{ notesAutoSaveFlush\(\); \}\)/);
  assert.match(INDEX, /visibilityState === 'hidden'\) notesAutoSaveFlush\(\)/);
});
