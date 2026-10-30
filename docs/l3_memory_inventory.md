# L3 Memory Contract — current runtime inventory (2026-10-27)

> **Runtime status:** This file inventories implemented behavior at `main` commit `4b28f8d31dc51f5dc17d6b0da98bee2afe04f1c8` after merge of PR #46. The separate schema `data/memory_record_v1.schema.json` is aspirational unless explicitly identified as implemented. Code line numbers below may refer to the historical audit snapshot; prefer symbol names for navigation.

## 1. Read / write paths

| # | Path | Where (index.html) | Reads | Writes | Notes / gaps |
|---|------|--------------------|-------|--------|--------------|
| 1 | **IDB `l3`** (keyPath `id`) | store created ~18375 | `eitiL3GetAll` 21111, `_l3LoadCache` 33802, `eitiL3BuildContext` 21149 (profile block in prompt) | `_l3Save(key,value,label,source)` 21093, `eitiL3Delete` 21124 | One record per **category key** (`name`, `city`, `goal`…). Record = `{id,label,value,source,ts,correction_history?}` after v14.15.0; no unified epistemic status, confidence, expiry. A failed write requeues to RAM-only `_l3Pending`. |
| 2 | **L3 auto-extract** | `eitiL3AutoExtract` 21133, regexes `_l3Patterns` 21078; called on **every** user message at 29757 | user text | IDB `l3` via `_l3Save`, toast «🧠 L3 запомнил» | `eitiMemIntent` skips «не запоминай» and tentative «я ещё не решил»; corrections keep up to 20 prior values in `correction_history`. On the combined Draft branch, the success toast and `_l3Last` are set only on the matching IDB transaction's `oncomplete`; an attempted or RAM-queued write is not acknowledged as committed. |
| 3 | **IDB `kb`** | store ~18354; `eitiKBLoadAsync` 25306 (migrates legacy `eiti_kb_v1` from localStorage, then removes it), `eitiKBLoad` 25349 (sync cache or `EITI_KB_DEFAULTS`) | cache | `eitiKBSaveAsync` 25354 / `eitiKBSave` 25378 (put-only; clear only when empty) + SQL `kb_idx` mirror | Facts carry `epistemic_state`, `confidence`, `memory_layer`. |
| 4 | **localStorage compat profile** `eiti_user_profile_v1` | key 16952; `eitiSaveProfile` ~16976, `eitiGetProfile` ~17001 | prompt / settings | settings form | Synced to Drive as a *setting* (see 8). |
| 5 | **`eitiLearnFact`** → `eiti_learned_v1` | key 31683, fn 35325; fed by `[EITI_LEARN:…]` in AI replies (~31323) | localStorage | IDB `memkv` (`learned`/`archive`) after guarded localStorage migration; compatibility fallback exists; cap 200, archive 500 35359; `eitiQueueIndexDoc` | Corrupt legacy JSON is quarantined before replacement; rejected quarantine blocks overwrite. IDs include uniqueness suffix; contradictions can supersede previous learned facts. `memkv` asynchronous write failures still require independent durability review. |
| 6 | **Strict Memory** | flag `eiti_strict_memory_mode` 4202/4206, UI ~9472; enforced flow wrapper ~51736–51893 | allowed facts from retrieval | trace / audit log | Only answers from facts passing the Truth Gate. |
| 7 | **Truth Gate / L3 promotion** | `EITI_ALLOWED_STATES` 45887, `EITI_CONF_FLOOR`=0.35 45889, `EITI_RETENTION_FLOOR`=0.20 45890; `eitiTruthGate` 45896; `eitiPromoteToL3` 45922; `eitiPendingApprove/Reject` 45974/45989 via `eitiESMTransition` ~46357 | KB facts | KB + SQL `kb_idx`, `audit_log` (`eitiLogEvent` 45682) | **Promotion limits** = state ∈ {Supported, Validated} + evidence for Supported + gate (avg confidence ≥ 0.35). No count/rate limit. `EITI_RETENTION_FLOOR` is defined but not used by the gate. Backfill at ~46716 demotes non-validated `L3` rows to `L1`. Applies to **KB only** — IDB `l3` and `eiti_learned_v1` bypass the gate entirely. |
| 8 | **Drive sync** | `SYNC_STORES` 47412 = notes, chats, messages, files, kb, l2, journal, contexts; settings = all localStorage keys ~47640 minus `SECRET_RE` (local/eiti_drive_sync.js:18) | — | — | **IDB `l3` is NOT synced.** `eiti_user_profile_v1`, `memkv` **is** in `SYNC_STORES` after v14.15.0; legacy localStorage settings may persist briefly during migration. Do not add `l3` or pending-write journal to sync implicitly. |
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
| «не запоминай» | e2e `l3_audit_contract.spec.js`, node `l3_memory_contract.test.js` | **fixed v14.14.0**: new skip instruction does not add L3/learned facts (not a durable revocation of previously queued writes) |
| «я ещё не решил» | both | **fixed v14.14.0**: not stored as a fact |
| Correcting an old fact | both | L3: active record replaced with prior value in `correction_history`; learned: supersession metadata and historical value retained |
| Corrupted compat JSON | node | Quarantine before overwrite, backup failure blocks destructive replacement (regression tests implemented) |
| Export byte-identical | e2e | identical after normalising `exported`, once KB is quiescent |
| localStorage size at startup | e2e | clean < 100 KB; heavy memory migrates to IDB `memkv`; legacy keys retained for one successful boot |
| Schema validity | pytest `test_memory_record_schema.py` | — |

