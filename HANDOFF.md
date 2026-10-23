# HANDOFF

## Start here

- **Status (Oct 23, Claude):** professor clarification work is complete on this branch. Spec `docs/superpowers/specs/2026-10-23-professor-clarification-design.md`, plan `docs/superpowers/plans/2026-10-23-professor-clarification.md`, ledger `.superpowers/sdd/2026-10-23-professor-clarification/progress.md` (git-ignored, this machine).
- **Commits on `build/disaster-rescue`:** `8040165` feature, `9b9ce01` and `a091266` handoffs, `faac412` review fixes, `0b448ad` option A (API refuses dispatcher and DMO tokens), `0c1307d` handoff.
- **Pushed:** new remote branch `build/professor-clarification-2026-10-23` at head `3abe326` (cleanup: unused calm components, Placeholder page, demo indicator removed). Origin's `build/disaster-rescue` was not touched. No pull request opened.
- **Verified:** API 328 pass, 1 skipped (pre-existing). Web typecheck clean; 326 pass on the staged snapshot (`--maxWorkers=2`). Flutter analyze clean, 130 pass. Rules 128 pass under the emulator (unchanged by option A). Browser check of the mobile-app notice at 390px.
- **Not deployed:** the Firestore rules are not deployed. Nothing is deployed from this change.
- **BLOCKED, needs a decision:** (1) merging this branch with origin's `build/disaster-rescue`, which has 5 commits this branch lacks (merge of PR #1 and a large redesign, 496 files); a plain push is rejected. (2) deploying the Firestore rules: they apply to the whole project, and origin's code still expects dispatcher and DMO reads, so deploying now breaks live dispatcher and DMO screens.
- **Left uncommitted on purpose:** another session's edits in `web/src/features/auth/LoginPage.tsx`, `LoginPage.test.tsx`, `web/src/pages/public.css` (password reset work) and `design-plans/completion-verification-2026-10-18/PAGE-LEDGER.md`. This change's login edits are committed.
- **Gotchas:** run web tests with `--maxWorkers=2`; on macOS `sed -i` needs `''`. Typecheck and tests must be run separately; `sh -c 'a; b'` hides a failed `a`.

## Next step

Decide the merge with origin (option A: merge and resolve conflicts, B: keep the new branch separate, C: hold) and when the rules deploy happens (after the merged code is live, which avoids breaking live dispatcher and DMO screens).

## Open questions

1. Merge with origin's `build/disaster-rescue`: STOPPED. A test merge in a separate worktree had 91 conflicts (57 in web), and the auto-mode permission check denied the step that takes origin's version of conflicted files. The merge needs an explicit permission from Airen (or a permission rule) before it's retried. The plan was: take origin's side for conflicted files, re-apply this feature on top, verify with all suites.
2. Rules deploy: wait for the merged release to be live?
3. Other session's login work: commit it with its owner, or leave it?
4. Older unreachable web files (`components/calm`, `components/ui`, `features/demo`, `lib/utils`, `pages/Placeholder`) predate this change; delete in a cleanup pass?

## Resume prompt

"Read HANDOFF.md and docs/role-matrix.md in /Users/rien/Documents/FINAL_PROJECT. The professor clarification work is committed and pushed to build/professor-clarification-2026-10-23. Waiting on Airen for the merge decision and the rules deploy."
