# Release-readiness audit: report (18 October 2026)

**Verdict: not ready for release.** The ten functional findings from the October functional audit are fixed on the committed branch and pass on the local emulator. But the branch is not a complete release candidate, and the audit found product issues that a release would ship: a public demo banner, no 404 page on the committed branch, and a resident emergency card that says "call now" with no number. Several gates still need services or hardware this environment doesn't have.

## Target

- **Audited:** branch `fix/release-audit-f01-f10`, commit `be3e71d` (worktree `/Users/rien/Documents/FINAL_PROJECT-fixes`). This is the committed code with the F01 to F10 fixes.
- **Not audited as the target:** the shared working tree (`/Users/rien/Documents/FINAL_PROJECT`, branch `build/disaster-rescue`). It has about 246 uncommitted changes from other sessions, including a 404 page and copy changes that the committed branch lacks. Those changes are not part of this release candidate yet.
- **Environment:** isolated emulator project `demo-release-audit`. Web on 5178, API on 3105, Auth emulator 9099 and Firestore emulator 8080 (the web app hard-codes these emulator ports). Clean Harbor presentation (5176), original QA (5174), the live-config Flutter process, and production were not touched. No production credentials were used.
- **Service stopped with approval:** the Auth emulator on 9099 held by another session (PID 70953, `demo-disaster-rescue`), stopped on Airen's instruction.

## Test results (run on this stack)

| Check | Result | Evidence |
| --- | --- | --- |
| API reproduction of F01, F03, F04, F05, F09, F10 plus authorization spot checks | 10 of 11 pass; one expectation corrected (see F01 note) | `evidence/results/api-checks.json` |
| Sign-in, Forgot password, password reset, registration, Forbidden, 404 | 9 of 10 pass; the 404 check fails (product defect) | `flows-auth.json` |
| Core resident, dispatcher, admin flows (submit with GPS, F06 guard, F07 offline notice, verify, assign, team selector) | 11 of 11 pass, with read-back for each change | `flows-core.json` |
| Operations lifecycle (verify, assign, acknowledge, progress, resolve, close and team release, reject, analytics CSV vs stats, settings guard) | 12 of 12 pass, with read-back | `flows-ops.json` |
| Surface sweep: 16 routes by role at 390, 768, 1024, 1440 px (100 samples) | No horizontal overflow; no console or page errors; small targets listed at 390 px | `surfaces.json`, `evidence/screenshots/surfaces/` |
| axe-core (WCAG 2.0/2.1 A and AA) on 34 surface and width samples | 0 violations; each page ran 9 to 29 passing rules, so the scan analysed real content | `axe-sweep.json` |
| Chromium, Firefox, WebKit: sign-in, dashboard, map | All three load the same data | `cross-browser.json` |
| WebKit Listen errors | Investigated; see the WebKit section | `cross-browser.json`, `evidence/webkit-listen.cjs` |
| Last-admin race (two admins deactivating each other), two fresh stacks | Correct both times: one succeeds, the other gets `last_admin`, one admin stays active | `admin-race.json` |
| Realtime across users: resident page updates after dispatcher verifies, no reload | Pass | `realtime-keyboard.json` |
| Keyboard order and focus ring on sign-in | Logical order; focus ring visible on every control | `realtime-keyboard.json` |
| Web unit tests, typecheck, production build (fix branch) | 253 tests pass; typecheck passes; build passes | Run before commit `be3e71d` |
| API unit and integration tests (fix branch) | 284 tests pass | Run before commit `2292223` |
| Firestore rules tests | Not rerun; rules file unchanged on this branch | - |

## Ten findings: fresh outcome