## 5. Historical migration proposal (partially implemented; NOT a current migration checklist)

1. **Freeze format** — keep these tests green; add the export round-trip as the golden check.
2. **Read-adapter** — `eitiMemoryGet/Put` façade returning MemoryRecord v1 over the existing stores (no writes changed). Bump `EITI_VERSION` once, consistently (AGENTS.md).
3. **Dual-write** to new IDB stores `memory_personal` / keep `kb`, while still writing the old keys; verify parity in the background.
4. **Copy, don't move** `eiti_learned_v1`, `eiti_learned_archive_v1`, `eiti_user_profile_v1`, IDB `l3` → IDB with `source.type="migration"`; on corrupted JSON copy the raw string to a quarantine record instead of dropping it. Mark done with a tiny localStorage pointer (`eiti_mem_migrated_v1=1`).
5. **Switch reads** to IDB; old localStorage keys become read-only backups for one release, then removed (archive export still includes them). Target: localStorage < 50 KB.
6. **Historical proposal, not authorization**: add semantics (do-not-store tombstones, `Tentative`, correction history, route L3 auto-extract + `[EITI_LEARN]` through the Truth Gate). The old proposal to add `l3`/`memory_personal` to Drive `SYNC_STORES` is **not approved**; do not implement L3 or pending-outbox sync without a separate owner decision.
7. Each step: export before/after must be equal modulo new fields; rollback = re-import the pre-step archive.


## 6. L3 durability boundary after PR #46 (verified source audit, 2026-10-27)

- Current `_l3Save` writes with a readwrite `l3` transaction. Only `tx.oncomplete` proves the fact was committed and updates `_l3Cache`.
- The synchronous exception handler and `tx.onerror` / `tx.onabort` append raw fact arguments to the page-local `_l3Pending` array. They warn the user, but do not persist this queue.
- `eitiL3FlushPending` empties the array and retries when called during DB initialization or after another successful L3 transaction. There is no durable outbox, boot replay, tab-close recovery, automatic retry timer, or service-worker recovery contract.
- A failed transaction followed by page reload/tab close before a successful flush loses the RAM-pending fact. The historical optimistic `L3 запомнил` toast has been fixed on this combined branch; a warning that a fact is waiting for retry is **not** a durable-delivery receipt. The loss is a **KNOWN GAP**.
- ~~`eitiL3Delete(key)` deletes an IDB record but does not cancel matching pending entries: a later flush may resurrect a deleted value. Also, `_l3Last` is set at write attempt time rather than commit completion.~~ **Addressed provisionally by PR #57 (combined branch):** deletion bumps a per-key RAM revision and cancels queued/in-flight writes before the IDB delete, and resolves `true` only after `tx.oncomplete`; `_l3Last` and the success toast move to transaction completion. The RAM-only reload/tab-close loss below is **not** addressed.
- `velantrim_core/e2e/l3_pending_durability.spec.js` includes the positive control (committed write survives reload) and negative reproductions (synchronous transaction failure + tab close, asynchronous abort + reload) plus a privacy control for skip/tentative inputs. Negative tests document **current unsafe behavior**, NOT the desired contract. The former deletion-resurrection reproduction is inverted on the combined branch and now asserts `null` (deleted fact stays deleted after flush and reload).
- Test execution on an actual browser, other browser engines, storage pressure / quota, tab kill and origin eviction are separate empirical checks. CI from PR #46 did **not** establish crash-proof persistence.
- **Policy decision pending:** persisting failed personal-memory facts in localStorage/IDB adds another retained copy, which must have purpose limitation, consent, expiration, deletion/revocation, private export rules and no new Drive sync. Do not implement persistent queue until approved. Minimum non-policy fix is to move success toast/_l3Last to transaction completion, avoid optimistic acknowledgements, and ensure deletion invalidates pending writes.
- Proposed choices: (A) no new retention, clear volatile pending on reload and state explicitly that failed writes were not saved; (B) consented, local-only limited TTL outbox with explicit restore/discard UI and idempotent replay; (C) durable-first atomic staging in the existing IDB (cannot survive total IDB unavailability, so acknowledge failure and request retry). None is implemented by this audit PR.


