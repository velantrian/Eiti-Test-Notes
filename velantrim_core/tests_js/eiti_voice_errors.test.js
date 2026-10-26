// EitiVoice P0-3: единые коды ошибок и локализованные сообщения RU/EN/DE
const test = require('node:test');
const assert = require('node:assert');
const M = require('../../local/eiti_voice.js');

const err = (name, message) => Object.assign(new Error(message || ''), { name });

test('classify maps getUserMedia DOMExceptions', () => {
  const c = M.createCore({});
  assert.strictEqual(c.classify(err('NotAllowedError')), 'mic_denied');
  assert.strictEqual(c.classify(err('SecurityError')), 'mic_denied');
  assert.strictEqual(c.classify(err('NotFoundError')), 'mic_absent');
  assert.strictEqual(c.classify(err('NotReadableError')), 'mic_busy');
  assert.strictEqual(c.classify(err('NotSupportedError')), 'unsupported');
});
test('classify maps provider messages', () => {
  const c = M.createCore({});
  assert.strictEqual(c.classify('API key not valid'), 'auth');
  assert.strictEqual(c.classify('HTTP 429 quota'), 'quota');
  assert.strictEqual(c.classify('timeout'), 'timeout');
  assert.strictEqual(c.classify('WebSocket closed'), 'socket');
  assert.strictEqual(c.classify('???'), 'unknown');
});
test('messages follow locale with RU fallback', () => {
  let l = 'en';
  const c = M.createCore({ locale: () => l });
  assert.match(c.message('mic_denied'), /No microphone access/);
  l = 'de'; assert.match(c.message('mic_denied'), /Kein Mikrofonzugriff/);
  l = 'fr'; assert.match(c.message('mic_denied'), /Нет доступа к микрофону/);
  assert.match(c.message('mic_absent', 'en'), /No microphone found/);
});
test('RU/EN/DE mic texts match existing i18n strings of index.html', () => {
  const html = require('fs').readFileSync(require('path').join(__dirname, '../../index.html'), 'utf8');
  ['🎤 No microphone access — allow it in the browser settings', '🎤 Kein Mikrofonzugriff – bitte in den Browser-Einstellungen erlauben',
   '🎤 Нет доступа к микрофону — разрешите его в настройках браузера', '🎤 Микрофон не найден'].forEach((s) => assert.ok(html.includes(s), s));
});
test('requestMic rejection carries code + localized message, state=error', async () => {
  const c = M.createCore({ locale: () => 'de', mediaDevices: () => ({ getUserMedia: () => Promise.reject(err('NotAllowedError', 'Permission denied')) }) });
  let ev; c.on('error', (e) => (ev = e));
  await assert.rejects(c.requestMic({ audio: true }, 'gemini'), (e) => e.eitiCode === 'mic_denied' && /Kein Mikrofonzugriff/.test(e.message));
  assert.strictEqual(c.state(), 'error');
  assert.deepStrictEqual([ev.code, ev.provider, ev.retriable], ['mic_denied', 'gemini', false]);
});
