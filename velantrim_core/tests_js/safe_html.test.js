'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFunctions } = require('./harness');

test('safe HTML escapes untrusted content when DOMPurify is unavailable', () => {
  const s = loadFunctions(['_eitiEscapeHTML', '_eitiSafeHTML']);
  const payload = '<img src=x onerror=alert(1)><script>alert(2)</script>';
  const out = s._eitiSafeHTML(payload);
  assert.equal(out.includes('<img'), false);
  assert.equal(out.includes('<script>'), false);
  assert.equal(out.includes('&lt;img'), true);
  assert.equal(out.includes('&lt;script&gt;'), true);
});

test('safe HTML escapes the full value when DOMPurify throws', () => {
  const DOMPurify = { sanitize() { throw new Error('sanitizer unavailable'); } };
  const s = loadFunctions(['_eitiEscapeHTML', '_eitiSafeHTML'], { DOMPurify });
  const payload = '<a href="javascript:alert(1)">click</a>';
  const out = s._eitiSafeHTML(payload);
  assert.equal(out.includes('<a '), false);
  assert.equal(out.includes('&lt;a href=&quot;javascript:alert(1)&quot;&gt;'), true);
});

test('safe HTML uses DOMPurify when the sanitizer is available', () => {
  let called = false;
  const DOMPurify = {
    sanitize(value, options) {
      called = true;
      assert.ok(options.FORBID_TAGS.includes('script'));
      return '<b>safe</b>';
    },
  };
  const s = loadFunctions(['_eitiEscapeHTML', '_eitiSafeHTML'], { DOMPurify });
  assert.equal(s._eitiSafeHTML('<b>safe</b>'), '<b>safe</b>');
  assert.equal(called, true);
});
