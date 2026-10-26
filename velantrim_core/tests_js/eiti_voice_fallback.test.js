// EitiVoice P1-1: запасной провайдер по ready(), ограниченное переподключение (2 попытки, 1с/3с), переход к тексту.
// Без DOM и без сети: адаптеры и таймеры — моки, реальные провайдеры не вызываются.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const M = require('../../local/eiti_voice.js');
const HTML = fs.readFileSync(path.join(__dirname, '../..', 'index.html'), 'utf8');

function fakeClock() {
  let now = 0, seq = 0; const q = [];
  return {
    setTimeout(fn, d) { const id = ++seq; q.push({ id, at: now + d, fn }); return id; },
    clearTimeout(id) { const i = q.findIndex((t) => t.id === id); if (i >= 0) q.splice(i, 1); },
    tick(ms) { now += ms; q.sort((a, b) => a.at - b.at); while (q.length && q[0].at <= now) q.shift().fn(); },
    pending: () => q.length, delays: () => q.map((t) => t.at - now),
  };
}
// ready: { id: true|false }; active по умолчанию false
function setup(ready, opts) {
  opts = opts || {};
  const clock = fakeClock(), calls = [];
  const legacy = { providers: {}, label: (i) => i, current: () => opts.current || 'gemini', start: (id) => calls.push('legacy:' + id) };
  M.PROVIDERS.forEach((id) => {
    legacy.providers[id] = { id, proxy: id === 'qwen' || id === 'yandex', hasKey: () => !!ready[id], start: () => calls.push('start:' + id), stop() {}, mute() {}, isActive: () => false };
  });
  const win = { EitiVoice: legacy, navigator: { onLine: opts.offline ? false : true }, setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout };
  const api = M.install(win);
  return { api, clock, calls, win, legacy };
}

test('fallbackOrder: только готовые по ready(), без текущего, порядок реестра', () => {
  const { api } = setup({ grok: false, gemini: true, openai: true, qwen: false, yandex: true, mistral: true });
  assert.deepStrictEqual(api.fallbackOrder('gemini'), ['openai', 'yandex', 'mistral']);
  assert.strictEqual(api.pickFallback('gemini'), 'openai');
});
test('fallbackOrder: пользовательский порядок уважается, неизвестные id отброшены, alias alisa → yandex', () => {
  const { api } = setup({ gemini: true, openai: true, yandex: true, mistral: true });
  assert.deepStrictEqual(api.fallbackOrder('gemini', ['mistral', 'bogus', 'alisa']), ['mistral', 'yandex', 'openai']);
});
test('fallbackOrder: адаптер, бросающий в ready(), пропускается', () => {
  const { api } = setup({ openai: true, mistral: true });
  api.adapters.openai.ready = () => { throw new Error('boom'); };
  assert.deepStrictEqual(api.fallbackOrder('grok'), ['mistral']);
});
test('fallbackOrder: без сети пусто', () => {
  const { api } = setup({ openai: true }, { offline: true });
  assert.deepStrictEqual(api.fallbackOrder('grok'), []);
});