## 7. Independent design review: A/B/C for lost pending L3 writes (2026-10-30)

**Status:** RESEARCH / PREFERRED DESIGN ONLY / OWNER DECISION OPEN / NOT IMPLEMENTED. Review target: combined Draft PR #58 at HEAD \`ea00fee519f1c37c6c02c0344a320f68662ec910\`. This section changes no retention policy, data handling, code, Drive sync, or PR merge state.

### Evidence and guarantee boundary

- \`_l3Pending\` and per-key \`_l3Revision\` are tab-local RAM structures. Failed IDB operations requeue into RAM; \`eitiL3FlushPending\` can retry while the tab remains alive. There is no durable queue, automatic recovery after reload, or cross-tab revocation marker.
- The implementation moves \`_l3Last\`, cache update and success toast to the matching transaction's \`oncomplete\`. \`eitiL3Delete\` cancels queued/in-flight same-key operations before attempting IDB deletion; its return value is \`true\` only after the delete transaction completes. If IDB is unavailable or delete fails, deletion is **unconfirmed**.
- \`l3_pending_durability.spec.js\` has a real committed-write/reload positive control; the two expected-loss negatives inject a synchronous transaction exception and simulate an asynchronous abort, then close/reload the tab. They demonstrate the present boundary, but do **not** simulate sudden OS crash, browser storage eviction, real disk failure, or independent browser engines.
- The PR HEAD has successful GitHub Actions run [40694811095](https://github.com/velantrian/Eiti-Test-Notes/actions/runs/40694811095) (five successful jobs; Playwright run reports 175 passed, including both expected-loss tests). **Green CI here is compatible with confirmed data loss.** The author's additional local repeat counts are a separate report.

### Options compared

| Criterion | A — volatile queue + explicit failure | B — consented independent local outbox | C — IDB durable-first staging |
|---|---|---|---|
| Survives reload/tab close before retry | **No** | **Conditionally**, after independent outbox commit | **Conditionally**, after IDB staging transaction commits |
| IDB unavailable at attempted save | Cannot persist L3; visible failure | Can stage **only if** another approved local storage backend is operational | Cannot stage; **must report not saved** and offer explicit retry |
| Async abort after a durable stage | Current RAM retry only; vulnerable to close | Replay from committed outbox when IDB recovers | Replay from committed IDB stage when write path recovers |
| Delete / consent withdrawal | Cancel RAM entries; deletion of committed L3 must complete in IDB | Must invalidate and purge outbox **and** L3; durable revocation, cross-tab and replay races need design | Must atomically invalidate staged and committed entries in IDB when available; ensure replay cannot outrun revocation |
| Retention time | Only current tab lifetime; no new persistent copy | Owner-approved TTL, size cap, consent and restore/discard UX **required; not set** | Owner-approved pending-state TTL, cap and cleanup **required; not set** |
| Replay semantics | Best-effort while tab lives | Durable IDs, idempotency, conflict/supersession and revocation checks | Durable IDs/revisions, idempotency and atomic promotion/removal |
| Additional copies | RAM pending payload; no new persistent copy | New independent persistent copy, potentially captured by localStorage/settings backup or export unless explicitly excluded | Temporary additional logical copy/state **within the existing IDB origin**; no new cloud/backend; remove on promotion/deletion |
| Complexity / privacy risk | Low / lowest additional retention | High / high duplicate-storage, consent, quota and inadvertent-sync risks | Medium–high / narrower storage surface but still a retention decision |

**Non-negotiable limitation:** when IndexedDB is completely unavailable, C has no durable write path and cannot promise recovery. A does not either. B can sometimes bridge an *IDB-specific* outage with separate origin storage, but is not guaranteed during storage denial, quota exhaustion, origin eviction, private-browsing teardown or loss of the device. None of A/B/C offers guaranteed survival of all browser/storage failure modes. \`navigator.storage.persist()\` is not a crash-proof durability guarantee.

### Preferred direction (conditional): C

Prefer **C, durable-first staging in existing IndexedDB**, if the owner approves the limited retention of pending personal-memory entries. It makes a successful staging transaction an explicit recovery checkpoint while avoiding another independent storage technology and accidental Drive sync through existing localStorage settings capture.

Possible implementation shape **for later design, not a mandate**: stage a bounded operation with durable per-key revision/ID in IDB; only after stage \`tx.oncomplete\` may UI say **“queued locally for retry”** (never “L3 remembered”). Promote to active \`l3\` and remove the stage **in one readwrite transaction**; only its \`oncomplete\` permits the normal success acknowledgement. During replay, check a durable generation/deletion state so corrections, deletion and withdrawal outrank stale pending entries. A separate staging object store temporarily duplicates data; a single-record state model could reduce duplicates but must preserve last committed values and keep pending items out of L3 retrieval/prompt context.

If even the staging write fails or IDB is fully unavailable, show **“not saved; retry manually”**, never imply that a durable queue exists. A volatile in-tab retry may remain a convenience but is not a persistence guarantee. **Do not silently switch to localStorage, cloud backup, or Google Drive.**

### Minimal verifiable acceptance gates before implementation/merge

1. **Owner policy gate (OPEN):** record whether pending L3 may persist at all, purpose, consent/withdrawal rules, TTL, maximum size, purge-on-expiry, browser/export/backup visibility and recovery UX. No TTL, consent default or new sync inclusion is approved by this review. Any legacy migration/sync note in §5 is not an authorization.
2. **Receipt gate:** distinguish \`NOT_SAVED\`, \`STAGED\` (only after durable stage completion), and \`COMMITTED\` (only after active L3 transaction completion). Rejected stage writes, synchronous throws, aborts, quota errors and missing IDB must never yield a saved or durable-queued success toast.
3. **Recovery gate:** after a *successfully staged* operation, browser reload/tab close followed by IDB recovery replays without losing the latest value; repeated startup/retry is idempotent, does not duplicate historical values, and does not expose pending data to fact retrieval before promotion. Convert existing expected-loss tests **only for cases in which staging succeeded**; retain explicit failure tests for staging unavailable.
4. **Privacy gate:** deletion and withdrawal remove/invalidate matching pending and committed representations; replay cannot resurrect an older value after correction, deletion or withdrawal, including after reload and across two tabs. Report deletion failure as **unconfirmed**. Validate eventual purge only after IDB becomes usable; do not claim immediate durable deletion while it is down.
5. **Boundary gate:** assert no pending L3 payload enters Google Drive/settings sync, ordinary archive export/import, prompt injection path or any additional storage backend without a separate approved contract. Test time-bound expiry, capacity/quota, data minimization, and cleanup after successful promotion; use policy values only once owner sets them.
6. **Evidence gate:** execute browser-level sync failure, real asynchronous transaction abort, quota, reload, close, storage-blocked, in-flight deletion, multi-tab race and storage-eviction cases. Mark the last class as **not protectable** without a separately authorised independent backup. Require CI on the **new implementation HEAD**, not only this audit HEAD.

**Open owner questions:** Is any pending-personal-data retention permitted? For how long and how much? Should recovery be automatic or require explicit user approval? Which export/backup behavior is acceptable? What message and manual retry control should be shown if IDB never becomes available? Until these are answered, C remains a recommendation, **not an approved storage policy**.
