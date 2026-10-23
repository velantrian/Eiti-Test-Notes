# AGENTS.md

## Cursor Cloud specific instructions

### Overview

VELANTRIM EITI is a fully client-side PWA (Progressive Web App) whose application UI/runtime is a single monolithic `index.html` file (~3.8 MB, v14.9.0). There is **no application build step, backend, or external database**. The app uses browser-native storage (IndexedDB, localStorage), companion SQLite WASM assets (`sql-wasm.js` / `sql-wasm.wasm`), and CDN libraries for optional document/sanitization features.

### Running the app

Serve the repository root with any static HTTP server. Service Workers require `http://` or `https://` (not `file://`).

```
python3 -m http.server 8080 --directory .
```

Then open `http://localhost:8080/index.html` in Chrome.

### Repository

**GitHub Pages:** https://velantrian.github.io/velantrim-eiti/
**Repo:** https://github.com/velantrian/velantrim-eiti

### Key files

| File | Purpose |
|---|---|
| `index.html` | The entire application (HTML + CSS + JS monolith) |
| `sql-wasm.js` / `sql-wasm.wasm` | SQLite WASM engine for FTS5 search |
| `sw.js` | Service Worker for offline/PWA caching |
| `manifest.json` | PWA manifest |

### Gotchas

- **Single-file architecture is sacred.** All HTML, CSS, and JS lives in `index.html`. Do NOT split into modules, components, or separate files unless explicitly asked.
- **`offline/` (v14.0.0) is the one sanctioned exception:** the offline-dialog engine (`offline/eiti_offline_dialogs.js`), its core data (`offline/core.json`) and lazy packs (`offline/packs/*.json`) are data-like assets loaded on demand by `EitiOffline` in `index.html` and cached by `sw.js` in `eiti-offline-*`. Their tests live in `velantrim_core/tests_js/offline/` and run via `offline_dialogs.test.js`.
- **`kb/` (v14.1.0) follows the same pattern:** the general-knowledge library engine (`kb/eiti_kb.js`), its manifest (`kb/index.json`, format v2), per-domain index shards (`kb/idx/*.json`) and answer packs (`kb/packs/kb_<dom>[_<part>].json`) are built from `kb/src/*.txt`. `kb/src/w_*.txt` are generated from Wikidata (CC0) by `kb/gen/gen_kb.py` (needs network; cache `kb/gen/cache/` is gitignored), and should be regenerated rather than edited by `python3 kb/build_kb.py` (never edit the JSON by hand), loaded lazily by `EitiKBHost` in `index.html` and cached by `sw.js` in `eiti-offline-*`. Tests: `velantrim_core/tests_js/kb_lib.test.js` (held-out sets `kb/tests/heldout.txt`, `kb/tests/heldout_wide.txt`), `velantrim_core/tests/test_v1410.py`, `velantrim_core/e2e/v1410_kb.spec.js`. **v14.3.0:** `kb/gen/gen_more.py` adds 27 more generated sections (space, dinosaurs, myths, athletes, airports, … ~29k entries total; deterministic dedupe order `ORDER`, prefixed-only triggers for homonyms); generated shards are written in compact format v3 (`px` prefixes, `~N` trigger shorthand, implied pack part `floor(i/pp)`), expanded by `shardRows` in `eiti_kb.js`; generated hits need prec ≥ 0.75 to be confident. Test: `velantrim_core/tests/test_v1430.py`.
- **`local/` (v14.2.0):** `local/eiti_local.js` is the offline "EITI Local" engine (safe calculator with Russian number words + intents over the user's notes/files). Plain UMD, no build step, no eval; `EitiLocalHost` in `index.html` runs it first in `eitiIntentRouter` (offline mode) and as the outermost wrapper of `EitiOffline.replyText` (no key / no network). Cached by `sw.js` CORE. Tests: `velantrim_core/tests_js/local_intel.test.js`, `velantrim_core/tests/test_v1420.py`, `velantrim_core/e2e/v1420_local.spec.js`.
- **`local/eiti_drive_sync.js` (v14.7.0):** pure Google Drive sync merge engine (per-item last-write-wins by id/`updatedAt`, tombstones, settings per key, secrets never synced). Loaded lazily by the Drive block in `index.html` (GIS token client, scope `drive.file`, file `EITI/eiti_backup.json`, shared client ID constant `EITI_GOOGLE_CLIENT_ID`). Tests: `velantrim_core/tests_js/drive_sync.test.js`, `velantrim_core/tests/test_v1470.py`, `velantrim_core/e2e/v1470_drive.spec.js` (Google endpoints mocked).
- **`local/eiti_journal.js` (v14.9.0):** pure journal (diary/RNE) engine — one IDB record per item in store `journal` (indexes chatId/contextId/kind/updatedAt), topics in `contexts`, meta `journal_meta` in `reasoning`; hash dedup per chat, `del:1` tombstones, idempotent migration from the legacy blob `eiti_rne_data_v1` (kept as `eiti_rne_data_v1_bak`), compatibility view in the old `_rneData` shape (`EitiJournal.view`/`forAI`, `window.eitiRNEGet`). DB `eiti_v4` is v17. Both stores are in Drive `SYNC_STORES`. Voice providers live in the `window.EitiVoice` registry (grok|gemini). Tests: `velantrim_core/tests_js/journal.test.js`, `velantrim_core/tests/test_v1490.py`, `velantrim_core/e2e/v1490_journal_voice.spec.js`.
- **PWA limits:** see `docs/PWA_LIMITS.md` (what the PWA cannot do vs a native app) — keep it in sync when adding platform-dependent features.
- **No root application build system.** Test/tooling dependencies already exist under `velantrim_core/e2e/package.json` and `velantrim_core/requirements.txt`. Do not add a root package manager or application build pipeline unless explicitly requested.
- **Surgical edits only.** Make minimal targeted changes. Never rewrite or restructure unless explicitly requested.
- **Version consistency.** `EITI_VERSION` in `index.html`, `CACHE`/`SW_UPDATED` in `sw.js`, `description` in `manifest.json`, and the README version badge must always match.
- AI chat features (DeepSeek, Gemini, Grok, OpenRouter) require external API keys configured in the app's Settings tab. The DuckDuckGo AI provider works without an API key.
- The app stores all data in the browser (IndexedDB ~500 MB, localStorage ~5 MB, SQLite WASM for derived search indexes (FTS5 when compiled in; otherwise LIKE/IndexedDB fallback)). There are no external databases.
- L3 data is not yet consolidated: extracted profile facts live in IndexedDB store `l3`; epistemically gated KB facts use IndexedDB store `kb` with `memory_layer: "L3"`; the active compatibility profile/learned-fact source remains in localStorage keys `eiti_user_profile_v1` and `eiti_learned_v1` and contributes to system context. Do not treat these stores as interchangeable or remove/migrate legacy keys without an explicit migration plan.
- Automatic L1 chat-archive lookup is opt-in (off by default); explicit chat-history requests still search the archive. L2 digests and other memory sources are independent of this setting. Service Worker checks use `updateViaCache: none` and refresh promptly.
- When testing, the first load shows an onboarding wizard that must be completed before accessing the main interface.
- Service Workers require `http://` or `https://` (not `file://`).
