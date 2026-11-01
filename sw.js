// VELANTRIM EITI — Service Worker v14.16.2
// Fixes: LAZY_FILES await race, cross-origin CDN cache, updatefound wiring, SWR for data/*.json
// Sync: CACHE + SW_UPDATED now match EITI_VERSION 14.16.2

var CACHE = 'eiti-v14.16.2'; // v14.16.2: подробные офлайн-объяснения KB; v14.16.0: шлюз AI-действий + EITI Care (кризис, регионы); v14.15.2: «📱 Экран телефона»; v14.15.1: «Меньше иконки (small icons)»; v14.15.0: офлайн-интенты (новые слоты, составные реплики, Doweria); v14.14.0: EITI Frames + карточки понятий + Википедия без ключа; v14.13.1: EitiVoice P1-1; v14.13.0: «Похожие / Рассуждение» (local/eiti_related.js); v14.12.0: голосовые ассистенты OpenAI/Qwen/Алиса/Mistral, Mistral AI в чате; v14.11.0: голосовой набор 🎤, ассистент в «+»; v14.10.0: калькулятор EN/DE, поиск KB, перевод UI; v14.9.0: дневник journal + выбор голоса; v14.8.0: опечатки; v14.7.0: Drive-автосинхронизация; v14.5.0: память диалога + размер чата; v14.4.0: офлайн-ответы RU/EN/DE; v14.3.0: KB ~29k статей; v14.2.0: EITI Local (калькулятор, вопросы о своих данных); v14.1.0: библиотека знаний KB (+ v14.0.0 офлайн-диалоги, сказки)
// v14.0.0: офлайн-движок и пакеты (offline/**) — отдельный кеш без лимита 24 записей (≈30 файлов),
// cache-first + фоновое обновление; не попадает в swTrimCache.
var OFFLINE_CACHE = 'eiti-offline-v14.16.2';
var CACHE_MAX_ENTRIES = 24;
var BASE = self.location.pathname.replace(/sw\.js$/, '');

// Критическое ядро — без них app не запустится
var CORE = [
    BASE,
    BASE + 'index.html',
    BASE + 'manifest.json',
    BASE + 'offline/eiti_offline_de.js', // v14.4.0: немецкий слой офлайн-диалогов
    BASE + 'local/eiti_local.js', // v14.2.0: локальный калькулятор/ответы по своим данным — нужен офлайн с первого запуска
    BASE + 'local/eiti_dstate.js', // v14.5.0: память диалога (слоты, стек тем, отсылки)
    BASE + 'local/eiti_journal.js', // v14.9.0: движок дневника (записи, дедуп, миграция)
    BASE + 'local/eiti_action_gate.js', // P0: шлюз AI-действий (propose→validate→authorize→commit→ack)
    BASE + 'local/eiti_voice.js', // EitiVoice P0: единый голосовой контроллер EitiVoice (состояния, ошибки, адаптеры)
    BASE + 'local/eiti_related.js', // v14.13.0: «Похожие / Рассуждение» (похожие заметки, карточки, настройки)
    BASE + 'local/eiti_typo.js', // v14.8.0: опечатки (нормализация + нечёткое сопоставление)
    BASE + 'local/eiti_typo_vocab.json', // v14.8.0: словарь опечаток (грузится лениво при первом офлайн-запросе)
    BASE + 'local/eiti_frames.js', // v14.14.0: EITI Frames — офлайн-понимание формулировок («расскажи / поясни / а зачем?»)
    BASE + 'local/eiti_care.js', // v14.14.0 intents+: EITI Care — кризис (112 + телефон доверия) и поддержка, первым в офлайн-цепочке
    BASE + 'local/eiti_frames.json', // v14.14.0: пакет фреймов (правится без кода; грузится лениво при первом офлайн-запросе)
    BASE + 'offline_manifest.json', // v14.14.0: хеши пакетов базы на момент установки — сверка для «🔄 Обновить базу офлайн-ответов»
    BASE + 'icon-192.png',
    BASE + 'icon-192-maskable.png',
    BASE + 'icon-512.png',
    BASE + 'icon-512-maskable.png'
];

