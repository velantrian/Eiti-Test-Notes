# E2E smoke tests for the EITI PWA

Playwright smoke tests for the single-file app (`index.html`). They verify the
app **boots and runs** — title, no fatal runtime errors, onboarding bypass,
IndexedDB/localStorage availability, and that the SQLite-WASM asset loads.
They complement the pure-logic unit tests in `../tests_js/` (which can't catch
"the whole app is broken").

## Why this lives in its own folder

The app itself must stay a single file with **no root-level `package.json`**
(see `AGENTS.md`). All browser-test tooling is therefore isolated here so the
repo root stays clean; `node_modules/` and reports are git-ignored.

## Running locally

```sh
cd velantrim_core/e2e
npm install
npx playwright install chromium
npm test
```

The Playwright config starts a static server (`python3 -m http.server`) over
`http://` automatically — Service Workers refuse to run from `file://`.
