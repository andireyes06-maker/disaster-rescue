# Integration round 3: remaining release gates (18 October 2026)

Target: integration worktree `/private/tmp/rescue-release-integration-2026-10-18`, branch `integration/redesign-functional-2026-10-18`, HEAD `76e54ff` plus the uncommitted integration (203 status entries, unchanged this round). Local stack: web 5179, API 3106, Auth 9599, Firestore 8490, project `demo-integrated-release`. Fictional fixtures only. Nothing committed, pushed, deployed or merged. No production or hosted credentials were used.

## Results by gate

| Gate | Result | Evidence |
| --- | --- | --- |
| Incident, responder and admin workflows in Chromium, Firefox and WebKit | **18 of 18 pass** (6 workflows × 3 engines). Every change read back through the API. | `engine-workflows.json`, `engine-workflows.cjs` |
| Firefox/WebKit runtime errors | Firefox: none beyond dev font noise. WebKit: two Firestore Listen errors on each full page navigation (see below). | `engine-workflows.json` |
| Page error boundary ("Page unavailable") | **Not shown** on any of 54 route loads across 3 engines; not shown on the traced dispatcher steps. | `boundary-probe.json`, `boundary-trace.json` |
| Module and React errors seen in an earlier run | Caused by the harness starting a full navigation while the previous route's chunk was still loading. Removed by waiting for the landing heading after sign-in. Not a product defect. | `engine-workflows.cjs` (login wait) |
| Geist font "403" and download failures | **Dev-only.** The dev server refuses font files that live outside its root (the worktree links into the original `node_modules`). The production build bundles the Geist woff2 files in `assets/`. | `forbidden-urls` run (7 of 7 are Geist `/@fs` requests); production build check |
| Idempotency: stale claim after a failed completion write | **Duplicate reproduced.** The retry after the 120 s stale window creates a second report. | `idempotency-limits.json` (Case A) |
| Idempotency: retry while the first attempt is pending | Refused with `submission_in_progress`. Correct. | `idempotency-limits.json` (Case B) |
| Idempotency: page reload | **Limit confirmed by code, not reproduced in a browser.** The key lives in a React ref, so a reload creates a new key. A retry after a lost response and a reload can create a duplicate. | `web/src/features/resident/ReportForm.tsx:40-49, 155-169` |
| Flutter static analysis | No issues found. | `flutter-analyze.txt` |
| Flutter unit and golden tests | **128 of 128 pass** when the reference images are linked. Without the link, 4 golden tests fail because the reference folder is untracked and absent from the worktree (environment, not product). Golden references come from the original project's older `codex-redesign/native` set, so they confirm the match to those references, not the newest redesign. | Run output in this round |
| Physical device and Flutter on hardware | **Not verified.** No phone is attached. The Flutter devices present are macOS desktop and Chrome; the app was not run, because it needs live or emulator Firebase wiring this round did not set up. | - |
| Hosted WebKit (non-production Firebase) | **Blocked.** No non-production hosted project is configured. | - |
| Cloudinary photo upload | **Blocked.** The setup doc requires the owner's Cloudinary account; no non-production values are configured here. Unit tests use a fake uploader only. | `docs/firebase-setup.md` |
| Email and push delivery | **Blocked.** No non-production delivery target. Emulator out-of-band codes are not delivery evidence. | - |
| Owner-approved hotline and settings | **Blocked.** Only the owner can supply a number and wording. None was invented. | - |

## WebKit full-navigation Listen errors

Traced on the integration stack: a sign-in on WebKit followed by a full navigation records two `pageerror` entries for the Firestore Listen channel. Firefox and Chromium cancel the same long-poll silently or with no error. In-app navigation and idle produce none. Data loads on every engine. The earlier access-control text did not recur on this stack. Status: recorded, recovers, not a product defect on this evidence; still not an error-free WebKit result.

## Idempotency limits (for the owner's decision)

1. **Duplicate after a failed completion write (reproduced).** `reportService.create` writes the report, then records completion in a second write. If that second write fails, the claim stays pending. After 120 s a retry with the same key creates a second report. A fix needs the report write and the claim to commit together, for example in one transaction that also stores the key on the report.
2. **Duplicate after a reload (code reading).** The client key is in memory only. A fix needs the key kept per submission in session storage, or a server-side draft id.
3. **Slow first attempt (code reading).** A first request still running after 120 s can be overtaken by a retry, which then creates a second report. The same fix as item 1 covers it.

Not changed in this round. Fixes change the report write path and the client form, so they need an approved spec first.

## Skills

No Skill-tool skills were invoked in this round. Checks used Playwright directly (three engines), the Flutter CLI, `curl`, and direct reading of the source. The frontend, motion, testing and security skills named in the brief were not used, and nothing in this round depends on them.

## Process notes (kept for honesty)

- Restarting the integration API alone stops the whole stack, because its launcher treats any child exit as a shutdown. The stack was restarted through its launcher, which gives fresh emulator data each time.
- One `ln -s` was created inside the worktree's `design-plans` folder by mistake. It was removed. The worktree status count was checked afterwards (unchanged, 203).
- The API's 300-requests-per-15-minutes limit was reached by probes and repeated runs. Affected runs were discarded and rerun on a fresh stack; the reported results are from clean runs.
