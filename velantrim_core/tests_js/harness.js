'use strict';
// Read-only test harness for the EITI single-file PWA.
//
// We do NOT modify index.html (the "single-file is sacred" rule in AGENTS.md).
// Instead we read it, slice out individual top-level functions by name, and run
// them inside an isolated Node `vm` sandbox so their pure logic can be unit-tested.
//
// Extraction relies on the monolith's consistent formatting: a function's
// closing brace sits on its own line at the *same* indentation as its
// `function` keyword. Nested braces are always more deeply indented, so this is
// robust against `{` inside regex/strings (e.g. `{3,}`). Works for functions at
// any indent level (top-level 0/8 spaces or nested 12+).

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const INDEX_HTML = path.join(__dirname, '..', '..', 'index.html');
const LINES = fs.readFileSync(INDEX_HTML, 'utf8').split('\n');

/** Return the exact source text of a function by name, at any indent level. */
function extractFunction(name) {
  const startRe = new RegExp('^(\\s*)(?:async )?function ' + name + '\\b');
  let start = -1;
  let indent = '';
  for (let i = 0; i < LINES.length; i++) {
    const m = LINES[i].match(startRe);
    if (m) { start = i; indent = m[1]; break; }
  }
  if (start === -1) throw new Error('Function not found in index.html: ' + name);

  const closeRe = new RegExp('^' + indent + '\\}\\s*$');
  let end = -1;
  for (let i = start + 1; i < LINES.length; i++) {
    if (closeRe.test(LINES[i])) { end = i; break; }
  }
  if (end === -1) throw new Error('Closing brace not found for: ' + name);

  return LINES.slice(start, end + 1).join('\n');
}

/**
 * Build a sandbox, define the named functions inside it, and return the sandbox.
 * `extras` injects/overrides globals the functions reference as free variables
 * (e.g. _pkgCache, eitiDb, PKG_DECAY_PER_DAY, window, a fake Date).
 */
function loadFunctions(names, extras) {
  const sandbox = Object.assign({
    Math, Date, RegExp, Array, Object, JSON,
    parseFloat, parseInt, isNaN, String, Number, console,
  }, extras || {});
  vm.createContext(sandbox);
  for (const name of names) {
    vm.runInContext(extractFunction(name), sandbox, { filename: name + '.extracted.js' });
  }
  return sandbox;
}

module.exports = { extractFunction, loadFunctions, INDEX_HTML };
