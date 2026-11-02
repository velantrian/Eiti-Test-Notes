# PR #79 follow-up audit — 2026-11-02

**Scope:** `velantrian/Eiti-Test-Notes`, PR #79, tested source HEAD `072356088027e4b218f5fb95f29f24b7a0a00b07`, merge `fb4c20c0839fbd0ffaccc46f0fda0ef1d7dc7d90` (v14.16.10 runtime, although PR title says v14.16.9).

**Status: PATCH PREPARED, NOT APPLIED TO `index.html`.** GitHub connector cannot upload the 4.7 MB monolithic HTML file (transport failure). This draft branch intentionally contains only test coverage and a small patch file. **Do not merge while the regression tests fail.** No production/main edits were made by this audit.

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

## Applying the patch (only in this draft branch, never directly in main)

```sh
git checkout audit/pr79-composer-regression-20261102
git apply --check docs/pr79_composer_regression_fix.patch
git apply docs/pr79_composer_regression_fix.patch
git add index.html
git commit -m "fix: preserve composer drafts on clear and decouple clear toggle"
```

Run checks for the **new exact HEAD SHA** after the patch is applied:

```sh
python3 -m pytest velantrim_core/tests/test_v14167.py velantrim_core/tests/test_v14168.py
node --test velantrim_core/tests_js/*.test.js
cd velantrim_core/e2e && npm ci && npx playwright test composer_clear_regression.spec.js
```

Wait for all GitHub Actions checks on the final commit. Do not merge automatically. The visual approval condition from merged PR #78 has not been established by GitHub Reviews or PR comments; automated DOM/style tests are not manual screenshot approval.
