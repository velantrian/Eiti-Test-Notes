# L3 Memory Contract — inventory (audit-only)

> **Audit-only, no runtime changes.** This document, `data/memory_record_v1.schema.json` and the
> tests listed below describe the *current* behaviour of every personal-memory (L3) and KB path in
> `index.html` (line numbers = `main` @ f539c21). Nothing here is wired into the app yet.

## 1. Read / write paths

| # | Path | Where (index.html) | Reads | Writes | Notes / gaps |
|---|------|--------------------|-------|--------|--------------|
| 1 | **IDB `l3`** (keyPath `id`) | store created ~18375 | `eitiL3GetAll` 21111, `_l3LoadCache` 33802, `eitiL3BuildContext` 21149 (profile block in prompt) | `_l3Save(key,value,label,source)` 21093, `eitiL3Delete` 21124 | One record per **category key** (`name`, `city`, `goal`…). Record = `{id,label,value,source,ts}` — no status, confidence, expiry, history. |
| 2 | **L3 auto-extract** | `eitiL3AutoExtract` 21133, regexes `_l3Patterns` 21078; called on **every** user message at 29757 | user text | IDB `l3` via `_l3Save`, toast «🧠 L3 запомнил» | No negation / «не запоминай» / «ещё не решил» handling; correction = silent overwrite. |
| 3 | **IDB `kb`** | store ~18354; `eitiKBLoadAsync` 25306 (migrates legacy `eiti_kb_v1` from localStorage, then removes it), `eitiKBLoad` 25349 (sync cache or `EITI_KB_DEFAULTS`) | cache | `eitiKBSaveAsync` 25354 / `eitiKBSave` 25378 (put-only; clear only when empty) + SQL `kb_idx` mirror | Facts carry `epistemic_state`, `confidence`, `memory_layer`. |
| 4 | **localStorage compat profile** `eiti_user_profile_v1` | key 16952; `eitiSaveProfile` ~16976, `eitiGetProfile` ~17001 | prompt / settings | settings form | Synced to Drive as a *setting* (see 8). |
| 5 | **`eitiLearnFact`** → `eiti_learned_v1` | key 31683, fn 35325; fed by `[EITI_LEARN:…]` in AI replies (~31323) | localStorage | localStorage; cap 200, evicted → `eiti_learned_archive_v1` (keeps last 500) 35359; `eitiQueueIndexDoc` | `JSON.parse` in try/catch → **corrupted JSON = silent no-op** (test). Ids `fact_<Date.now()>` can collide. Contradictions are appended, not superseded. |
| 6 | **Strict Memory** | flag `eiti_strict_memory_mode` 4202/4206, UI ~9472; enforced flow wrapper ~51736–51893 | allowed facts from retrieval | trace / audit log | Only answers from facts passing the Truth Gate. |
| 7 | **Truth Gate / L3 promotion** | `EITI_ALLOWED_STATES` 45887, `EITI_CONF_FLOOR`=0.35 45889, `EITI_RETENTION_FLOOR`=0.20 45890; `eitiTruthGate` 45896; `eitiPromoteToL3` 45922; `eitiPendingApprove/Reject` 45974/45989 via `eitiESMTransition` ~46357 | KB facts | KB + SQL `kb_idx`, `audit_log` (`eitiLogEvent` 45682) | **Promotion limits** = state ∈ {Supported, Validated} + evidence for Supported + gate (avg confidence ≥ 0.35). No count/rate limit. `EITI_RETENTION_FLOOR` is defined but not used by the gate. Backfill at ~46716 demotes non-validated `L3` rows to `L1`. Applies to **KB only** — IDB `l3` and `eiti_learned_v1` bypass the gate entirely. |
| 8 | **Drive sync** | `SYNC_STORES` 47412 = notes, chats, messages, files, kb, l2, journal, contexts; settings = all localStorage keys ~47640 minus `SECRET_RE` (local/eiti_drive_sync.js:18) | — | — | **IDB `l3` is NOT synced.** `eiti_user_profile_v1`, `eiti_learned_v1`, `eiti_learned_archive_v1` **are** synced as plain settings (whole-value LWW). |
| 9 | **Archive export / import** | `eitiArchiveExport` 35614, `eitiArchiveImport` 35659 | profile, learned, l2digests, notes, aiFiles, `kb` (localStorage `eiti_kb_v3`), `idbL3`, `idbKB`, mosc, theme, uiSettings | import writes back | `exported` timestamp → not byte-identical across runs; `kb` reads a legacy key that is empty today (real KB = `idbKB`). Export in the first seconds after boot differs because KB packs are still being written. |
| 10 | Storage UI | 40724 (`'L3 compatibility'` = profile + learned), IDB `l3` count ~40814 | — | — | — |

