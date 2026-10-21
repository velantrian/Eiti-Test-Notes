# JS unit tests for `index.html`

These tests cover the **pure logic** inside the single-file PWA (`index.html`)
— fractal-memory weighting, salience scoring, and the semantic-search math —
without a browser and without any npm dependency.

## Why a harness instead of importing

`index.html` is a single-file app and must stay that way (see `AGENTS.md`).
So we never modify or split it. Instead `harness.js` reads the file, slices out
individual top-level functions **by name**, and runs them in an isolated Node
`vm` sandbox. Extraction relies on the monolith's consistent formatting: every
top-level function is indented 8 spaces and its closing brace sits alone at the
same indent.

## Running

Requires Node ≥ 18 (CI uses 22). No install step:

```sh
node --test velantrim_core/tests_js/*.test.js
```

## Coverage today (P0)

| Suite | Function / contract | What it protects |
|---|---|---|
| `salience.test.js` | `eitiCalcSalience` | memory importance scoring |
| `cosine.test.js` | `_cosineSim` | semantic-search similarity metric |
| `decay.test.js` | `_pkgApplyDecayAll` | fractal-memory weight decay |
| `embed_offline.test.js` | `_embedOffline` | offline embedding contract |
| `ranking.test.js` | `tfScore` | local-search term-frequency scoring |
| `parse_commands.test.js` | `eitiTaskParseAICommands` | parsing `[TASK_*]` directives from LLM replies |
| `sprint3_memory_response_contract.test.js` | Sprint 3 memory/response contract | Normal/Grounded/Strict modes, memory lookup toggle, ESM statuses, response patterns |
| `memory_lookup.test.js` | Archive lookup gate | Off-by-default behavior, explicit requests, and opt-in automatic lookup |
| `notes_ai.test.js` | Notes AI Ask AI | Settings persistence, OFF hides control / no request, chosen model in request |
| `notes_ai_hl.test.js` | Notes AI highlight/export | Word diff, undo/redo pair, filename sanitize, md/txt export |

Notes pinned by these tests: the `eitiCalcSalience` 4.0 cap is currently
unreachable (max multiplier is 2.73), and `_cosineSim` degrades to `0` on a
length mismatch rather than leaking `NaN`.
