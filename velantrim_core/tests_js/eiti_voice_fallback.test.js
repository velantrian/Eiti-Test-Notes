// EitiVoice P1-1: readiness-based fallback, bounded recovery, no paid/network calls.
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../../local/eiti_voice.js');

function harness() {
  let now = 0, serial = 0;
  const pending = new Map(), calls = [], ready = {};
  let online = true, current = 'gemini';
  M.PROVIDERS.forEach((id) => (ready[id] = true));
  const legacy = {
    providers: {}, current: () => current, label: (id) => id,
    start: (id) => calls.push('start:' + id), offerSwitch: (id, reason) => calls.push('offer:' + id + ':' + reason)
  };
  M.PROVIDERS.forEach((id) => {
    legacy.providers[id] = {
      hasKey: () => ready[id], proxy: id === 'qwen' || id === 'yandex',
      start() {}, stop() {}, mute() {}, isActive: () => false
    };
  });
  const win = {
    EitiVoice: legacy, WebSocket: function () {}, RTCPeerConnection: function () {}, MediaRecorder: function () {},
    navigator: { get onLine() { return online; } },
    setTimeout: (fn, ms) => { const id = ++serial; pending.set(id, { fn, at: now + ms }); return id; },
    clearTimeout: (id) => { pending.delete(id); }
  };
  const api = M.install(win);
  function advance(ms) {
    const end = now + ms;
    while (true) {
      let next = null, id = null;
      for (const [key, t] of pending) if (t.at <= end && (!next || t.at < next.at)) { id = key; next = t; }
      if (!next) break;
      pending.delete(id); now = next.at; next.fn();
    }
    now = end;
  }
  return { api, calls, ready, pending, advance, setOnline: (x) => (online = x), setCurrent: (x) => (current = x) };
}

test('fallback includes every preflight-ready provider, skipping missing key/proxy and offline', () => {
  const h = harness();
  h.ready.grok = false; h.ready.openai = true; h.ready.qwen = false;
  assert.deepEqual(h.api.fallbackOrder('gemini'), ['openai', 'yandex', 'mistral']);
  assert.equal(h.api.adapters.grok.ready(), 'key');
  assert.equal(h.api.adapters.qwen.ready(), 'proxy');
  h.setOnline(false);
  assert.equal(h.api.adapters.openai.ready(), 'network');
  assert.deepEqual(h.api.fallbackOrder('gemini'), []);
  h.setOnline(true);
  assert.equal(h.api.caps('alisa').needsProxy, true);
});

test('socket -> 1s -> timeout -> 3s -> exhausted; no automatic switch or infinite retries', () => {
  const h = harness();
  const states = [];
  h.api.on('state', (e) => states.push(e.state));
  let first = h.api.handleFailure('gemini', 'socket');
  assert.deepEqual([first.status, first.attempt, first.delay], ['reconnecting', 1, 1000]);
  assert.equal(h.api.state(), 'reconnecting');
  h.advance(999); assert.deepEqual(h.calls, []);
  h.advance(1); assert.deepEqual(h.calls, ['start:gemini']);
  h.api.core.setState('listening', 'gemini');
  let second = h.api.handleFailure('gemini', 'timeout');
  assert.deepEqual([second.status, second.attempt, second.delay], ['reconnecting', 2, 3000]);
  h.advance(2999); assert.equal(h.calls.length, 1);
  h.advance(1); assert.deepEqual(h.calls.slice(0, 2), ['start:gemini', 'start:gemini']);
  let third = h.api.handleFailure('gemini', 'socket');
  assert.equal(third.status, 'fallback');
  assert.deepEqual(h.calls, ['start:gemini', 'start:gemini', 'offer:gemini:socket']);
  assert.equal(h.api.recoveryStatus().exhausted, true);
  assert.equal(h.api.handleFailure('gemini', 'socket').status, 'exhausted');
  h.advance(60_000);
  assert.equal(h.calls.filter((x) => x.startsWith('start:')).length, 2);
  assert.ok(states.includes('reconnecting'));
});

test('auth, quota, no_key, no_proxy, mic_denied, offline cannot trigger reconnect', () => {
  for (const code of ['auth', 'quota', 'no_key', 'no_proxy', 'mic_denied', 'offline']) {
    const h = harness();
    const result = h.api.handleFailure('gemini', code);
    assert.equal(result.status, 'fallback', code);
    assert.equal(h.calls.filter((x) => x.startsWith('start:')).length, 0);
    assert.equal(h.api.recoveryStatus().pending, false);
    h.advance(5000);
    assert.equal(h.calls.filter((x) => x.startsWith('start:')).length, 0);
  }
  for (const [code, expected] of [[1008, 'auth'], [4429, 'quota']]) {
    const h = harness();
    h.api.handleDisconnect('gemini', { code, reason: '' });
    assert.equal(h.api.lastError().code, expected);
    assert.equal(h.api.recoveryStatus().pending, false);
  }
});

test('cancellation, manual fresh start and preflight change invalidate queued timers', () => {
  let h = harness();
  h.api.handleFailure('gemini', 'socket');
  h.api.cancelReconnect(); h.advance(1000);
  assert.deepEqual(h.calls, []);
  h = harness();
  h.api.handleFailure('gemini', 'socket');
  h.api.core.setState('connecting', 'gemini'); h.advance(1000);
  assert.deepEqual(h.calls, []);
  h = harness();
  h.api.handleFailure('gemini', 'socket');
  h.ready.gemini = false; h.advance(1000);
  assert.equal(h.calls.some((x) => x.startsWith('start:')), false);
  assert.equal(h.api.lastError().code, 'no_key');
  h = harness();
  h.api.handleFailure('gemini', 'socket');
  h.setCurrent('grok'); h.advance(1000);
  assert.deepEqual(h.calls, []);
});

test('manual reconnect compatibility remains two attempts maximum per provider', () => {
  const h = harness();
  assert.equal(h.api.reconnect('gemini', 2), true);
  assert.equal(h.api.reconnect('gemini'), true);
  assert.equal(h.api.reconnect('gemini'), false);
  assert.equal(h.api.reconnect('gemini', 2), false); // explicit max cannot rearm an exhausted session
  assert.deepEqual(h.calls, ['start:gemini', 'start:gemini']);
  h.api.cancelReconnect();
  assert.equal(h.api.reconnect('gemini'), true);
});

test('adapter readiness cannot be inferred from an invalid proxy, and never invokes provider start', () => {
  const h = harness();
  h.ready.qwen = false; h.ready.yandex = false;
  h.api.fallbackOrder('grok');
  assert.deepEqual(h.calls, []);
  assert.equal(h.api.adapters.qwen.ready(), 'proxy');
  assert.equal(h.api.adapters.yandex.ready(), 'proxy');
});
