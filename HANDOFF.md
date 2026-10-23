# HANDOFF

## Start here

- **Professor clarification (Oct 23, Claude):** spec `docs/superpowers/specs/2026-10-23-professor-clarification-design.md` (approved, option A). Plan `docs/superpowers/plans/2026-10-23-professor-clarification.md`. Progress ledger `.superpowers/sdd/2026-10-23-professor-clarification/progress.md` (git-ignored, this machine only).
- **Done, uncommitted:** Task 1 queue helpers; Task 2 oldest-first queue (API); Task 3 admin-only validation recording `verifiedBy` and `verifiedAt` (API); Task 7 oldest-first queue (web); Task 8 "Validate report" action and validator line (web); Task 9 landing copy.
- **Verified:** API `npm test` 324 passed, 1 skipped (pre-existing). Web `npm run typecheck` clean; `npx vitest run --maxWorkers=2` 54 files, 393/393. Flutter `flutter analyze` no issues; `flutter test` 128/128. Rules tests and the emulator browser check are not run yet.
- **Done (Airen, Oct 23):** old web resident and responder paths show the mobile-app notice; video script and outline rewritten for the new roles. Web 405/405 (`--maxWorkers=2`), typecheck and build OK, rules 128/128. Browser check of the notice at 390px done.
- **Decided (B, Airen, Oct 23):** dispatcher and DMO can't sign in to the website and Firestore rules deny their staff reads. The API still accepts their tokens (cost, see `docs/role-matrix.md`). Verified: web 397/397 with `--maxWorkers=2`, rules 128/128 under the emulator.
- **Not done:** final whole-branch review (not dispatched); commit (waiting for approval); Flutter role_gate notice for dispatcher and DMO; dead resident and responder web pages (cleanup).
- **Committed locally:** `8040165` on build/disaster-rescue (this change only). **Not pushed, not deployed.** Firestore rules are not deployed. Production is untouched.
- **Left uncommitted on purpose:** `web/src/features/auth/LoginPage.tsx`, `LoginPage.test.tsx` (another session's work is mixed in with this change's one-line edits) and `LoginPage.websiteAccess.test.tsx` (depends on them).
- **Gotchas:** web tests time out under default workers, so use `--maxWorkers=2`. On macOS, `sed -i` needs `''`. Other sessions' uncommitted files (LoginPage, public.css, design-plans, untracked folders) are not part of this change; do not stage them.

## Next step

Approve or hold the commit, then decide on the final review and the dead-code cleanup. Live presentation is still unresolved; ask the professor.

## Open questions

1. Should the API also refuse dispatcher and DMO tokens (option A, about 120 test changes)? Decision B left it open (`docs/role-matrix.md`).
2. Dead resident and responder web components: delete in a cleanup pass? (Kept for now.)
3. Is a live presentation required? Unresolved in the professor's message; ask the professor.
4. Commit after each task, or once at the end?
5. Older open items (PR to master, Render check, course docs, hotline and privacy text) are in `docs/history.md`, under "Archived handoff".

## Resume prompt

"Read HANDOFF.md, docs/role-matrix.md and .superpowers/sdd/2026-10-23-professor-clarification/progress.md in /Users/rien/Documents/FINAL_PROJECT. Continue the professor clarification plan from the first task without a complete line."
