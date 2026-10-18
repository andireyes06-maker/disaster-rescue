# Confirm and fix: plan

Derived from `design-plans/CONFIRM-AND-FIX-SPEC.md` (approved by Airen, October 17, 2026). Commit after each phase only if Airen says so; nothing is committed under this plan yet.

## Environment (verified October 17, 2026)

- Web dev server, port 5174: emulator mode. Project `demo-disaster-rescue`, `VITE_USE_EMULATORS=true`, Auth port 9299, Firestore port 8190, API base `http://127.0.0.1:3102/api`.
- Demo API, port 3102 (pid 55574): `FIREBASE_PROJECT_ID=demo-disaster-rescue`, emulator hosts set. This is the stack for all browser checks.
- Live-credentialed API, port 8080 (pid 82217): started from `api/` with `--env-file=.env`. `api/.env` targets project `flutter-5094e` and sets a service-account path. The web app does not use it. Not touched by this plan. Airen to decide whether to stop it.
- Unused emulator sets: 9099/8080 (pid 70953, 70991, older `fixes-2026-10-16` support config), and 14846 (`emulator-api.mjs` on 3101). Left running.

## Phase 0: Verification baseline (done)

- `web: npm test`: 265 pass.
- `mobile: flutter analyze`: no issues. `flutter test`: 128 pass.
- Landing page at 1000px: renders. Console: one 404 for `/favicon.ico`.

## Phase 1: Browser sweep, public and access

- `/`, `/login`, `/register`, `/forbidden` at 1440, 1024, and 390px.
- Keyboard: skip link, tab order, visible focus.
- Reduced motion and console errors.
- Save screenshots to `design-plans/codex-redesign/evidence/review-*.png` (the browser tool cannot write to the scratchpad).

## Phase 2: Signed-in sweep, demo accounts only

- Sign in through the demo Auth emulator for each role: resident, dispatcher, DMO, responder, admin. Use only accounts the demo seed creates.
- For each role, visit the routes it may see and the ones it may not. Confirm redirects and the Forbidden state.
- Resident: empty, loaded, validation, failed submit (intercepted POST), retry.
- Staff/admin: loading, empty, and long-content states.
- Phone width (390px) for each signed-in route.

## Phase 3: Native

- `flutter analyze` and `flutter test` already pass.
- Device checks are unavailable. Only a simulator or emulator run would add evidence. None is set up; I will report it as not verified and not substitute a source review.

## Phase 4: Fixes

- Each finding gets a note in the findings log below with evidence.
- Test first where the surface is testable (web Vitest, Flutter test).
- Smallest change that keeps `DESIGN.md`.
- Re-run `npm test`, `flutter analyze`, `flutter test`, and the affected browser checks.

## Findings log

| # | Surface | Finding | Severity | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Landing | Missing `favicon.ico` (404) | Low | console; `checks/review-2026-10-17.md` | Fixed: `web/public/favicon.svg`, verified 200 |
| 2 | Environment | Credentialed API on 8080 targets `flutter-5094e` | High (safety) | `ps`, `api/.env` keys | Open; Airen decides |
| 3 | Sign-in, registration, Forbidden | No skip link or `#main-content` target; generic page title | Medium (a11y) | iframe DOM check at 390px; handoff says every route has a skip target | Fixed; `AccessPageLandmarks.test.tsx` |
| 4 | Resident layout | Duplicate top-level banner landmark (`header.resident-band`) | Low (a11y) | DOM role count: 2 before, 1 after | Fixed; `ResidentLayout.test.tsx` |
| 5 | Web API client | Falls back to `localhost:8080` when `VITE_API_BASE_URL` is unset | High (safety) | `web/src/api/client.ts:3` | Open; Airen decides |
| 6 | Not verified | Contrast, reduced motion, focus across all routes; staff loading and long content; Flutter device | Gap | `checks/review-2026-10-17.md` | Open |

## Not in scope

- Real-device behavior, push, real map tiles, GPS, camera.
- Production deploy, commit, push.
