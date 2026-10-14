'use strict';
// Tests for eitiExportMarkdown() — generating a downloadable file from notes.
// This is the "attach a file in chat" path for Markdown: it must serialise every
// note into valid front-matter + body and hand the blob to the downloader. We
// stub _dlBlob to capture the exact bytes that would be written to disk, then
// assert the content is well-formed (the part a user actually downloads).

const test = require('node:test');
const assert = require('node:assert');
const { loadFunctions } = require('./harness');

function makeExporter(notes) {
  const captured = [];
  const toasts = [];
  const sb = loadFunctions(['eitiExportMarkdown'], {
    notesLoad: () => notes,
    _dlBlob: (content, filename, mime) => captured.push({ content, filename, mime }),
    showToast: (m) => toasts.push(m),
    Date, // ISO timestamp formatting
  });
  return { run: sb.eitiExportMarkdown, captured, toasts };
}

test('no notes → nothing is written, user is told', () => {
  const { run, captured, toasts } = makeExporter([]);
  run();
  assert.strictEqual(captured.length, 0);
  assert.ok(toasts.some((t) => /Нет заметок/.test(t)));
});

test('a note becomes a valid Markdown document with front-matter and body', () => {
  const { run, captured } = makeExporter([
    { title: 'Идея', body: 'Текст идеи', tags: ['проект', 'важное'],
      updated: Date.parse('2026-01-15T10:00:00Z') },
  ]);
  run();
  assert.strictEqual(captured.length, 1);
  const { content, filename, mime } = captured[0];
  assert.strictEqual(filename, 'eiti_notes.md');
  assert.strictEqual(mime, 'text/markdown');
  // Front-matter fields
  assert.match(content, /title: Идея/);
  assert.match(content, /tags: \[проект, важное\]/);
  assert.match(content, /updated: 2026-01-15T10:00:00\.000Z/);
  // Body and trailing hashtags
  assert.match(content, /Текст идеи/);
  assert.match(content, /#проект #важное/);
});

test('missing title/tags/body fall back to safe defaults (no "undefined")', () => {
  const { run, captured } = makeExporter([{ created: Date.parse('2026-02-01T00:00:00Z') }]);
  run();
  const { content } = captured[0];
  assert.match(content, /title: Без названия/);
  assert.match(content, /tags: \[\]/);
  assert.doesNotMatch(content, /undefined/, 'must never serialise the word undefined');
});

test('multiple notes are separated by a Markdown horizontal rule', () => {
  const { run, captured } = makeExporter([
    { title: 'A', body: 'aaa' },
    { title: 'B', body: 'bbb' },
  ]);
  run();
  const { content } = captured[0];
  assert.match(content, /title: A/);
  assert.match(content, /title: B/);
  // join('\n\n---\n\n') → a separator rule sits between the two documents.
  assert.ok(content.includes('\n---\n'), 'notes separated by an --- rule');
});