// Тяжёлые файлы — кешируем в той же install цепочке, но не блокируем
var HEAVY = [
    BASE + 'sql-wasm.js',
    BASE + 'sql-wasm.wasm'
];

// Данные KB — будут кешироваться по stale-while-revalidate при первом обращении
// (загружаются fetch()-ом, не script-тегом, поэтому не нужны в CORE)

// ── INSTALL ─────────────────────────────────────────────────────────────────
self.addEventListener('install', function(e) {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE).then(function(cache) {
            return cache.addAll(CORE).then(function() {
                // FIX v13: ВОЗВРАЩАЕМ промис — дожидаемся HEAVY, не fire-and-forget
                return cache.addAll(HEAVY).catch(function(err) {
                    // Non-fatal: slow connection / wasm ещё не загружен
                    console.warn('[SW] heavy cache skip (non-fatal):', err);
                });
            }).catch(function(err) {
                console.warn('[SW] critical cache error:', err);
                return self.clients.matchAll().then(function(clients) {
                    clients.forEach(function(c) {
                        c.postMessage({ type: 'SW_CACHE_ERROR', error: String(err) });
                    });
                    // Reject installation: an incomplete CORE cache must not look healthy.
                    throw err;
                });
            });
        })
    );
});

// ── ACTIVATE ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', function(e) {
    e.waitUntil(
        caches.keys().then(function(keys) {
            var old = keys.filter(function(k) { return k !== CACHE && k !== OFFLINE_CACHE; });
            var isUpdate = old.length > 0;
            return Promise.all(old.map(function(k) { return caches.delete(k); }))
                .then(function() { return self.clients.claim(); })
                .then(function() {
                    if (!isUpdate) return; // v12.9.79: не отправляем при первой установке
                    return caches.open(CACHE).then(function(cache) {
                        return swTrimCache(cache);
                    }).then(function() {
                    return self.clients.matchAll().then(function(clients) {
                        clients.forEach(function(c) {
                            c.postMessage({ type: 'SW_UPDATED', version: '14.16.2' });
                        });
                    });
                    });
                });
        })
    );
});

function swIsAllowlisted(url) {
    var path = url.pathname || '';
    if (path === BASE || path === BASE + 'index.html') return true;
    if (path === BASE + 'manifest.json') return true;
    if (path === BASE + 'sql-wasm.js' || path === BASE + 'sql-wasm.wasm') return true;
    if (/icon-.*\.png$/.test(path)) return true;
    if (/\/(data|kb)\/[^/]+\.json$/i.test(path)
        || path.endsWith('_kb_v3.json')
        || path.endsWith('lemma.json')
        || path.endsWith('mosc_graph_v3.json')) return true;
    return false;
}
function swTrimCache(cache) {
    return cache.keys().then(function(keys) {
        if (!keys || keys.length <= CACHE_MAX_ENTRIES) return;
        var extra = keys.length - CACHE_MAX_ENTRIES;
        return Promise.all(keys.slice(0, extra).map(function(k) { return cache.delete(k); }));
    });
}

// ── Stale-While-Revalidate helper ─────────────────────────────────────────────
function swr(req) {
    return caches.open(CACHE).then(function(cache) {
        return cache.match(req).then(function(cached) {
            var fresh = fetch(req).then(function(r) {
                if (r && r.ok) {
                    return cache.put(req, r.clone()).then(function() { return r; })
                        .catch(function() { return r; });
                }
                return r;
            }).catch(function() { return cached; });
            return cached || fresh;
        });
    });
}

