'use strict';
// Tests for the image-generation pure cores (parse command / build request /
// parse response). These let a model emit [IMG: ...] and have EITI call OpenAI
// or Gemini and attach the result. The HTTP call itself is not unit-tested
// (that needs the network); we pin the request shape and response decoding,
// which is where provider-API drift silently breaks the feature.

const test = require('node:test');
const assert = require('node:assert');
const { loadFunctions } = require('./harness');

const img = loadFunctions(
  ['eitiImgParseCommand', 'eitiImgBuildRequest', 'eitiImgParseResponse', 'eitiImgDetectRequest'],
  { Error }
);

test('parses [IMG:], [IMAGE:] and [КАРТИНКА:] prompts, trimmed', () => {
  const got = img.eitiImgParseCommand(
    'вот идея [IMG:  кот в скафандре ] и ещё [КАРТИНКА: закат над морем]'
  );
  // Spread to the test realm (elements are primitive strings) for comparison.
  assert.deepStrictEqual([...got], ['кот в скафандре', 'закат над морем']);
});

test('no command → empty list; falsy input is safe', () => {
  assert.strictEqual(img.eitiImgParseCommand('обычный текст').length, 0);
  assert.strictEqual(img.eitiImgParseCommand('').length, 0);
  assert.strictEqual(img.eitiImgParseCommand(null).length, 0);
});

test('OpenAI request targets the images endpoint with bearer auth', () => {
  const req = img.eitiImgBuildRequest('openai', 'a fox', { key: 'sk-x', size: '512x512' });
  assert.strictEqual(req.url, 'https://api.openai.com/v1/images/generations');
  assert.strictEqual(req.method, 'POST');
  assert.strictEqual(req.headers.Authorization, 'Bearer sk-x');
  assert.strictEqual(req.body.prompt, 'a fox');
  assert.strictEqual(req.body.size, '512x512');
  assert.strictEqual(req.body.n, 1);
});

test('Gemini request targets the Imagen predict endpoint with the key in the URL', () => {
  const req = img.eitiImgBuildRequest('gemini', 'a fox', { key: 'AIzaXYZ' });
  assert.match(req.url, /generativelanguage\.googleapis\.com/);
  assert.match(req.url, /:predict\?key=AIzaXYZ$/);
  assert.strictEqual(req.body.parameters.sampleCount, 1);
  assert.strictEqual(req.body.instances[0].prompt, 'a fox');
});

test('empty prompt and unknown provider throw', () => {
  assert.throws(() => img.eitiImgBuildRequest('openai', '   ', {}), /empty image prompt/);
  assert.throws(() => img.eitiImgBuildRequest('midjourney', 'x', {}), /unsupported image provider/);
});

test('OpenAI response: decodes base64 and falls back to url', () => {
  const b = img.eitiImgParseResponse('openai', { data: [{ b64_json: 'QUJD' }] });
  assert.strictEqual(b.mime, 'image/png');
  assert.strictEqual(b.b64, 'QUJD');
  const u = img.eitiImgParseResponse('openai', { data: [{ url: 'https://x/y.png' }] });
  assert.strictEqual(u.url, 'https://x/y.png');
  assert.strictEqual(img.eitiImgParseResponse('openai', { data: [] }), null);
});

test('Gemini response: pulls inlineData (camelCase or snake_case)', () => {
  const camel = {
    candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: 'ZZ' } }] } }],
  };
  const c = img.eitiImgParseResponse('gemini', camel);
  assert.strictEqual(c.mime, 'image/jpeg');
  assert.strictEqual(c.b64, 'ZZ');

  const snake = {
    candidates: [{ content: { parts: [{ inline_data: { mime_type: 'image/png', data: 'YY' } }] } }],
  };
  const s = img.eitiImgParseResponse('gemini', snake);
  assert.strictEqual(s.mime, 'image/png');
  assert.strictEqual(s.b64, 'YY');
});

test('Gemini response with only text parts → null (no image)', () => {
  const json = { candidates: [{ content: { parts: [{ text: 'sorry, no image' }] } }] };
  assert.strictEqual(img.eitiImgParseResponse('gemini', json), null);
});

test('null/empty responses never throw', () => {
  assert.strictEqual(img.eitiImgParseResponse('openai', null), null);
  assert.strictEqual(img.eitiImgParseResponse('gemini', {}), null);
});

// Key resolution must honour the same localStorage fallbacks the rest of the
// app uses: OpenAI keys may live under either `eiti_openai_key` or the legacy
// `eiti_apikey_openai`. Regression guard for the PR-review fix.
function makeKeyResolver(stored) {
  const sb = loadFunctions(['eitiImgResolveKey', 'eitiImgPickProvider'], {
    window: { _deobfKey: (s) => s || '' },
    localStorage: { getItem: (k) => (k in stored ? stored[k] : null) },
  });
  return sb;
}