| ID | Outcome on this stack | Notes |
| --- | --- | --- |
| F01 | **Fixed** | A demoted dispatcher's old token got 403 on the next request (was 200). Deactivation: the old token is refused. Auth now rejects the token with `401 invalid_token` because the emulator disables the account; the earlier unit test expected 403. Both block access. |
| F02 | **Fixed in the product; delivery unverified** | Forgot password appears, the reset code issues, the password is set, and the new staff member reaches `/assignments`. Whether Firebase sends the email depends on the target project's email setup, which this audit could not check. |
| F03 | **Fixed on the Users screen** | Team assignment and removal work and read back through the API. The admin Accounts panel still has no team control after creation. |
| F04 | **Fixed for CSV; PDF totals not parsed** | CSV row count matches the stats total for a type filter (1 = 1) and for an unfiltered run (11 = 11). PDF returns 200; its totals were not extracted. |
| F05 | **Fixed at the API** | Reusing a key for a different report returns `409 idempotency_conflict`, and the first report stays. Reload and lost-response retries were not exercised in the browser. |
| F06 | **Fixed for in-app links** | A declined navigation keeps the draft. An accepted one leaves. Browser Back is not guarded. |
| F07 | **Fixed on the resident detail page** | The offline notice appears on disconnect and clears on reconnect. The assignment and incident views were not tested offline in the browser. |
| F08 | **Fixed** | A new resident's email is stored, and the admin accounts list shows it. |
| F09 | **Fixed at the API** | `team.create` and `team.update` entries exist and carry before and after values. The audit page's display of them was not checked. |
| F10 | **Fixed** | The API returns 400 for an empty hotline or notice. The settings form blocks the save and shows its message. |

## New findings (verified on this stack)

Severity uses the scale in `AUDIT-SPEC.md`. Full detail is in `FINDINGS.md`.

1. **Public demo banner (High):** the public header on every public page reads "Demo site · hotline not configured" (`web/src/components/PublicHeader.tsx:8`). The brief forbids public demo banners.
2. **No 404 page on the committed branch (High):** unknown addresses redirect to `/` (`web/src/App.tsx:44`). A signed-in resident lands on their hub. The shared working tree has a `NotFound` page, so this is fixed there but not on the branch.
3. **Emergency card with no number (Medium):** the resident hub's "If you are in danger, call now" card has no number, while the header says the hotline isn't configured. Users could read it as a call prompt that leads nowhere.
4. **Fix branch is not the release candidate (Blocker for release):** the committed branch lacks the working tree's changes (404 page, copy, other fixes). The release has to integrate them and be re-audited.
5. **Small touch targets at 390 px (Medium):** inline text links (for example "Back to the queue", "Back to my reports", "Create a resident account") measure below 44 px. Map and monitor priority markers also measure small; their markup needs checking to see whether they are interactive.
6. **WebKit Listen errors on navigation (Low, unresolved):** WebKit logs two page errors on the Firestore Listen channel during full-page navigation, with one cancelled request. No errors occur during 10 seconds of idle, and data loads on both pages. The earlier access-control errors did not reproduce against this emulator. Cause unknown; needs a hosted non-production target to settle.
7. **Rate limit reached during testing (Observation):** the API's 300-per-15-minutes limit returned 429 to a resident submitting a report during the sweep. That's an expected limit, but a resident mid-report would see it. The product should explain what to do.

## Not tested (blocked or out of scope for this pass)

- Real uploads: no non-production Cloudinary configuration. Upload, failure cleanup and photo delivery are blocked.
- Email and push delivery; physical-device GPS, camera and permissions.
- Interrupted registration, duplicate account detection, and sign-in for a deactivated account in the browser.
- Priority, classification, duplicate marking, cancellation from the resident side, and the DMO monitor's marker details.
- Firefox and WebKit full flows: only sign-in, dashboard and map were checked there.
- The landing page's visual judgment at each width: layout and overflow were checked, and the screenshot was not reviewed in detail.
- PDF content totals.
- Firestore rules tests (not rerun).

## Harness corrections (recorded, not hidden)

- `isVisible()` checks once without waiting. Replaced with `waitFor` after a false negative on a visible message.
- The Save click selector matched "Save name" in the Teams panel. Corrected to "Save settings".
- A settings check condition expected a stored hotline that the seed never had. Corrected to check that the UI blocked the save.
- The F01 deactivation check expected 403. The emulator disables the account, so Auth returns 401. Both refuse access; the expectation was corrected.
- The keyboard "focus ring" check counted the `body` element when focus left the document. Excluding it, every control shows a ring.
- Two admin-race runs looked wrong at first. A leftover admin from an earlier failed run made both removals legitimately succeed, and a deactivated admin's token made the list read fail. Corrected, and rerun on fresh stacks.
- Playwright 1.64 expects newer Firefox and WebKit builds than installed. Launched through the installed executables (`executablePath`).
- The audit's own scripts and screenshots are in `evidence/`. They point at the scratchpad path used for this run.
