# Repair log (after the release audit)

Branch: `fix/release-audit-f01-f10`. The audit report describes commit `be3e71d`. This log covers later commits; it does not change the audit's findings.

## Blocker status

| # | Blocker | Status | Commit | Verification |
| --- | --- | --- | --- | --- |
| 1 | Working-tree changes not on the branch | **Open: needs Airen's decision** | - | How the ~246 uncommitted changes join the branch is a decision about other sessions' work. Not made. |
| 2 | Public demo banner | **Fixed** | `78e0156` | Landing page has no demo or hotline text (`evidence/results/verify-blockers.json`). |
| 3 | No 404 page on the branch | **Fixed** | `78e0156` | Unknown addresses show "Page not found", anonymous and signed in. Unit tests added. |
| 4 | Resident card says "call now" with no number | **Fixed** | `78e0156` | Without a number: "Safety information", no call prompt. With a number: call prompt with the number. |

## Checks

- Web: 257 tests pass (39 files); typecheck passes; production build passes.
- Browser (Chromium, release-audit stack, fresh seed): 5 of 5 pass (`evidence/verify-blockers.cjs`).
- Not rerun: API tests (no API change in this commit), Firestore rules, Firefox and WebKit.

## Still open from the audit (not in the four blockers)

Findings 5 to 8 and the verification gates in `REPAIR-PLAN.md` P1 and P2.

## Second batch: audit Findings 5 and 8 (commit `76e54ff`)

| Item | Status | Verification |
| --- | --- | --- |
| Finding 8: admin Accounts team control | **Fixed** | Team column in `/admin`; changed on the emulator and read back through the API; restored (`evidence/results/verify-repairs2.json`). |
| Finding 5: small touch targets | **Mostly fixed** | Small targets at 390 px across all pages: 43 before, 24 after (`surfaces-before-repair.json`, `surfaces-after-repair.json`). Map markers 24 px to 44 px tap area. Map zoom buttons 44 px on touch screens. |

Remaining touch-target exceptions, recorded on purpose:
- The "Skip to content" link appears on keyboard focus only.
- The Leaflet attribution link ("Leaflet") is the map provider's attribution. Changing it would mean editing the provider's control.

The sweep after the change recorded 4 samples with `429 Too Many Requests` at the end of the run. The API's 300-requests-per-15-minutes limit was reached by testing. This is the rate limit, not a product error.

## Still open

- Blocker 1 (working-tree changes). A patch of the working tree is in `working-tree-review/`: 114 files, with the 404 page and copy work that overlaps this branch. Nothing has been committed from it.
- Finding 6 (WebKit Listen errors on navigation) and Finding 7 (rate-limit message on submission, not changed here).
- Verification gates in `REPAIR-PLAN.md` that need hosted services or devices.

## Finding 6 resolved on evidence (WebKit)

Cancelled Listen connections on full page unload occur in all three engines. WebKit reports them as uncaught page errors. In-app navigation and idle produce no errors in any engine. No product change. Hosted confirmation still pending (REPAIR-PLAN item 7). See `FINDINGS.md`, Finding 6 update.
