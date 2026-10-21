# AGENTS.md

## Cursor Cloud specific instructions

### Overview

VELANTRIM EITI is a fully client-side PWA (Progressive Web App) whose application UI/runtime is a single monolithic `index.html` file (~3.8 MB, v13.7.20). There is **no application build step, backend, or external database**. The app uses browser-native storage (IndexedDB, localStorage), companion SQLite WASM assets (`sql-wasm.js` / `sql-wasm.wasm`), and CDN libraries for optional document/sanitization features.

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
- **No root application build system.** Test/tooling dependencies already exist under `velantrim_core/e2e/package.json` and `velantrim_core/requirements.txt`. Do not add a root package manager or application build pipeline unless explicitly requested.
- **Surgical edits only.** Make minimal targeted changes. Never rewrite or restructure unless explicitly requested.
- **Version consistency.** `EITI_VERSION` in `index.html`, `CACHE`/`SW_UPDATED` in `sw.js`, `description` in `manifest.json`, and the README version badge must always match.
- AI chat features (DeepSeek, Gemini, Grok, OpenRouter) require external API keys configured in the app's Settings tab. The DuckDuckGo AI provider works without an API key.
- The app stores all data in the browser (IndexedDB ~500 MB, localStorage ~5 MB, SQLite WASM for derived search indexes (FTS5 when compiled in; otherwise LIKE/IndexedDB fallback)). There are no external databases.
- L3 data is not yet consolidated: extracted profile facts live in IndexedDB store `l3`; epistemically gated KB facts use IndexedDB store `kb` with `memory_layer: "L3"`; the active compatibility profile/learned-fact source remains in localStorage keys `eiti_user_profile_v1` and `eiti_learned_v1` and contributes to system context. Do not treat these stores as interchangeable or remove/migrate legacy keys without an explicit migration plan.
- Automatic L1 chat-archive lookup is opt-in (off by default); explicit chat-history requests still search the archive. L2 digests and other memory sources are independent of this setting. Service Worker checks use `updateViaCache: none` and refresh promptly.
- When testing, the first load shows an onboarding wizard that must be completed before accessing the main interface.
- Service Workers require `http://` or `https://` (not `file://`).