## 2. localStorage usage (measured, Chromium, `l3_audit_contract.spec.js`)

Size = 2 bytes × (key + value) UTF‑16.

| Scenario | Keys | Total | Largest |
|----------|------|-------|---------|
| Clean profile after boot | 31 | **≈1.6 KB** | `velantrim_messenger_ui_v1` 144 B |
| Heavy memory (200 learned + 500 archived + 4 KB profile) | — | **≈344 KB** ⚠ | `eiti_learned_archive_v1` ≈231 KB, `eiti_learned_v1` ≈104 KB, `eiti_user_profile_v1` ≈8 KB |

**Synchronous reads before `load`: 53 keys** (flags/UI prefs, `eiti_locale`, `theme`, provider/model ids, Drive token metadata, `eiti_kb`/`eiti_kb_v1` legacy-migration probes, `eiti_user_intents_v1`, `eiti_vb_patterns`, `eiti_retrieval_cfg`…). `eiti_user_profile_v1` / `eiti_learned_v1` are **not** read at startup (read lazily), but they are parsed on the prompt path and uploaded by Drive sync.

Flagged as too large for localStorage: `eiti_learned_v1` (up to 200 facts), `eiti_learned_archive_v1` (up to 500), `eiti_user_profile_v1` (free text), any notes/caches (`eiti_vb_patterns`, `eiti_user_intents_v1` grow with use).

## 3. Contract rules (proposal — `data/memory_record_v1.schema.json`)

* **IndexedDB is the primary store for all memory/data.** localStorage holds only small essentials (flags, last-selected IDs, tiny pointers); **budget < 100 KB total, target < 50 KB**. No MemoryRecord in localStorage.
* Personal memory (`l3`) and KB (`kb`) stay **physically separate** object stores but share one record shape and one rule set (Truth Gate, ESM states).
* Every record has `source`, `epistemic_status`, `confidence`, `salience`, `freshness` (`expires_at`/`ttl_days`), `do_not_store`, `correction_history[]`.
* «Не запоминай» → tombstone `do_not_store=true`, empty value, blocks re-extraction. «Я ещё не решил» → `Tentative`, never injected as a fact. Correction → old value moved into `correction_history`.

## 4. Regression tests (document CURRENT behaviour)

| Case | Test | Current behaviour |
|------|------|-------------------|
| «не запоминай» | e2e `l3_audit_contract.spec.js`, node `l3_memory_contract.test.js` | **fixed v14.14.0**: nothing written (L3 + learned facts) |
| «я ещё не решил» | both | **fixed v14.14.0**: not stored as a fact |
| Correcting an old fact | both | L3: overwritten, no history; learned: appended next to old |
| Corrupted compat JSON | node | `eitiLearnFact` silently stores nothing (KNOWN GAP, `test.todo` for desired) |
| Export byte-identical | e2e | identical after normalising `exported`, once KB is quiescent |
| localStorage size at startup | e2e | clean < 100 KB; heavy memory > 100 KB (KNOWN GAP) |
| Schema validity | pytest `test_memory_record_schema.py` | — |

## 5. Safe migration path (not implemented)

1. **Freeze format** — keep these tests green; add the export round-trip as the golden check.
2. **Read-adapter** — `eitiMemoryGet/Put` façade returning MemoryRecord v1 over the existing stores (no writes changed). Bump `EITI_VERSION` once, consistently (AGENTS.md).
3. **Dual-write** to new IDB stores `memory_personal` / keep `kb`, while still writing the old keys; verify parity in the background.
4. **Copy, don't move** `eiti_learned_v1`, `eiti_learned_archive_v1`, `eiti_user_profile_v1`, IDB `l3` → IDB with `source.type="migration"`; on corrupted JSON copy the raw string to a quarantine record instead of dropping it. Mark done with a tiny localStorage pointer (`eiti_mem_migrated_v1=1`).
5. **Switch reads** to IDB; old localStorage keys become read-only backups for one release, then removed (archive export still includes them). Target: localStorage < 50 KB.
6. **Add semantics**: do-not-store tombstones, `Tentative`, correction history, route L3 auto-extract + `[EITI_LEARN]` through the Truth Gate; add `l3`/`memory_personal` to Drive `SYNC_STORES` and drop the large keys from settings sync.
7. Each step: export before/after must be equal modulo new fields; rollback = re-import the pre-step archive.
