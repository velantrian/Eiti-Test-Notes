# PR #79 follow-up audit — 2026-11-02

**Scope:** `velantrian/Eiti-Test-Notes`, PR #79, tested source HEAD `072356088027e4b218f5fb95f29f24b7a0a00b07`, merge `fb4c20c0839fbd0ffaccc46f0fda0ef1d7dc7d90` (v14.16.10 runtime, although PR title says v14.16.9).

**Status: PATCH APPLIED in isolated Draft PR #80.** The ~4.7 MB `index.html` could not be uploaded directly via the GitHub connector, so a branch-scoped one-shot GitHub Actions workflow applied the already validated patch and committed the runtime fix as `517285afaa89ed17cd93a39487e89165f6085704`. The temporary workflow was subsequently removed. `main` and production remain unchanged. **Do not merge before independent review and all final-SHA CI checks pass.**

## Findings

1. **P1 — loss of an unsaved draft:** composer undo history debounces input snapshots by 280 ms. The clear button emits a new `input` event, cancelling the pending snapshot; undo can no longer recover text typed just before clear.
2. **P2 — hidden clear button:** `#eiti-composer-clear` is nested in `#chat-undo-col`; hiding undo/redo also hides clear despite an independent enabled setting.
3. **P2 — duplicate destructive paths:** plus-menu `_eitiClearInput` bypasses the new clear function and never emits an `input` event or commits undo history.
4. **P2 — weakened offline coverage:** `test_v14167.py` dropped executable checks for `eitiShowOfflineTyping` and `eitiWithOfflineTyping`.
5. **Accessibility:** `role="switch"` should expose `aria-checked`, not `aria-pressed`.

## Evidence added in this draft PR

- `velantrim_core/tests/test_v14167.py`: restore offline entrypoint, callsite, timer cleanup and three-gold-dot CSS guards independent of the current release version.
- `velantrim_core/e2e/composer_clear_regression.spec.js`: settings/popup switch and persistence, no deletion on toggling, hide-undo independence, immediate clear/undo/redo, plus-menu parity, and fast/delayed/rejected offline typing.
- `docs/pr79_composer_regression_fix.patch`: **validated round-trip** unified diff for a surgical update to `index.html`. No reformatting or version bump.

## Applied runtime fix and reproducibility

- Initial merged runtime blob: `f777ba225bebf3cd835c6bc8a19c4ed4014650c8`.
- Patched runtime blob: `50ffc182b12c20dff168c29337b5d80ec23ca4ae`.
- Isolated one-shot apply workflow: GitHub Actions run `41460327371` — **success**.
- The fix changes only `index.html` (19 insertions / 11 deletions) and does not bump the version. The patch file is retained solely for auditing/reproduction against the original baseline, and must **not** be applied again to the already patched branch.

Run and verify checks against the **latest exact PR HEAD SHA**:

```sh
python3 -m pytest velantrim_core/tests/test_v14167.py velantrim_core/tests/test_v14168.py
node --test velantrim_core/tests_js/*.test.js
cd velantrim_core/e2e && npm ci && npx playwright test composer_clear_regression.spec.js
```

Wait for all GitHub Actions checks on the final commit. Do not merge automatically. The visual approval condition from merged PR #78 has not been established by GitHub Reviews or PR comments; automated DOM/style tests are not manual screenshot approval.
