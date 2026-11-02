const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');

test('composer undo/redo markup and settings exist', () => {
  assert.match(html, /id="eiti-composer-undo"/);
  assert.match(html, /id="eiti-composer-redo"/);
  assert.match(html, /eitiComposerUndoSetVisible/);
  assert.match(html, /eiti_composer_undo/);
  assert.match(html, /Отмена \/ повтор ввода/);
});
