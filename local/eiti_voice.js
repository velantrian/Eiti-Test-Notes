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
    function makeAdapter(id, getLegacy) {
        function r() { var L = getLegacy(); return L && L.providers ? L.providers[id] : null; }
        return {
            id: id, caps: CAPS[id],
            label: function () { var L = getLegacy(); return L && L.label ? L.label(id) : id; },
            ready: function () { var p = r(); if (!p) return 'unsupported'; if (p.hasKey()) return ''; return p.proxy ? 'proxy' : 'key'; },
            start: function () { var p = r(); return p ? p.start() : undefined; },
            stop: function () { var p = r(); if (p) p.stop(); },
            mute: function () { var p = r(); if (p) p.mute(); },
            isActive: function () { var p = r(); return !!(p && p.isActive()); }
        };
    }

    function install(win) {
        var legacy = win.EitiVoice;
        var core = createCore({
            locale: function () { return win.eitiGetLocale ? win.eitiGetLocale() : 'ru'; },
            mediaDevices: function () { return win.navigator && win.navigator.mediaDevices; }
        });
        var getLegacy = function () { return legacy; };
        var adapters = {};
        PROVIDERS.forEach(function (id) { adapters[id] = makeAdapter(id, getLegacy); });
        function norm(id) { id = ALIASES[id] || id; return adapters[id] ? id : ''; }
        var reconnectLeft = 0;
        var api = {
            core: core, adapters: adapters, STATES: core.STATES, ERRORS: core.ERRORS,
            state: core.state, on: core.on, off: core.off, lastError: core.lastError, requestMic: core.requestMic,
            message: core.message,
            caps: function (id) { id = norm(id || (legacy && legacy.current && legacy.current())); var c = CAPS[id]; return c ? JSON.parse(JSON.stringify(c)) : null; },
            // Готовые провайдеры для запасного варианта (порядок реестра, без текущего)
            fallbackOrder: function (from) { from = norm(from); return PROVIDERS.filter(function (id) { return id !== from && adapters[id].ready() === ''; }); },
            fallback: function (from) {
                var next = api.fallbackOrder(from)[0];
                if (!next) { core.fail('socket', from); return ''; }
                if (win.eitiSetVoiceProvider) win.eitiSetVoiceProvider(next);
                legacy.start(next); return next;
            },
            reconnect: function (id, max) {
                id = norm(id || core.provider() || (legacy && legacy.current && legacy.current()));
                if (!id) return false;
                if (typeof max === 'number') reconnectLeft = max; else if (reconnectLeft <= 0) reconnectLeft = 2;
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
        }
        win.EitiVoiceCore = core;
        win.EitiVoiceController = api;
        return api;
    }

    var exp = { createCore: createCore, makeAdapter: makeAdapter, install: install, STATES: STATES, ERRORS: ERRORS, PROVIDERS: PROVIDERS, ALIASES: ALIASES, CAPS: CAPS, MSG: MSG };
    if (typeof module !== 'undefined' && module.exports) module.exports = exp;
    if (root && root.document) { root.EitiVoiceModule = exp; install(root); }
})(typeof window !== 'undefined' ? window : this);