test('обрыв сокета: 2 попытки с задержкой 1с и 3с, затем запасной провайдер; бесконечных повторов нет', () => {
  const { api, clock, calls } = setup({ gemini: true, openai: true });
  const ev = []; api.on('reconnect', (e) => ev.push(e.attempt + '@' + e.delay)); api.on('fallback', (e) => ev.push('fb:' + e.to));
  let r = api.handleDrop('gemini', 'socket');
  assert.deepStrictEqual([r.action, r.attempt, r.delay, r.max], ['reconnect', 1, 1000, 2]);
  assert.strictEqual(api.state(), 'reconnecting');
  clock.tick(999); assert.deepStrictEqual(calls, []);
  clock.tick(1); assert.deepStrictEqual(calls, ['start:gemini']);
  r = api.handleDrop('gemini', 'timeout');
  assert.deepStrictEqual([r.action, r.attempt, r.delay], ['reconnect', 2, 3000]);
  clock.tick(3000); assert.deepStrictEqual(calls, ['start:gemini', 'start:gemini']);
  r = api.handleDrop('gemini', 'socket');
  assert.deepStrictEqual([r.action, r.to], ['fallback', 'openai']);
  assert.strictEqual(clock.pending(), 0);
  // ещё обрывы не запускают новых таймеров, пока нет успешного подключения → не дольше 2 попыток
  for (let i = 0; i < 20; i++) api.handleDrop('gemini', 'socket');
  clock.tick(60_000);
  assert.ok(calls.filter((c) => c === 'start:gemini').length <= 2 + 2 * 10, 'bounded');
  assert.deepStrictEqual(ev.slice(0, 3), ['1@1000', '2@3000', 'fb:openai']);
});
test('строгий лимит: подряд обрывы без успеха → ровно 2 автоматических старта', () => {
  const { api, clock, calls } = setup({ gemini: true });
  api.handleDrop('gemini', 'socket'); clock.tick(1000);
  api.handleDrop('gemini', 'socket'); clock.tick(3000);
  const r = api.handleDrop('gemini', 'socket'); clock.tick(10_000);
  assert.strictEqual(r.action, 'text');
  assert.deepStrictEqual(calls, ['start:gemini', 'start:gemini']);
});
test('успешное подключение (listening) сбрасывает счётчик попыток', () => {
  const { api, clock } = setup({ gemini: true });
  api.handleDrop('gemini', 'socket'); clock.tick(1000);
  api.core.setState('listening', 'gemini');
  assert.strictEqual(api.reconnectInfo().attempts, 0);
  const r = api.handleDrop('gemini', 'socket');
  assert.deepStrictEqual([r.action, r.attempt, r.delay], ['reconnect', 1, 1000]);
});
for (const code of ['auth', 'quota', 'no_key', 'no_proxy', 'mic_denied', 'unknown']) {
  test(`не повторяем при ${code}: сразу запасной вариант, таймеров нет`, () => {
    const { api, clock, calls } = setup({ gemini: true, mistral: true });
    const r = api.handleDrop('gemini', code);
    assert.deepStrictEqual([r.action, r.to, r.code], ['fallback', 'mistral', code]);
    assert.strictEqual(clock.pending(), 0); clock.tick(10_000);
    assert.deepStrictEqual(calls, []);
  });
}
test('классификация из Error: «API key not valid» → auth (без повтора), «socket closed» → reconnect', () => {
  const { api, clock } = setup({ gemini: true });
  assert.strictEqual(api.handleDrop('gemini', new Error('API key not valid')).action, 'text');
  assert.strictEqual(clock.pending(), 0);
  assert.strictEqual(api.handleDrop('gemini', new Error('websocket closed')).action, 'reconnect');
});
test('cancelReconnect: таймер снят, старт не происходит, счётчик сброшен, состояние idle', () => {
  const { api, clock, calls } = setup({ gemini: true });
  api.handleDrop('gemini', 'socket');
  assert.strictEqual(api.cancelReconnect(), true);
  assert.strictEqual(api.state(), 'idle');
  clock.tick(10_000);
  assert.deepStrictEqual(calls, []);
  assert.strictEqual(api.reconnectInfo().attempts, 0);
  assert.strictEqual(api.cancelReconnect(), false);
});
test('guard: если состояние сменилось до таймера (пользователь сменил провайдера/остановил), старт не выполняется', () => {
  const { api, clock, calls } = setup({ gemini: true });
  api.handleDrop('gemini', 'socket');
  api.core.setState('idle');
  clock.tick(1000);
  assert.deepStrictEqual(calls, []);
});
test('без сети: не переподключаемся, сразу текстовый режим с понятной причиной', () => {
  const { api, clock } = setup({ gemini: true, openai: true }, { offline: true });
  const tm = []; api.on('text_mode', (e) => tm.push(e));
  const r = api.handleDrop('gemini', 'socket');
  assert.strictEqual(r.action, 'text'); assert.strictEqual(r.code, 'offline');
  assert.strictEqual(clock.pending(), 0);
  assert.strictEqual(tm.length, 1);
  assert.match(tm[0].message, /Нет сети/);
});
test('нет готовых провайдеров → текстовый режим (событие text_mode с причиной)', () => {
  const { api } = setup({ gemini: true });
  const tm = []; api.on('text_mode', (e) => tm.push(e));
  const r = api.handleDrop('gemini', 'quota');
  assert.strictEqual(r.action, 'text');
  assert.deepStrictEqual([tm[0].reason, tm[0].provider], ['quota', 'gemini']);
  assert.ok(tm[0].message.length > 0);
});
test('ошибка при автоматическом старте → error, не бросает', () => {
  const { api, clock } = setup({ gemini: true });
  api.adapters.gemini.start = () => { throw new Error('socket boom'); };
  api.handleDrop('gemini', 'socket');
  assert.doesNotThrow(() => clock.tick(1000));
  assert.strictEqual(api.state(), 'error');
});
test('createReconnect: собственные задержки, schedule после лимита → null', () => {
  const clock = fakeClock();
  const rc = M.createReconnect({ setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout });
  assert.deepStrictEqual(rc.schedule('x', () => {}).delay, 1000);
  assert.deepStrictEqual(rc.schedule('x', () => {}).delay, 3000);
  assert.strictEqual(clock.pending(), 1); // предыдущий таймер заменён
  assert.strictEqual(rc.schedule('x', () => {}), null);
  rc.reset(); assert.strictEqual(rc.left(), 2);
});
test('совместимость: старый API не тронут, новые методы только добавлены, reconnect() P0 работает как раньше', () => {
  const orig = { start() {}, stop() {}, mute() {}, isActive() { return false; }, label() { return 'X'; }, needs() { return ''; },
    offerSwitch() {}, tr() {}, ids() { return []; }, current() { return 'grok'; }, active() { return ''; }, providers: {} };
  const legacy = Object.assign({}, orig);
  M.install({ EitiVoice: legacy, navigator: {} });
  Object.keys(orig).forEach((k) => assert.strictEqual(legacy[k], orig[k], k));
  ['handleDrop', 'pickFallback', 'cancelReconnect', 'reconnectInfo', 'textMode', 'fallbackOrder', 'reconnect', 'fallback'].forEach((k) => assert.strictEqual(typeof legacy[k], 'function', k));
});
test('index.html: offerSwitch берёт готового провайдера из контроллера, есть кнопка текста и мост _eitiVoiceDrop', () => {
  assert.match(HTML, /C\.pickFallback\(from\)/);
  assert.match(HTML, /eiti-voice-text-btn/);
  assert.match(HTML, /function _eitiVoiceDrop\(prov, code\)/);
  assert.match(HTML, /_cancelRc\(\); \/\/ P1-1/);
  // мост деградирует к прежнему offerSwitch без модуля
  assert.match(HTML, /if \(!C \|\| typeof C\.handleDrop !== 'function'\) \{ if \(window\.EitiVoice\) EitiVoice\.offerSwitch\(prov, 'socket'\); return null; \}/);
});
test('_eitiVoiceCloseCode: 4401/4403 → auth, 4429 → quota (без повтора), 1006 → socket', () => {
  const m = HTML.match(/function _eitiVoiceCloseCode\(code, reason\) \{[\s\S]*?\n        \}/);
  assert.ok(m, '_eitiVoiceCloseCode найдена в index.html');
  const f = new Function(m[0] + '; return _eitiVoiceCloseCode;')();
  assert.strictEqual(f(4401, ''), 'auth');
  assert.strictEqual(f(4403, ''), 'auth');
  assert.strictEqual(f(4429, ''), 'quota');
  assert.strictEqual(f(1006, ''), 'socket');
  for (const code of [4401, 4403, 4429]) {
    const { api, clock } = setup({ gemini: true });
    assert.notStrictEqual(api.handleDrop('gemini', f(code, '')).action, 'reconnect');
    assert.strictEqual(clock.pending(), 0);
  }
});
