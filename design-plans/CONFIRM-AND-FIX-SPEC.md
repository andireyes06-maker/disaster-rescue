# Confirm and fix: redesign regression review

Status: DRAFT, awaiting Airen's approval. No product code has changed under this spec.
Date: October 17, 2026. Owner: Airen. Working tree: shared with earlier Claude work and Codex redesign; never reset.

## Intent

Confirm the Codex redesign (web and Flutter) holds on every surface, then fix what breaks. Keep the implemented direction in `DESIGN.md`. Keep auth/provisioning, role guards, API/rules, demo isolation, and draft/recovery fixes intact.

## Goals

1. Independent evidence, not handoff claims, that each surface works at desktop and phone widths.
2. Check loading, empty, validation, failure, retry, keyboard, contrast, reduced motion, responsive layout, long content, and authorization states.
3. Fix concrete regressions with the smallest change that keeps the design direction.

## Non-goals

- No new visual direction. No new features.
- No commit, push, deploy, production mutation, or dependency install without Airen's instruction.
- No claim of real-device behavior. No device is attached.

## Anti-goals

- Passing tests that hide a broken state.
- Invented operational data. Demo scenes stay labelled illustrative. No hotline, release, or response guarantee.

## Verified so far (October 17, 2026)

| Check | Result | Evidence |
| --- | --- | --- |
| `web: npm test` (typecheck + vitest) | 265 tests, 37 files, pass | terminal run, this session |
| `mobile: flutter analyze` | No issues | terminal run, this session |
| `mobile: flutter test` | 128 tests pass, exit 0 | log, this session |
| Public landing, 1000px full page | Renders; sections and safety notice present | screenshot, inline (not saved to disk) |
| Console on landing | One 404: `/favicon.ico` | `evaluate_script` resource list |
| Emulators | Auth on 127.0.0.1:9099 and Firestore on :8080 running | `lsof` |
| API | Not running; no port found in 3000/4000/5001 | `lsof` |

## Still to verify (not yet done)

- Public: `/login`, `/register`, `/forbidden` at 1440, 1024, 390; keyboard order; contrast.
- Resident (`/my`, `/my/report`, `/my/reports/:id`): empty, loaded, validation, failed submit, retry, long content.
- Staff/admin (`/dashboard`, `/map`, `/incidents/:id`, `/analytics`, `/monitor`, `/audit`, `/teams`, `/users`, `/assignments`, `/admin`): each role sees only its routes; unauthorized roles redirect.
- Flutter: device checks unavailable. Simulator or emulator not run yet.
- Reduced motion and focus across all routes.

## Known issues (from this session)

1. Missing `favicon.ico` returns 404 on the landing page. Low severity. Fix: add a favicon asset or a `<link rel="icon">`.

## Fix rules

- Each fix gets a failing test first where the surface is testable, then the fix.
- Visual fixes are checked in a browser at 1440, 1024, and 390 px.
- Existing `web/src/product.css`, `web/src/theme/tokens.css`, and `mobile/lib/theme/app_theme.dart` remain the source of styling.
- Fixes are limited to findings with evidence. Nothing is redesigned.

## Method for the remaining review

- Browser: demo sign-in through the Auth emulator, after the API is started locally. Demo data only.
- Mutations: local emulators and fake data only. Failed-submit checks use an intercepted request, as the handoff did.
- Output: screenshots saved under `design-plans/codex-redesign/evidence/` with a dated checks file.

## Open questions for Airen

1. Start the local API so authorized-role sweeps can run? (Needed for staff, admin, and resident signed-in states.)
2. Approve this spec and the plan that follows?
3. Is a favicon asset available, or should I add a plain placeholder mark?