test('OpenAI key falls back to the legacy eiti_apikey_openai name', () => {
  const sb = makeKeyResolver({ eiti_apikey_openai: 'sk-legacy' });
  assert.strictEqual(sb.eitiImgResolveKey('openai'), 'sk-legacy');
  assert.strictEqual(sb.eitiImgPickProvider(), 'openai');
});

test('primary eiti_openai_key takes precedence over the legacy name', () => {
  const sb = makeKeyResolver({ eiti_openai_key: 'sk-primary', eiti_apikey_openai: 'sk-legacy' });
  assert.strictEqual(sb.eitiImgResolveKey('openai'), 'sk-primary');
});

test('no configured key → resolver empty and picker null', () => {
  const sb = makeKeyResolver({});
  assert.strictEqual(sb.eitiImgResolveKey('openai'), '');
  assert.strictEqual(sb.eitiImgPickProvider(), null);
});

test('Gemini key is read from eiti_gemini_key', () => {
  const sb = makeKeyResolver({ eiti_gemini_key: 'AIza-1' });
  assert.strictEqual(sb.eitiImgResolveKey('gemini'), 'AIza-1');
  assert.strictEqual(sb.eitiImgPickProvider(), 'gemini');
});

// Natural-language detection — routes "draw/generate an image…" typed in chat to
// the image generator instead of the text model. Must NOT hijack normal chat.
test('detects an image request and extracts prompt + 9:16 aspect', () => {
  const r = img.eitiImgDetectRequest('Создай изображения красивой девушки 9:16');
  assert.ok(r, 'should be detected');
  assert.strictEqual(r.aspect, '9:16');
  assert.match(r.prompt, /красивой девушки/);
  assert.doesNotMatch(r.prompt, /9:16/, 'aspect stripped from prompt');
});

test('detects without an aspect (defaults to null)', () => {
  const r = img.eitiImgDetectRequest('нарисуй кота в скафандре');
  assert.ok(r);
  assert.strictEqual(r.aspect, null);
  assert.match(r.prompt, /кота в скафандре/);
});

test('maps aspect word hints (вертикально / landscape / square)', () => {
  assert.strictEqual(img.eitiImgDetectRequest('сгенерируй вертикальное фото заката').aspect, '9:16');
  assert.strictEqual(img.eitiImgDetectRequest('generate a landscape image of mountains').aspect, '16:9');
  assert.strictEqual(img.eitiImgDetectRequest('сделай квадратную картинку').aspect, '1:1');
});

test('does NOT trigger on ordinary chat', () => {
  assert.strictEqual(img.eitiImgDetectRequest('Привет, друг'), null);
  assert.strictEqual(img.eitiImgDetectRequest('что ты умеешь?'), null);
  assert.strictEqual(img.eitiImgDetectRequest('расскажи про картину Репина'), null); // noun but no verb
  assert.strictEqual(img.eitiImgDetectRequest(''), null);
  assert.strictEqual(img.eitiImgDetectRequest(null), null);
});

test('OpenAI build maps a 9:16 aspect to a portrait size', () => {
  const req = img.eitiImgBuildRequest('openai', 'a tower', { key: 'k', aspect: '9:16' });
  assert.strictEqual(req.body.size, '1024x1536');
});

test('Gemini build passes a supported aspectRatio through Imagen parameters', () => {
  const req = img.eitiImgBuildRequest('gemini', 'a tower', { key: 'k', aspect: '9:16' });
  assert.strictEqual(req.body.parameters.aspectRatio, '9:16');
});

test('Gemini build maps an unsupported aspect to the nearest Imagen ratio', () => {
  // Imagen predict only accepts 1:1, 3:4, 4:3, 9:16, 16:9. The detector can
  // still extract 2:3 / 3:2, which must map to the nearest supported ratio
  // rather than be forwarded verbatim (which Imagen rejects).
  assert.strictEqual(img.eitiImgBuildRequest('gemini', 'x', { key: 'k', aspect: '2:3' }).body.parameters.aspectRatio, '3:4');
  assert.strictEqual(img.eitiImgBuildRequest('gemini', 'x', { key: 'k', aspect: '3:2' }).body.parameters.aspectRatio, '4:3');
});

test('Gemini build omits aspectRatio when none is given or it is unparseable', () => {
  assert.strictEqual('aspectRatio' in img.eitiImgBuildRequest('gemini', 'x', { key: 'k' }).body.parameters, false);
  assert.strictEqual('aspectRatio' in img.eitiImgBuildRequest('gemini', 'x', { key: 'k', aspect: 'square' }).body.parameters, false);
});
