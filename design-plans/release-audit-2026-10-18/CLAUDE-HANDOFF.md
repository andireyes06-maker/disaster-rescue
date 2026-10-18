# Release audit handoff (18 October 2026)

Status: **the re-audit ran on the fix branch. Verdict: not ready for release.** Nothing is merged, pushed, committed or deployed in this pass. Read `AUDIT-REPORT.md` first.

## Where things are

- Audit folder: this directory. Start with `AUDIT-REPORT.md` (verdict), then `LEDGER.md` (per page), `FINDINGS.md` (new defects and the ten F-findings), `REPAIR-PLAN.md` (prioritized).
- Evidence: `evidence/results/*.json` (test output), `evidence/screenshots/` (full-page captures), `evidence/*.cjs` and `reset-stack.sh` (the harness; scratchpad paths inside).
- Fix branch audited: `fix/release-audit-f01-f10` at `be3e71d` (worktree `/Users/rien/Documents/FINAL_PROJECT-fixes`). API fixes `2292223`, web fixes `be3e71d`.
- Main tree (`/Users/rien/Documents/FINAL_PROJECT`, branch `build/disaster-rescue`): untouched. About 246 uncommitted changes from other sessions.

## Audit stack (ports used by this audit)

- Web 5178, API 3105, Auth emulator 9099, Firestore emulator 8080, project `demo-release-audit`.
- The web app hard-codes emulator ports 8080 and 9099. The spec's planned 8391 and 9500 would need a source change. Not made.
- Seed: `evidence/seed.cjs` (five `@harbor.example` accounts, password `AuditOnly-Rescue-2026`, emulator only, two teams, three reports).
- Restart only this stack: `evidence/reset-stack.sh` (finds listeners by port; does not touch other processes).

## Results in one line each

- API reproduction F01, F03, F04, F05, F09, F10: 10 of 11 (one expectation corrected; see AUDIT-REPORT.md).
- Sign-in, reset, registration, Forbidden: 9 of 10. **404 fails** (redirects to `/`).
- Core and operations flows: 11 of 11 and 12 of 12, each with API read-back.
- Layout sweep: 100 samples, no overflow, no console errors. axe: 0 violations on 34 samples.
- Last-admin race: correct on two fresh stacks.
- Cross-browser: sign-in, dashboard and map in Chromium, Firefox and WebKit. WebKit logs Listen errors on navigation only (unresolved).

## Blocking items for release

1. Decide how the working-tree changes join the fix branch, then re-audit the combined state (Finding 4).
2. Public demo banner in `PublicHeader.tsx` (Finding 1).
3. No 404 page on the branch; the working tree has one (Finding 2).
4. Resident emergency card says "call now" with no number (Finding 3).

Full order and acceptance checks: `REPAIR-PLAN.md`.

## Not verified (say so in any summary)

- Real uploads (no non-production Cloudinary), email and push delivery, physical devices, hosted WebKit Listen behavior, PDF totals, Firestore rules rerun.
- Full Firefox and WebKit flows; only sign-in, dashboard and map were checked there.

## Gotchas

- Stop only the audit stack by port (see `reset-stack.sh`). PID 70953 (another session's emulator) was stopped with Airen's approval; do not stop other sessions' processes.
- The API limit is 300 requests per 15 minutes. Long runs hit 429; restart this stack to reset the counter, or wait.
- The admin-race check can make all active admins inactive if run twice on one stack. Reset the stack between runs.
- `git status --cached` is not a valid flag here; use `git diff --cached --stat`.
- Nothing has been committed for this audit. The audit folder is uncommitted in the main tree.
