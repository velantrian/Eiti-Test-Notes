/* EITI Action Gate — единый шлюз для управляющих тегов из ответа модели.
 * propose → validate → authorize → commit → acknowledge
 *
 * Вывод модели сам по себе НЕ является разрешением. Теги делятся на классы
 * (см. POLICY и docs/ARCHITECTURE.md §«Шлюз AI-действий»):
 *   read    — только показ (KB_LIST, MOSC_SHOW, NOTE_SEARCH…): проходят как раньше;
 *   low     — аддитивные/обратимые записи (MEM_ADD, NOTE_APPEND, TASK_ADD, REMIND…):
 *             прежняя политика (v13.9 guard: лимиты, цитаты, журнал, undo);
 *   confirm — удаления, правки, инструкции, KB, обновление памяти: нужна карточка
 *             подтверждения, КРОМЕ случая, когда последнее сообщение пользователя
 *             явно просило ровно это действие (глагол + объект + селектор);
 *   bulk    — массовые операции (KB_CLEAR, MOSC_CLEAR, MEM_DEL:all, SET_INSTR:CLEAR/REPLACE):
 *             подтверждение ВСЕГДА.
 * Валидация отклоняет пустые и несовпавшие селекторы — промах никогда не превращается
 * в массовое удаление. Журнал отклонённых/запрещённых действий — в IndexedDB (memkv),
 * не в localStorage. Ядро без DOM: тестируется в Node.
 */