// ── FETCH ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', function(e) {
    if (e.request.method !== 'GET') return;

    var url = new URL(e.request.url);
    var sameOrigin = url.origin === self.location.origin;

    // v13.4.0 P0 #2: DOMPurify — cache-first (offline-first XSS protection)
    if (!sameOrigin && /cdnjs\.cloudflare\.com\/ajax\/libs\/dompurify\//.test(url.href)) {
        e.respondWith(
            caches.match(e.request).then(function(cached) {
                if (cached) return cached;
                return fetch(e.request).then(function(resp) {
                    if (resp && (resp.status === 200 || resp.type === 'opaque')) {
                        var clone = resp.clone();
                        return caches.open(CACHE)
                            .then(function(c) { return c.put(e.request, clone); })
                            .then(function() { return resp; })
                            .catch(function() { return resp; });
                    }
                    return resp;
                });
            })
        );
        return;
    }

    // Пропускаем API-запросы (DeepSeek, Gemini, OpenRouter, xAI и т.д.)
    if (!sameOrigin) return;
    if (!url.pathname.startsWith(BASE)) return;

    // HTML — network-first (чтобы всегда получать свежий index.html)
    var accept = e.request.headers.get('accept') || '';
    if (accept.indexOf('text/html') !== -1) {
        e.respondWith(
            fetch(e.request).then(function(resp) {
                var clone = resp.clone();
                return caches.open(CACHE)
                    .then(function(c) { return c.put(e.request, clone); })
                    .then(function() { return resp; })
                    .catch(function() { return resp; });
            }).catch(function() {
                return caches.match(e.request).then(function(m) {
                    return m || caches.match(BASE + 'index.html');
                });
            })
        );
        return;
    }

    // v14.1.0: offline/ (движок + core.json + packs/*.json) — SWR в OFFLINE_CACHE (лениво, по первому запросу)
    if ((url.pathname.indexOf(BASE + 'offline/') === 0 || url.pathname.indexOf(BASE + 'kb/') === 0) && /\.(js|json)$/.test(url.pathname)) {
        e.respondWith(caches.open(OFFLINE_CACHE).then(function(cache) {
            return cache.match(e.request).then(function(cached) {
                var fresh = fetch(e.request).then(function(r) {
                    if (r && r.ok) return cache.put(e.request, r.clone()).then(function() { return r; }).catch(function() { return r; });
                    return r;
                }).catch(function() { return cached; });
                return cached || fresh;
            });
        }));
        return;
    }

    // data/*.json — stale-while-revalidate (KB, lemma, mosc — обновляются автономно)
    if (/\/(data|kb)\/[^/]+\.json$/i.test(url.pathname)
        || url.pathname.endsWith('_kb_v3.json')
        || url.pathname.endsWith('lemma.json')
        || url.pathname.endsWith('mosc_graph_v3.json')) {
        e.respondWith(swr(e.request));
        return;
    }

    // Allowlist CORE+HEAVY+data — cache-first. Остальное network-only, без раздувания кеша.
    if (!swIsAllowlisted(url)) {
        e.respondWith(fetch(e.request).catch(function() { return caches.match(e.request); }));
        return;
    }
    e.respondWith(
        caches.match(e.request).then(function(cached) {
            if (cached) return cached;
            return fetch(e.request).then(function(resp) {
                if (resp && resp.status === 200) {
                    var clone = resp.clone();
                    return caches.open(CACHE)
                        .then(function(c) { return c.put(e.request, clone).then(function() { return swTrimCache(c); }); })
                        .then(function() { return resp; })
                        .catch(function() { return resp; });
                }
                return resp;
            });
        })
    );
});

// ── MESSAGE ───────────────────────────────────────────────────────────────────
self.addEventListener('message', function(e) {
    if (!e.data) return;
    if (e.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (e.data.type === 'SHOW_NOTIFICATION') {
        e.waitUntil(
            self.registration.showNotification(
                e.data.title || '🔔 VELANTRIM EITI',
                {
                    body: e.data.body || '',
                    icon: BASE + 'icon-192.png',
                    badge: BASE + 'icon-192-maskable.png'
                }
            ).catch(function(err) {
                console.warn('[SW] notification failed:', err);
            })
        );
    }
});
