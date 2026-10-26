// EitiVoice P0: EITI Voice — единый голосовой контроллер (docs/EITI_VOICE_PLAN.md, этап P0).
// Без DOM в ядре: машина состояний, коды ошибок (RU/EN/DE), адаптеры провайдеров,
// общий запрос микрофона. Низкоуровневый код провайдеров (WS/WebRTC/PCM) пока в index.html —
// адаптеры только оборачивают window.EitiVoice.providers[id]. Ничего не пишет в localStorage.
(function (root) {
    'use strict';
    var STATES = ['idle', 'requesting_mic', 'connecting', 'listening', 'speaking', 'reconnecting', 'stopped', 'error'];
    var ERRORS = ['mic_denied', 'mic_absent', 'mic_busy', 'no_key', 'no_proxy', 'offline', 'socket', 'auth', 'quota', 'timeout', 'unsupported', 'unknown'];
    var RETRIABLE = { socket: 1, timeout: 1, offline: 1 };
    var PROVIDERS = ['grok', 'gemini', 'openai', 'qwen', 'yandex', 'mistral'];
    var ALIASES = { alisa: 'yandex', alice: 'yandex' };
    var CAPS = {
        grok:    { stt: true, tts: true, duplex: true, offline: false, needsKey: true,  needsProxy: false, transport: 'websocket' },
        gemini:  { stt: true, tts: true, duplex: true, offline: false, needsKey: true,  needsProxy: false, transport: 'websocket' },
        openai:  { stt: true, tts: true, duplex: true, offline: false, needsKey: true,  needsProxy: false, transport: 'webrtc' },
        qwen:    { stt: true, tts: true, duplex: true, offline: false, needsKey: false, needsProxy: true,  transport: 'websocket-proxy' },
        yandex:  { stt: true, tts: true, duplex: true, offline: false, needsKey: false, needsProxy: true,  transport: 'websocket-proxy' },
        mistral: { stt: true, tts: true, duplex: false, offline: false, needsKey: true, needsProxy: false, transport: 'http' }
    };
    var MSG = {
        ru: { mic_denied: '🎤 Нет доступа к микрофону — разрешите его в настройках браузера', mic_absent: '🎤 Микрофон не найден',
              mic_busy: '🎤 Микрофон занят другим приложением', no_key: '🔑 Нужен ключ — Настройки → ИИ → Голосовой ассистент',
              no_proxy: '🔌 Нужен прокси (wss://) — Настройки → ИИ → Голосовой ассистент', offline: '📵 Нет сети — голосовой ассистент недоступен, напишите текстом',
              socket: '🔌 Не удалось подключиться', auth: '🔑 Ключ отклонён', quota: '⏳ Лимит запросов исчерпан', timeout: '⏱️ Нет ответа от сервера',
              unsupported: '🎤 Голос не поддерживается в этом браузере', unknown: '❌ Ошибка голоса' },
        en: { mic_denied: '🎤 No microphone access — allow it in the browser settings', mic_absent: '🎤 No microphone found',
              mic_busy: '🎤 The microphone is used by another app', no_key: '🔑 Key needed — Settings → AI → Voice assistant',
              no_proxy: '🔌 Proxy (wss://) needed — Settings → AI → Voice assistant', offline: '📵 No network — the voice assistant is unavailable, please type instead',
              socket: '🔌 Connection failed', auth: '🔑 Key rejected', quota: '⏳ Rate limit reached', timeout: '⏱️ No response from the server',
              unsupported: "🎤 Voice isn't supported in this browser", unknown: '❌ Voice error' },
        de: { mic_denied: '🎤 Kein Mikrofonzugriff – bitte in den Browser-Einstellungen erlauben', mic_absent: '🎤 Kein Mikrofon gefunden',
              mic_busy: '🎤 Das Mikrofon wird von einer anderen App verwendet', no_key: '🔑 Schlüssel nötig – Einstellungen → KI → Sprachassistent',
              no_proxy: '🔌 Proxy (wss://) nötig – Einstellungen → KI → Sprachassistent', offline: '📵 Kein Netz – Sprachassistent nicht verfügbar, bitte tippen',
              socket: '🔌 Verbindung fehlgeschlagen', auth: '🔑 Schlüssel abgelehnt', quota: '⏳ Anfragelimit erreicht', timeout: '⏱️ Keine Antwort vom Server',
              unsupported: '🎤 Sprache wird in diesem Browser nicht unterstützt', unknown: '❌ Sprachfehler' }
    };

    function createCore(env) {
        env = env || {};
        var state = 'idle', provider = '', lastError = null, listeners = {}, history = [];
        function locale() { var l = 'ru'; try { l = (env.locale && env.locale()) || 'ru'; } catch (e) {} return MSG[l] ? l : 'ru'; }
        function message(code, lang) { var d = MSG[lang && MSG[lang] ? lang : locale()]; return d[code] || d.unknown; }
        function emit(ev, data) { (listeners[ev] || []).slice().forEach(function (fn) { try { fn(data); } catch (e) {} }); }
        function on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); return function () { off(ev, fn); }; }
        function off(ev, fn) { var a = listeners[ev] || []; var i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); }
        function setState(s, prov) {
            if (STATES.indexOf(s) < 0) return false;
            if (prov !== undefined) provider = prov || '';
            if (s === 'idle') provider = '';
            var prev = state; state = s;
            history.push(s); if (history.length > 50) history.shift();
            if (prev !== s) emit('state', { state: s, prev: prev, provider: provider });
            return true;
        }
        function classify(e) {
            if (e && typeof e === 'object' && ERRORS.indexOf(e.eitiCode) >= 0) return e.eitiCode;
            var n = String((e && (e.name || e.code)) || ''), m = String((e && e.message) || e || '').toLowerCase();
            if (/NotAllowed|Security|PermissionDenied/i.test(n)) return 'mic_denied';
            if (/NotFound|DevicesNotFound|Overconstrained/i.test(n)) return 'mic_absent';
            if (/NotReadable|TrackStart|AbortError/i.test(n)) return 'mic_busy';
            if (/NotSupported/i.test(n)) return 'unsupported';
            if (/permission|denied|not allowed/.test(m)) return 'mic_denied';
            if (/device not found|no device|requested device/.test(m)) return 'mic_absent';
            if (/in use|could not start/.test(m)) return 'mic_busy';
            if (/not supported/.test(m)) return 'unsupported';
            if (/1007|api key|unauthor|401|403|invalid key|key not valid/.test(m)) return 'auth';
            if (/429|quota|rate limit/.test(m)) return 'quota';
            if (/timeout|timed out/.test(m)) return 'timeout';
            if (/offline|network/.test(m)) return 'offline';
            if (/socket|websocket|connect/.test(m)) return 'socket';
            return 'unknown';
        }
        function makeError(code, prov, cause) {
            code = ERRORS.indexOf(code) >= 0 ? code : 'unknown';
            return { code: code, provider: prov || provider || '', retriable: !!RETRIABLE[code], message: message(code), cause: cause ? String(cause.message || cause) : '' };
        }
        function fail(code, prov, cause) {
            var err = makeError(code, prov, cause);
            lastError = err; setState('error', err.provider);
            emit('error', err);
            return err;
        }
        function requestMic(constraints, prov) {
            var md = env.mediaDevices && env.mediaDevices();
            setState('requesting_mic', prov !== undefined ? prov : provider);
            if (!md || typeof md.getUserMedia !== 'function') {
                var u = fail('unsupported', prov); var ue = new Error(u.message); ue.eitiCode = 'unsupported'; ue.eitiError = u; return Promise.reject(ue);
            }
            return Promise.resolve().then(function () { return md.getUserMedia(constraints || { audio: true }); }).then(function (s) {
                if (state === 'requesting_mic') setState('connecting');
                return s;
            }, function (e) {
                var err = fail(classify(e), prov, e);
                var out = new Error(err.message); out.name = (e && e.name) || 'Error'; out.eitiCode = err.code; out.eitiError = err;
                throw out;
            });
        }
        return { STATES: STATES.slice(), ERRORS: ERRORS.slice(), state: function () { return state; }, provider: function () { return provider; },
                 lastError: function () { return lastError; }, history: function () { return history.slice(); },
                 setState: setState, on: on, off: off, emit: emit, classify: classify, makeError: makeError, fail: fail,
                 message: message, requestMic: requestMic, isRetriable: function (c) { return !!RETRIABLE[c]; } };
    }

    // Адаптер = контракт { id, label, caps, ready(), start(), stop(), mute(), isActive() } поверх реестра index.html
    function makeAdapter(id, getLegacy, env) {
        env = env || {};
        function r() { var L = getLegacy(); return L && L.providers ? L.providers[id] : null; }
        return {
            id: id, caps: CAPS[id],
            label: function () { var L = getLegacy(); return L && L.label ? L.label(id) : id; },
            ready: function () {
                var p = r();
                if (!p || typeof p.hasKey !== 'function') return 'unsupported';
                // ready() is a synchronous preflight, NOT validation of a remote key or quota.
                if (env.online && !env.online()) return 'network';
                if (env.supported && !env.supported(id)) return 'unsupported';
                try { return p.hasKey() ? '' : (p.proxy ? 'proxy' : 'key'); }
                catch (e) { return 'unsupported'; }
            },
            start: function () { var p = r(); return p ? p.start() : undefined; },
            stop: function () { var p = r(); if (p) p.stop(); },
            mute: function () { var p = r(); if (p) p.mute(); },
            isActive: function () { var p = r(); return !!(p && p.isActive()); }
        };
    }


    // Browser-only P1-1 bridge. The core and adapter contract above remain DOM-free.
    function installBrowserUI(win, legacy, api) {
        var closeEvents = {}, previousToast = null, lastOfferAt = 0;
        var timer = typeof win.setTimeout === 'function' ? win.setTimeout.bind(win) : setTimeout;
        var labels = {
            ru: { sw: 'Переключить на', unavailable: 'Голос недоступен', text: 'Продолжить текстом', socket: 'соединение прервано', timeout: 'тайм-аут', auth: 'ключ отклонён', quota: 'лимит исчерпан', offline: 'нет сети', nokey: 'нет ключа', noproxy: 'нет прокси' },
            en: { sw: 'Switch to', unavailable: 'Voice unavailable', text: 'Continue by typing', socket: 'connection failed', timeout: 'timeout', auth: 'key rejected', quota: 'quota exceeded', offline: 'offline', nokey: 'no key', noproxy: 'no proxy' },
            de: { sw: 'Wechseln zu', unavailable: 'Sprachmodus nicht verfügbar', text: 'Per Text fortfahren', socket: 'Verbindung unterbrochen', timeout: 'Zeitüberschreitung', auth: 'Schlüssel abgelehnt', quota: 'Kontingent erschöpft', offline: 'kein Netz', nokey: 'kein Schlüssel', noproxy: 'kein Proxy' }
        };
        function tr(k) {
            var lang = 'ru';
            try { lang = win.eitiGetLocale ? win.eitiGetLocale() : 'ru'; } catch (e) {}
            return (labels[lang] || labels.ru)[k] || labels.ru[k] || k;
        }
        api.presentFallback = function (from, reason) {
            var doc = win.document, opts = api.fallbackOrder(from), to = opts[0] || '';
            if (previousToast && previousToast.parentNode && Date.now() - lastOfferAt < 1000) previousToast.remove();
            lastOfferAt = Date.now();
            var t = doc.createElement('div'), b = doc.createElement('button');
            t.className = 'toast eiti-voice-switch-toast';
            t.style.pointerEvents = 'auto'; t.style.top = '30%';
            t.setAttribute('role', 'status');
            var name = legacy.label ? legacy.label(from) : from;
            t.appendChild(doc.createTextNode('🗣️ ' + name + ': ' + tr(reason) + '. ' + (to ? '' : tr('unavailable') + '. ')));
            b.type = 'button'; b.className = 'eiti-voice-switch-btn';
            b.textContent = to ? tr('sw') + ' ' + (legacy.label ? legacy.label(to) : to) : tr('text');
            b.style.cssText = 'margin-left:6px;padding:6px 10px;border-radius:8px;border:1px solid var(--accent-color,#ffd700);background:transparent;color:inherit;font-weight:700;cursor:pointer;';
            b.onclick = function () {
                if (t.parentNode) t.remove();
                if (to) {
                    // Another provider may be paid: only an explicit click can activate it.
                    if (api.adapters[to].ready() !== '') { if (win.showToast) win.showToast(tr('unavailable')); return; }
                    api.cancelReconnect();
                    if (win.eitiSetVoiceProvider) win.eitiSetVoiceProvider(to);
                    legacy.start(to);
                } else {
                    if (win.openView) win.openView('chat');
                    var field = doc.getElementById('input');
                    if (field && field.focus) field.focus();
                }
            };
            t.appendChild(b); doc.body.appendChild(t); previousToast = t;
            timer(function () { if (t.parentNode) t.remove(); }, 7000);
            return to;
        };
        // Keep the old public signature; replace only the hard-coded Grok/Gemini choice.
        legacy.offerSwitch = function (from, reason) {
            if (!api.adapters[from]) return '';
            if (reason === 'socket' || reason === 'timeout') {
                var detail = closeEvents[from];
                var err = api.lastError();
                if (detail && Date.now() - detail.at < 5000) api.handleDisconnect(from, detail.event);
                else api.handleFailure(from, err && err.provider === from ? err.code : reason);
                return '';
            }
            return api.presentFallback(from, reason || 'socket');
        };
        // A narrowly scoped observer for voice sockets. No credential, payload or provider code is modified.
        // WebSocket error has no useful code; defer to the subsequent close (1008, 429, etc.).
        if (typeof win.WebSocket === 'function' && typeof Proxy === 'function') {
            var NativeWS = win.WebSocket;
            win.WebSocket = new Proxy(NativeWS, { construct: function (Ctor, args) {
                var ws = Reflect.construct(Ctor, args, Ctor), url = String(args[0] || '');
                var id = win._eitiVoiceProv || (legacy.current && legacy.current()) || '';
                var voice = (id === 'grok' && url.indexOf('api.x.ai/v1/realtime') >= 0)
                    || (id === 'gemini' && url.indexOf('generativelanguage.googleapis.com/ws') >= 0)
                    || ((id === 'qwen' || id === 'yandex') && url.indexOf('wss://') === 0 && win._grokVoiceActive);
                if (voice && ws.addEventListener) {
                    ws.addEventListener('error', function (event) {
                        if (event && event.stopImmediatePropagation) event.stopImmediatePropagation();
                    });
                    ws.addEventListener('close', function (event) {
                        var wasActive = !!win._grokVoiceActive && win._eitiVoiceProv === id;
                        closeEvents[id] = { event: { code: event.code, reason: event.reason }, at: Date.now() };
                        if (id === 'grok' && wasActive && event.code !== 1000 && event.code !== 1001) {
                            // Legacy Grok onclose cleans mic but does not emit offerSwitch.
                            timer(function () { if (api.state() === 'idle') api.handleDisconnect(id, event); }, 0);
                        }
                    });
                }
                return ws;
            } });
        }
    }

    function install(win) {
        var legacy = win.EitiVoice;
        var core = createCore({
            locale: function () { return win.eitiGetLocale ? win.eitiGetLocale() : 'ru'; },
            mediaDevices: function () { return win.navigator && win.navigator.mediaDevices; }
        });
        var getLegacy = function () { return legacy; };
        var adapters = {};
        var availability = {
            online: function () { return !win.navigator || win.navigator.onLine !== false; },
            supported: function (id) {
                // Explicitly unavailable browser APIs are blockers; absent properties in Node mocks are unknown.
                var cap = CAPS[id] || {};
                if (cap.transport.indexOf('websocket') === 0 && 'WebSocket' in win && typeof win.WebSocket !== 'function') return false;
                if (id === 'openai' && 'RTCPeerConnection' in win && typeof win.RTCPeerConnection !== 'function') return false;
                if (id === 'mistral' && 'MediaRecorder' in win && typeof win.MediaRecorder !== 'function') return false;
                return true;
            }
        };
        PROVIDERS.forEach(function (id) { adapters[id] = makeAdapter(id, getLegacy, availability); });
        function norm(id) { id = ALIASES[id] || id; return adapters[id] ? id : ''; }
        // One bounded recovery budget per user-started voice session. No persisted retries.
        var reconnectLeft = 2, reconnectId = '';
        var attempts = 0, retryProvider = '', retryTimer = null, retryInFlight = false, finished = false, generation = 0, internalStart = false;
        var schedule = typeof win.setTimeout === 'function' ? win.setTimeout.bind(win) : setTimeout;
        var unschedule = typeof win.clearTimeout === 'function' ? win.clearTimeout.bind(win) : clearTimeout;
        var DELAYS = [1000, 3000];
        function clearRetry() { if (retryTimer !== null) unschedule(retryTimer); retryTimer = null; generation++; }
        function cancelReconnect() {
            clearRetry(); attempts = 0; retryProvider = ''; retryInFlight = false; finished = false;
            reconnectLeft = 2; reconnectId = '';
            return true;
        }
        function reasonFor(code) { return code === 'no_key' ? 'nokey' : code === 'no_proxy' ? 'noproxy' : code; }
        function offer(from, code) {
            // UI calls this directly to avoid recursion through the legacy offerSwitch().
            if (api && typeof api.presentFallback === 'function') api.presentFallback(from, reasonFor(code));
            else if (legacy && typeof legacy.offerSwitch === 'function') legacy.offerSwitch(from, reasonFor(code));
        }
        function errorCode(detail) {
            if (typeof detail === 'string' && ERRORS.indexOf(detail) !== -1) return detail;
            var code = core.classify(detail);
            return code === 'unknown' ? 'socket' : code; // Explicit caller is a transport-failure path.
        }
        function handleFailure(from, detail) {
            from = norm(from);
            if (!from) return { status: 'ignored' };
            // onerror + onclose can report one transport failure twice.
            if (retryTimer !== null && retryProvider === from) return { status: 'already_scheduled', attempt: attempts };
            if (finished && retryProvider === from) return { status: 'exhausted', attempt: attempts };
            if (retryProvider && retryProvider !== from) cancelReconnect();
            retryProvider = from;
            retryInFlight = false;
            var code = errorCode(detail), availabilityCode = adapters[from].ready();
            if (availabilityCode === 'network') code = 'offline';
            if (availabilityCode === 'key') code = 'no_key';
            if (availabilityCode === 'proxy') code = 'no_proxy';
            core.fail(code, from, typeof detail === 'string' ? detail : (detail && detail.message));
            // Only socket/timeout receive retries. In particular, never retry auth, quota, mic or offline.
            if ((code !== 'socket' && code !== 'timeout') || availabilityCode !== '' || attempts >= DELAYS.length) {
                finished = true; offer(from, code);
                return { status: 'fallback', code: code, attempts: attempts };
            }
            var delay = DELAYS[attempts++];
            core.setState('reconnecting', from);
            var token = ++generation;
            retryTimer = schedule(function () {
                if (token !== generation) return;
                retryTimer = null;
                // User changed provider or settings while waiting; never start an obsolete session.
                if (!legacy || typeof legacy.start !== 'function' ||
                    (typeof legacy.current === 'function' && legacy.current() !== from)) {
                    cancelReconnect(); return;
                }
                var nowReady = adapters[from].ready();
                if (nowReady !== '') {
                    handleFailure(from, nowReady === 'network' ? 'offline' : nowReady === 'proxy' ? 'no_proxy' :
                        nowReady === 'key' ? 'no_key' : 'unsupported');
                    return;
                }
                retryInFlight = true;
                internalStart = true;
                try { legacy.start(from); }
                catch (e) { internalStart = false; handleFailure(from, e); return; }
                finally { internalStart = false; }
            }, delay);
            return { status: 'reconnecting', code: code, attempt: attempts, delay: delay };
        }
        function handleDisconnect(from, closeEvent) {
            var ev = closeEvent || {};
            if (ev.code === 1000 || ev.code === 1001) return { status: 'closed' };
            var why = String(ev.reason || '');
            var code = /quota|429|rate limit/i.test(why) || ev.code === 4429 ? 'quota' :
                /auth|permission|key|401|403/i.test(why) || [1007,1008,4001,4003,4401,4403].indexOf(ev.code) !== -1 ? 'auth' :
                /timeout|timed out/i.test(why) ? 'timeout' : 'socket';
            return handleFailure(from, code);
        }
        core.on('state', function (ev) {
            // A deliberate stop leaves idle until the next tick; a failed transport
            // immediately transitions to error/reconnecting instead, preserving its budget.
            if (ev.state === 'idle' && (attempts || retryTimer !== null || finished)) {
                schedule(function () { if (core.state() === 'idle') cancelReconnect(); }, 0);
            }
            // Fresh user start during a queued retry takes precedence.
            if (retryTimer !== null && (ev.state === 'connecting' || ev.state === 'requesting_mic') && !internalStart) {
                cancelReconnect();
            } else if (finished && !retryInFlight && ev.state === 'connecting' && !internalStart) {
                cancelReconnect();
            }
        });
        var api = {
            core: core, adapters: adapters, STATES: core.STATES, ERRORS: core.ERRORS,
            state: core.state, on: core.on, off: core.off, lastError: core.lastError, requestMic: core.requestMic,
            message: core.message,
            caps: function (id) { id = norm(id || (legacy && legacy.current && legacy.current())); var c = CAPS[id]; return c ? JSON.parse(JSON.stringify(c)) : null; },
            // Готовые провайдеры для запасного варианта (порядок реестра, без текущего)
            fallbackOrder: function (from) { from = norm(from); return PROVIDERS.filter(function (id) { return id !== from && adapters[id].ready() === ''; }); },
            fallback: function (from) {
                // Explicit call only; automatic recovery never switches providers or spends their quota.
                var next = api.fallbackOrder(from)[0];
                if (!next || !legacy || typeof legacy.start !== 'function') return '';
                cancelReconnect();
                if (win.eitiSetVoiceProvider) win.eitiSetVoiceProvider(next);
                legacy.start(next); return next;
            },
            handleFailure: handleFailure, handleDisconnect: handleDisconnect, cancelReconnect: cancelReconnect,
            recoveryStatus: function () { return { attempts: attempts, max: DELAYS.length, pending: retryTimer !== null, provider: retryProvider, exhausted: finished }; },
            reconnect: function (id, max) {
                // Retained explicit P0 method: synchronous manual retry; bounded independently of automatic backoff.
                id = norm(id || core.provider() || (legacy && legacy.current && legacy.current()));
                if (!id || !legacy || typeof legacy.start !== 'function' || adapters[id].ready() !== '') return false;
                if (typeof max === 'number' && max <= 0) return false;
                if (id !== reconnectId) { reconnectId = id; reconnectLeft = Math.min(2, typeof max === 'number' ? max : 2); }
                if (reconnectLeft <= 0) return false;
                reconnectLeft--;
                if (adapters[id].isActive()) adapters[id].stop();
                core.setState('reconnecting', id);
                legacy.start(id); return true;
            }
        };
        if (legacy && typeof legacy === 'object') {
            Object.keys(api).forEach(function (k) { if (!(k in legacy)) legacy[k] = api[k]; });
            legacy.version = 1;
            if (win.document && win.document.body) installBrowserUI(win, legacy, api);
        }
        win.EitiVoiceCore = core;
        win.EitiVoiceController = api;
        return api;
    }

    var exp = { createCore: createCore, makeAdapter: makeAdapter, install: install, STATES: STATES, ERRORS: ERRORS, PROVIDERS: PROVIDERS, ALIASES: ALIASES, CAPS: CAPS, MSG: MSG };
    if (typeof module !== 'undefined' && module.exports) module.exports = exp;
    if (root && root.document) { root.EitiVoiceModule = exp; install(root); }
})(typeof window !== 'undefined' ? window : this);