(function (root, factory) {
    var M = factory();
    if (typeof module === 'object' && module.exports) module.exports = M;
    if (root && typeof root === 'object') {
        root.EitiActionGateCore = M;
        if (root.document && typeof root.addEventListener === 'function') M.installBrowser(root);
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
    'use strict';

    var V = { DEL: /(удал|сотр[иё]|стер|стир|забуд|убер|убрать|очист|delete|remove|erase|forget|clear|wipe|lösch|entfern|vergiss|leere)/i,
              EDIT: /(обнов|измен|исправ|замен|отредакт|переимен|перепиш|update|change|edit|rename|fix|replace|correct|rewrite|änder|aktualisier|umbenenn|bearbeit|ersetz|korrigier)/i,
              ADD: /(созда|добав|запиш|сохран|запомн|внеси|занеси|create|add|save|write|remember|store|erstell|hinzufüg|speicher|schreib|merk)/i,
              SET: /(установ|поставь|задай|смени|включи|set|switch|use|stell|setz|wechsl)/i };
    var O = { MEM: /(памят|memory|speicher|gedächtnis|запис|eiti)/i,
              KB: /(\bkb\b|баз[аеуы] знаний|knowledge|wissensbasis|факт|fact|fakt)/i,
              INSTR: /(инструкц|instruction|anweisung|prompt|промпт|правил)/i,
              NOTE: /(заметк|note|notiz)/i,
              FILE: /(файл|file|datei)/i,
              MOSC: /(mosc|граф|graph|связ|edge|интент|intent|паттерн|pattern|absicht|muster)/i,
              TASK: /(задач|таск|task|aufgabe|доск|board)/i,
              PROFILE: /(профил|profile|profil|меня зовут|my name|ich heiße|mein name)/i };
    var ALL = /^(all|все|всё|any|\*|alle|alles)$/i;

    // type → { risk, verb, obj, sel: индекс аргумента-селектора (должен встретиться в сообщении пользователя) }
    var POLICY = {
        NOTE_SUMMARY: { risk: 'read' }, NOTE_SEARCH: { risk: 'read' }, KB_LIST: { risk: 'read' }, MOSC_SHOW: { risk: 'read' }, EITI_READ: { risk: 'read' },
        JS_EXEC: { risk: 'read', note: 'own confirm (sandbox iframe)' },
        MEM_ADD: { risk: 'low' }, NOTE_APPEND: { risk: 'low' }, TASK_ADD: { risk: 'low' }, TASK_MOVE: { risk: 'low' }, TASK_UPDATE: { risk: 'low' },
        REMIND: { risk: 'low' }, EITI_LEARN: { risk: 'low' }, PKG: { risk: 'low' }, PKG_E: { risk: 'low' }, MOSC_ADD: { risk: 'low' }, MOSC_SET: { risk: 'low' },
        FL_SET: { risk: 'low' }, SET_THEME: { risk: 'low' }, SET_DESIGN: { risk: 'low' }, SET_WALLPAPER: { risk: 'low' },
        MEM_UPDATE: { risk: 'confirm', verb: 'EDIT', obj: 'MEM' },
        MEM_DEL: { risk: 'confirm', verb: 'DEL', obj: 'MEM', sel: 'any' },
        KB_ADD: { risk: 'confirm', verb: 'ADD', obj: 'KB' },
        KB_ADD_JSON: { risk: 'confirm', verb: 'ADD', obj: 'KB' },
        KB_EDIT: { risk: 'confirm', verb: 'EDIT', obj: 'KB', sel: 0 },
        KB_DEL: { risk: 'confirm', verb: 'DEL', obj: 'KB', sel: 0 },
        KB_CLEAR: { risk: 'bulk' }, MOSC_CLEAR: { risk: 'bulk' },
        SET_INSTR: { risk: 'confirm', verb: 'SET|EDIT|ADD', obj: 'INSTR' },
        SET_PROFILE: { risk: 'confirm', verb: 'SET|EDIT|ADD', obj: 'PROFILE' },
        NOTE_WRITE: { risk: 'confirm', verb: 'ADD|EDIT', obj: 'NOTE' },
        NOTE_RETITLE: { risk: 'confirm', verb: 'EDIT', obj: 'NOTE', sel: 0 },
        NOTE_DELETE: { risk: 'confirm', verb: 'DEL', obj: 'NOTE', sel: 0 },
        FILE_DELETE: { risk: 'confirm', verb: 'DEL', obj: 'FILE', sel: 0 },
        FILE_RENAME: { risk: 'confirm', verb: 'EDIT', obj: 'FILE', sel: 0 },
        FILE_EDIT: { risk: 'confirm', verb: 'EDIT|ADD', obj: 'FILE', sel: 0 },
        FACT_RETRACT: { risk: 'confirm', verb: 'DEL|EDIT', obj: 'KB' },
        MOSC_DEL: { risk: 'confirm', verb: 'DEL', obj: 'MOSC', sel: 0 },
        MOSC_DEL_EDGE: { risk: 'confirm', verb: 'DEL', obj: 'MOSC', sel: 0 },
        MOSC_INTENT: { risk: 'confirm', verb: 'ADD', obj: 'MOSC' },
        NEW_INTENT: { risk: 'confirm', verb: 'ADD', obj: 'MOSC' },
        VB_ADD: { risk: 'confirm', verb: 'ADD', obj: 'MOSC' },
        TASK_DEL: { risk: 'confirm', verb: 'DEL', obj: 'TASK' }
    };

    // Парсинг: все [TYPE] / [TYPE:body] и блок [KB_ADD_JSON]…[/KB_ADD_JSON]. JS_EXEC не трогаем (у него свой confirm).
    function parse(reply) {
        var out = [];
        if (!reply || typeof reply !== 'string') return out;
        var reJson = /\[KB_ADD_JSON\]([\s\S]*?)\[\/KB_ADD_JSON\]/g, m;
        while ((m = reJson.exec(reply)) !== null) out.push({ type: 'KB_ADD_JSON', body: m[1].trim(), args: [m[1].trim()], raw: m[0], index: m.index });
        var re = /\[([A-Z][A-Z_]{2,})(?::([^\]]*))?\]/g;
        while ((m = re.exec(reply)) !== null) {
            var type = m[1];
            if (type === 'KB_ADD_JSON' || type === 'JS_EXEC' || !POLICY[type]) continue;
            var body = m[2] == null ? null : m[2];
            out.push({ type: type, body: body, args: body == null ? [] : body.split('|').map(function (s) { return s.trim(); }), raw: m[0], index: m.index });
        }
        return out.sort(function (a, b) { return a.index - b.index; });
    }

    function riskOf(a) {
        var p = POLICY[a.type]; if (!p) return 'unknown';
        if (a.type === 'MEM_DEL' && a.args.length && ALL.test(a.args[0] || '') && !(a.args[1] || '')) return 'bulk';
        if (a.type === 'SET_INSTR' && /^(CLEAR|REPLACE)\b/i.test(a.body || '')) return 'bulk';
        return p.risk;
    }

    // Статическая валидация (без данных). Возвращает { ok, reason }.
    function validate(a) {
        var p = POLICY[a.type];
        if (!p) return { ok: false, reason: 'unknown_tag' };
        var r = p.risk; if (r === 'read' || r === 'low') return { ok: true };
        var A = a.args, nonEmpty = function (i) { return !!(A[i] && A[i].trim()); };
        switch (a.type) {
            case 'MEM_DEL':
                if (!A.length || (!nonEmpty(0) && !nonEmpty(1))) return { ok: false, reason: 'empty_selector' };
                if (nonEmpty(1) && ALL.test(A[1].trim())) return { ok: false, reason: 'wildcard_selector' };
                if (nonEmpty(1) && A[1].trim().length < 2) return { ok: false, reason: 'selector_too_short' };
                return { ok: true };
            case 'MEM_UPDATE': return nonEmpty(A.length - 1) ? { ok: true } : { ok: false, reason: 'empty_value' };
            case 'KB_CLEAR': case 'MOSC_CLEAR': return { ok: true };
            case 'KB_ADD_JSON':
                try { var j = JSON.parse(a.body); return Array.isArray(j) && j.length ? { ok: true } : { ok: false, reason: 'invalid' }; }
                catch (e) { return { ok: false, reason: 'invalid' }; }
            case 'KB_ADD': return (A.length >= 3 && nonEmpty(1) && nonEmpty(2)) ? { ok: true } : { ok: false, reason: 'invalid' };
            case 'SET_INSTR':
                if (/^CLEAR$/i.test((a.body || '').trim())) return { ok: true };
                return (a.body || '').replace(/^REPLACE:/i, '').trim() ? { ok: true } : { ok: false, reason: 'empty_value' };
            case 'NOTE_WRITE': case 'KB_EDIT': case 'NOTE_RETITLE': case 'FILE_RENAME': case 'SET_PROFILE': case 'MOSC_DEL_EDGE':
                if (!nonEmpty(0)) return { ok: false, reason: 'empty_selector' };
                return nonEmpty(1) ? { ok: true } : { ok: false, reason: 'empty_value' };
            case 'FILE_EDIT': return nonEmpty(0) ? { ok: true } : { ok: false, reason: 'empty_selector' };
            default:
                if (!nonEmpty(0)) return { ok: false, reason: 'empty_selector' };
                if (p.sel === 0 && ALL.test(A[0].trim())) return { ok: false, reason: 'wildcard_selector' };
                return { ok: true };
        }
    }

    // Явно ли последнее сообщение пользователя просило ровно это действие?
    function userAsked(a, lastUserText) {
        var p = POLICY[a.type], u = String(lastUserText || '');
        if (!p || !u || riskOf(a) === 'bulk') return false;
        var verbs = (p.verb || '').split('|'), vOk = verbs.some(function (v) { return V[v] && V[v].test(u); });
        if (!vOk || !O[p.obj] || !O[p.obj].test(u)) return false;
        if (p.sel === undefined) return true;
        var low = u.toLowerCase();
        var sels = p.sel === 'any' ? a.args.filter(Boolean) : [a.args[p.sel]];
        return sels.some(function (s) { return s && s.trim().length >= 2 && low.indexOf(s.trim().toLowerCase()) >= 0; });
    }

    // authorize: pass | auto | confirm | reject
    function decide(a, ctx) {
        var r = riskOf(a);
        if (r === 'read' || r === 'low') return { decision: 'pass' };
        var v = validate(a);
        if (!v.ok) return { decision: 'reject', reason: v.reason };
        if (r === 'bulk') return { decision: 'confirm', reason: 'bulk' };
        return userAsked(a, ctx && ctx.lastUserText) ? { decision: 'auto', reason: 'user_asked' } : { decision: 'confirm', reason: 'needs_consent' };
    }

    var I18N = {
        ru: { title: '🛡 EITI просит подтверждения', ok: 'Подтвердить', no: 'Отклонить', done: '✅ Выполнено', denied: '⛔ Отклонено — данные не изменены',
              failed: '❌ Не удалось выполнить — данные не изменены', nomatch: '⚠️ Ничего не найдено — ничего не удалено', rejected: '🛡 Отклонено небезопасное действие AI' },
        en: { title: '🛡 EITI asks for confirmation', ok: 'Confirm', no: 'Deny', done: '✅ Done', denied: '⛔ Denied — data unchanged',
              failed: '❌ Could not complete — data unchanged', nomatch: '⚠️ Nothing matched — nothing deleted', rejected: '🛡 Unsafe AI action rejected' },
        de: { title: '🛡 EITI bittet um Bestätigung', ok: 'Bestätigen', no: 'Ablehnen', done: '✅ Erledigt', denied: '⛔ Abgelehnt — Daten unverändert',
              failed: '❌ Fehlgeschlagen — Daten unverändert', nomatch: '⚠️ Kein Treffer — nichts gelöscht', rejected: '🛡 Unsichere KI-Aktion abgelehnt' }
    };
    var LABELS = {
        ru: { MEM_DEL: 'Удалить из личной памяти', MEM_UPDATE: 'Перезаписать запись памяти', KB_ADD: 'Добавить факт в KB', KB_ADD_JSON: 'Добавить факты в KB',
              KB_EDIT: 'Изменить факт KB', KB_DEL: 'Удалить факт KB', KB_CLEAR: 'Очистить всю KB', MOSC_CLEAR: 'Очистить граф MOSC', SET_INSTR: 'Изменить инструкции',
              SET_PROFILE: 'Изменить профиль', NOTE_WRITE: 'Создать или перезаписать заметку', NOTE_RETITLE: 'Переименовать заметку', NOTE_DELETE: 'Удалить заметку',
              FILE_DELETE: 'Удалить файл', FILE_RENAME: 'Переименовать файл', FILE_EDIT: 'Перезаписать файл', FACT_RETRACT: 'Отозвать факт', MOSC_DEL: 'Удалить из графа MOSC',
              MOSC_DEL_EDGE: 'Удалить связь MOSC', MOSC_INTENT: 'Добавить интент', NEW_INTENT: 'Добавить интент', VB_ADD: 'Добавить голосовой паттерн', TASK_DEL: 'Удалить задачу' },
        en: { MEM_DEL: 'Delete from personal memory', MEM_UPDATE: 'Overwrite memory entry', KB_ADD: 'Add a KB fact', KB_ADD_JSON: 'Add KB facts', KB_EDIT: 'Edit a KB fact',
              KB_DEL: 'Delete a KB fact', KB_CLEAR: 'Clear the whole KB', MOSC_CLEAR: 'Clear the MOSC graph', SET_INSTR: 'Change instructions', SET_PROFILE: 'Change profile',
              NOTE_WRITE: 'Create or overwrite a note', NOTE_RETITLE: 'Rename a note', NOTE_DELETE: 'Delete a note', FILE_DELETE: 'Delete a file', FILE_RENAME: 'Rename a file',
              FILE_EDIT: 'Overwrite a file', FACT_RETRACT: 'Retract a fact', MOSC_DEL: 'Delete from MOSC graph', MOSC_DEL_EDGE: 'Delete a MOSC edge', MOSC_INTENT: 'Add an intent',
              NEW_INTENT: 'Add an intent', VB_ADD: 'Add a voice pattern', TASK_DEL: 'Delete a task' },
        de: { MEM_DEL: 'Aus dem persönlichen Speicher löschen', MEM_UPDATE: 'Speichereintrag überschreiben', KB_ADD: 'KB-Fakt hinzufügen', KB_ADD_JSON: 'KB-Fakten hinzufügen',
              KB_EDIT: 'KB-Fakt ändern', KB_DEL: 'KB-Fakt löschen', KB_CLEAR: 'Gesamte KB leeren', MOSC_CLEAR: 'MOSC-Graph leeren', SET_INSTR: 'Anweisungen ändern',
              SET_PROFILE: 'Profil ändern', NOTE_WRITE: 'Notiz erstellen oder überschreiben', NOTE_RETITLE: 'Notiz umbenennen', NOTE_DELETE: 'Notiz löschen', FILE_DELETE: 'Datei löschen',
              FILE_RENAME: 'Datei umbenennen', FILE_EDIT: 'Datei überschreiben', FACT_RETRACT: 'Fakt widerrufen', MOSC_DEL: 'Aus dem MOSC-Graphen löschen',
              MOSC_DEL_EDGE: 'MOSC-Kante löschen', MOSC_INTENT: 'Intent hinzufügen', NEW_INTENT: 'Intent hinzufügen', VB_ADD: 'Sprachmuster hinzufügen', TASK_DEL: 'Aufgabe löschen' }
    };
    function msg(loc, key) { return (I18N[loc] || I18N.ru)[key] || I18N.ru[key]; }
    function label(loc, type) { return (LABELS[loc] || LABELS.ru)[type] || LABELS.ru[type] || type; }

    // ── Шлюз: ядро без DOM. Адаптеры: resolve(a)→Promise<число совпадений|null>, commit(a)→Promise, confirm(a)→Promise<bool>, log(entry)
    function createGate(opt) {
        opt = opt || {};
        var now = opt.now || function () { return Date.now(); };
        var seen = {}, logBuf = [], bypass = 0, pending = {}, seq = 0;
        function log(e) {
            e.ts = now(); logBuf.push(e); if (logBuf.length > 200) logBuf.splice(0, logBuf.length - 200);
            try { opt.log && opt.log(e, logBuf.slice()); } catch (x) {}
        }
        function resolveCount(a) { try { return Promise.resolve(opt.resolve ? opt.resolve(a) : null); } catch (e) { return Promise.resolve(null); } }
        function commit(a) {
            bypass++;
            var p;
            try { p = Promise.resolve(opt.commit ? opt.commit(a) : null); } catch (e) { p = Promise.reject(e); }
            finally { bypass--; }
            return p;
        }
        // propose → validate → authorize → commit → acknowledge
        function run(a, d) {
            return resolveCount(a).then(function (n) {
                if (n === 0) { log({ type: a.type, raw: a.raw.slice(0, 120), decision: 'rejected', reason: 'no_match' }); opt.notify && opt.notify('nomatch', a); return 'rejected'; }
                var auth = d.decision === 'auto' ? Promise.resolve(true) : Promise.resolve(opt.confirm ? opt.confirm(a, d) : false);
                return auth.then(function (yes) {
                    if (!yes) { log({ type: a.type, raw: a.raw.slice(0, 120), decision: 'denied', reason: d.reason }); return 'denied'; }
                    return commit(a).then(function () {
                        log({ type: a.type, raw: a.raw.slice(0, 120), decision: 'committed', reason: d.decision === 'auto' ? 'user_asked' : 'confirmed' });
                        opt.ack && opt.ack(a, d);
                        return 'committed';
                    }, function (err) {
                        log({ type: a.type, raw: a.raw.slice(0, 120), decision: 'failed', reason: String(err && err.message || err).slice(0, 80) });
                        opt.notify && opt.notify('failed', a);
                        return 'failed';
                    });
                });
            });
        }
        // Синхронно: вырезает гейтируемые теги из ответа и ставит их в очередь. Возвращает { text, results: Promise[] }.
        function intercept(reply, ctx) {
            if (bypass > 0 || !reply || typeof reply !== 'string') return { text: reply, results: [] };
            var acts = parse(reply), text = reply, results = [], t = now();
            Object.keys(seen).forEach(function (k) { if (t - seen[k] > 15000) delete seen[k]; });
            acts.forEach(function (a) {
                var d = decide(a, ctx || {});
                if (d.decision === 'pass') return;
                text = text.split(a.raw).join('');
                if (seen[a.raw]) return; // тот же ответ пришёл второй раз (стрим + финал)
                seen[a.raw] = t;
                if (d.decision === 'reject') {
                    log({ type: a.type, raw: a.raw.slice(0, 120), decision: 'rejected', reason: d.reason });
                    opt.notify && opt.notify('rejected', a);
                    results.push(Promise.resolve('rejected'));
                    return;
                }
                a.id = 'ag_' + t.toString(36) + '_' + (seq++);
                pending[a.id] = a;
                results.push(run(a, d).then(function (r) { delete pending[a.id]; return r; }));
            });
            return { text: text, results: results };
        }
        return { intercept: intercept, log: function () { return logBuf.slice(); }, pending: function () { return Object.keys(pending).map(function (k) { return pending[k]; }); },
                 isBypassed: function () { return bypass > 0; }, _setLog: function (l) { if (Array.isArray(l)) logBuf = l.slice(-200); } };
    }

    // ── Браузерный адаптер ─────────────────────────────────────────────────
    function installBrowser(w) {
        if (w.EitiActionGate) return w.EitiActionGate;
        var LOG_KEY = 'eiti_action_gate_log';
        function loc() { try { var l = w.eitiGetLocale && w.eitiGetLocale(); return /^(en|de)/.test(l || '') ? l.slice(0, 2) : 'ru'; } catch (e) { return 'ru'; } }
        function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
        function toast(t) { try { if (typeof w.showToast === 'function') w.showToast(t, 3000); } catch (e) {} }
        function lastUser() {
            try { var cl = w.chatLog || (typeof chatLog !== 'undefined' ? chatLog : null) || []; // eslint-disable-line no-undef
                for (var i = cl.length - 1; i >= 0; i--) if (cl[i] && cl[i].role === 'user') return cl[i].text || cl[i].content || '';
            } catch (e) {}
            return '';
        }
        var timer = null;
        function persist(e, all) { // IndexedDB-first: memkv store, без роста localStorage
            clearTimeout(timer);
            timer = setTimeout(function () {
                try { var db = w.eitiDb; if (!db || !db.objectStoreNames.contains('memkv')) return;
                    db.transaction(['memkv'], 'readwrite').objectStore('memkv').put({ k: LOG_KEY, v: all, updatedAt: Date.now() }); } catch (x) {}
            }, 200);
        }
        function g(name) { try { return w[name] || (0, eval)('typeof ' + name + "==='function'?" + name + ':undefined'); } catch (e) { return undefined; } }
        function lc(s) { return String(s || '').trim().toLowerCase(); }
        function resolve(a) {
            var A = a.args;
            try {
                switch (a.type) {
                    case 'MEM_DEL': {
                        var memLoad = g('memLoadAsync'); if (!memLoad) return null;
                        var tag = lc(A[0]), txt = lc(A[1]);
                        return memLoad().then(function (es) { es = es || [];
                            if (ALL.test(tag) && !txt) return es.length;
                            return es.filter(function (e) { return (tag && lc(e.tag) === tag) || (txt && lc(e.text).indexOf(txt) >= 0); }).length; });
                    }
                    case 'KB_EDIT': case 'KB_DEL': {
                        var kbl = g('eitiKBLoad'); if (!kbl) return null; var t = lc(A[0]);
                        return (kbl() || []).filter(function (f) { return lc(f.id) === t || (f.triggers || []).some(function (x) { return lc(x) === t; }); }).length;
                    }
                    case 'NOTE_DELETE': case 'NOTE_RETITLE': {
                        var nl = g('notesLoad'); if (!nl) return null; var n = lc(A[0]);
                        return (nl() || []).filter(function (x) { return lc(x.title) === n; }).length;
                    }
                    case 'FILE_DELETE': case 'FILE_RENAME': case 'FILE_EDIT': {
                        var c = null; try { c = (0, eval)('typeof _idbFilesCache!=="undefined"?_idbFilesCache:null'); } catch (e) {}
                        if (!c) return null; var fnm = lc(A[0]);
                        return c.filter(function (f) { return lc(f.name) === fnm; }).length;
                    }
                    case 'MOSC_DEL': case 'MOSC_DEL_EDGE': {
                        var gr = w._moscGraph; if (!gr) return null; var wd = lc(A[0]);
                        if (!gr[wd]) return 0; if (a.type === 'MOSC_DEL_EDGE') return gr[wd][A[1]] !== undefined ? 1 : 0; return 1;
                    }
                }
            } catch (e) {}
            return null; // неизвестно — не блокируем, обработчик сам проверит
        }
        function commit(a) {
            w._eitiMemOps = [];
            var pc = w.eitiProcessCommands;
            if (typeof pc !== 'function') throw new Error('no processor');
            pc(a.raw);
            var ops = w._eitiMemOps || []; w._eitiMemOps = null;
            return Promise.all(ops);
        }
        function card(a, d) {
            return new Promise(function (res) {
                var msgs = w.document.getElementById('messages');
                if (!msgs) { res(false); return; }
                var L = loc(), el = w.document.createElement('div');
                el.className = 'eiti-action-card';
                el.setAttribute('data-gate-id', a.id); el.setAttribute('data-gate-type', a.type);
                el.style.cssText = 'margin:6px 12px 10px;padding:10px 12px;border:1.5px solid var(--accent-color,#ffd700);border-radius:12px;background:rgba(255,215,0,0.06);font-size:13px;';
                var shown = a.type === 'KB_ADD_JSON' ? (a.body || '').slice(0, 160) : (a.body == null ? '' : a.body.slice(0, 240));
                el.innerHTML = '<div style="font-weight:700;margin-bottom:4px;" data-i18n="' + esc(I18N.ru.title) + '">' + esc(msg(L, 'title')) + '</div>' +
                    '<div class="eiti-action-what" data-i18n="' + esc(label('ru', a.type)) + '">' + esc(label(L, a.type)) + '</div>' +
                    '<div class="eiti-action-args" style="opacity:.8;margin:4px 0 8px;word-break:break-word;"><code>' + esc(a.type) + '</code> ' + esc(shown) + '</div>' +
                    '<div style="display:flex;gap:8px;"><button type="button" class="eiti-action-ok" data-i18n="' + esc(I18N.ru.ok) + '">' + esc(msg(L, 'ok')) + '</button>' +
                    '<button type="button" class="eiti-action-no" data-i18n="' + esc(I18N.ru.no) + '">' + esc(msg(L, 'no')) + '</button></div>' +
                    '<div class="eiti-action-status" style="margin-top:6px;"></div>';
                msgs.appendChild(el); msgs.scrollTop = msgs.scrollHeight;
                function done(yes) {
                    el.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
                    if (!yes) { var s = el.querySelector('.eiti-action-status'); s.setAttribute('data-i18n', I18N.ru.denied); s.textContent = msg(L, 'denied'); el.setAttribute('data-gate-state', 'denied'); }
                    res(yes);
                }
                el.querySelector('.eiti-action-ok').onclick = function () { done(true); };
                el.querySelector('.eiti-action-no').onclick = function () { done(false); };
            });
        }
        function setStatus(a, key) {
            try { var el = w.document.querySelector('.eiti-action-card[data-gate-id="' + a.id + '"]'); if (!el) return;
                var s = el.querySelector('.eiti-action-status'); s.setAttribute('data-i18n', I18N.ru[key]); s.textContent = msg(loc(), key); el.setAttribute('data-gate-state', key); } catch (e) {}
        }
        var gate = createGate({
            resolve: resolve, commit: commit, confirm: card, log: persist,
            ack: function (a, d) { if (d.decision !== 'auto') setStatus(a, 'done'); },
            notify: function (kind, a) { if (kind === 'failed') setStatus(a, 'failed'); toast(msg(loc(), kind)); }
        });
        var api = {
            intercept: function (reply) { return gate.intercept(reply, { lastUserText: lastUser() }); },
            filter: function (reply) { return gate.intercept(reply, { lastUserText: lastUser() }).text; },
            log: gate.log, pending: gate.pending, isBypassed: gate.isBypassed, core: { parse: parse, validate: validate, decide: decide, userAsked: userAsked, POLICY: POLICY }
        };
        w.EitiActionGate = api;
        // i18n для data-i18n (RU-ключ → EN/DE)
        try {
            if (w.EITI_I18N && w.EITI_I18N.addDict) ['en', 'de'].forEach(function (l) {
                var d = {}; Object.keys(I18N.ru).forEach(function (k) { d[I18N.ru[k]] = I18N[l][k]; });
                Object.keys(LABELS.ru).forEach(function (k) { d[LABELS.ru[k]] = LABELS[l][k]; });
                w.EITI_I18N.addDict(l, d);
            });
        } catch (e) {}
        // подтягиваем журнал из IDB, когда база готова
        (function boot(n) {
            try { var db = w.eitiDb;
                if (db && db.objectStoreNames.contains('memkv')) {
                    var rq = db.transaction(['memkv'], 'readonly').objectStore('memkv').get(LOG_KEY);
                    rq.onsuccess = function () { if (rq.result && Array.isArray(rq.result.v)) gate._setLog(rq.result.v.concat(gate.log())); };
                    return;
                }
            } catch (e) {}
            if (n < 40) setTimeout(function () { boot(n + 1); }, 500);
        })(0);
        return api;
    }

    return { POLICY: POLICY, parse: parse, validate: validate, riskOf: riskOf, userAsked: userAsked, decide: decide, createGate: createGate, installBrowser: installBrowser, I18N: I18N, LABELS: LABELS };
});
