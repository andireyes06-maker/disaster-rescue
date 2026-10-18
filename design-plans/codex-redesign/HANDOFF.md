# Rescue Reports — implemented redesign handoff

October 17, 2026. Airen authorized Codex to implement the full redesign and will continue in a new Claude session. This document supersedes the earlier proposals and milestone prompts for visual direction. The current implementation is ready for Airen's visual review; it is not a production release sign-off.

Later update: notifications have moved out of the resident dashboard into a header bell. Read `NOTIFICATION-BELL-HANDOFF.md` for the implementation, newer test totals, evidence, and Claude continuation prompt.

Latest update: Airen requested a dynamic motion system. Read `MOTION-IMPLEMENTATION.md`; it supersedes earlier static-motion guidance and records the newer 290-test result and runtime checks.

Newest update: `STATE-MOTION-HANDOFF.md` covers registration errors, shared form flow/messages/data states, and dialog lifecycle/focus. It records 294 passing tests and the new cross-browser validation/dialog evidence.

Landing video update: `LANDING-VIDEO-HANDOFF.md` records the finished 16-second Hyperframes film and hero integration, editable source, 300-test result, and cross-browser playback checks.

## What is finished

The web product now shares cool paper surfaces, a self-hosted Geist type system, violet actions, indigo navigation, and a geometric Rescue Reports mark. The oversized purple title bands and generic resident card stack have been replaced. Shared implementation lives in `web/src/product.css`, `web/src/theme/tokens.css`, and `web/src/components/Brand.tsx`. Read root `DESIGN.md` for the system.

- Public landing: editorial opening, composed incident queue/map demonstration, resident tracking preview, workflow, staff roles, and access/privacy sections. Sample scenes are explicitly illustrative; no invented hotline, public release, or response guarantee.
- Sign-in, registration, and Forbidden: shared visual treatment while preserving existing inline validation, provisioning, role guards, and recovery repairs.
- Resident web: compact navigation, action-led report hub, report detail/history, and a substantially rebuilt reporting workspace. One keyboard-operable category group, description, actual location picker, optional evidence, and contact fields. On phones, required location precedes optional photos. GPS and manual coordinates retain distinct source values; manual entry requires an explicitly confirmed valid pair. Failed submission preserves entered details.
- Staff: consistent role navigation, restrained page headings, inbox/preview proportions, bounded tables, analytics hierarchy and chronological chart, team summaries, and admin section navigation. Existing maps, incident details, assignments, audit, user, and settings workflows receive the shared system while retaining their task layouts and permissions.
- Flutter: native theme, form controls, auth pages, four-step reporting flow, reports, notifications, profile, assignments, operation update, results, and recovery screens. Static loading skeletons and useful empty states replace blank loading surfaces. Existing map/detail workflows inherit the theme. Account-scoped drafts and submission recovery remain intact.
- Motion: short local interaction feedback; removed blanket resident entrance/stagger animations. Reduced motion is respected. No decorative looping animation was added.

## Verification actually completed

| Check | Result |
| --- | --- |
| Web `npm test` | 265 tests across 37 files passed; includes TypeScript check |
| Web `npm run build` | Passed |
| Flutter `flutter analyze` | No issues |
| Flutter `flutter test` | 128 tests passed, including report flow at 200% text |
| Browser route evidence | 50 captures across 20 role/route pairs; no recorded page exceptions or horizontal overflow |
| Focused reporting interactions | Invalid-submit focus, native radio arrow keys, incomplete-coordinate prevention, manual multipart source, failed-submit value retention |
| Browser reduced motion | Preference active; zero running animations in the checked report state |
| Native visual evidence | 15 rendered 390×844 Flutter captures using fake repositories |

Logs are in `checks/`; browser records are `evidence/routes.json` and `evidence/interaction-checks.json`. Public/resident and selected staff routes were captured at 1440, 1024, and 390px; admin route coverage includes desktop and phone. Do not infer that every route has every width or state checked.

An independent Impeccable finish reviewer inspected source, recorded interactions, and screenshots. Its original five findings—coordinate confirmation, phone ordering, phone report/map layout, mobile staff branding, and duplicate category controls—were resolved at the observed web scope. It did not independently rerun the interactions or verify physical devices.

## Evidence to open first

- `evidence/landing-final-1440.png` and `landing-final-390.png`: final public page.
- `evidence/resident-report-clean-1440.png`, `-1024.png`, and `-390.png`: clean reporting workspace.
- `evidence/resident-report-final-1440.png`, `-1024.png`, and `-390.png`: validation/retry state; these deliberately show a mocked failed submission. A visible skip link in these keyboard-test captures reflects retained focus.
- `evidence/resident-report-retry-1440.png`: request failure with retained content.
- Other route captures and all Flutter captures are in `evidence/` and `native/`.

The final clean report captures supersede the earlier full-route report screenshots, which still show the category control before the finish review repair.

## Environment and safety boundaries

Project: `/Users/rien/Documents/FINAL_PROJECT`. Preview: `http://localhost:5174/`. The observed Vite server listens on IPv6 localhost; `127.0.0.1:5174` belonged to a separate Dart server. Inspect the running process before treating an unexpected page as this product.

Browser authentication checks used isolated local demo contexts, with runtime guards requiring a `demo-` Firebase project and configured Auth emulator. Production accounts were not used. The final report submission check intercepted POST `/reports` with a deliberate 503 response; it did not create an incident. Native screenshots use fake repositories; their map disables network tiles.

The working tree was already substantially dirty. Preserve prior auth provisioning, duplicate-email handling, validation, demo data, API, rules, export, and Firebase fixes. Baseline source archive before Codex UI edits: `/tmp/rescue-redesign-baseline/source-before-codex.tgz` (temporary local backup). `git diff` includes earlier Claude work, so do not attribute the entire diff to this redesign or reset it.

No commit, push, deployment, production mutation, dependency installation, or production release build was performed. API/rules changes were preserved but their suites were not rerun as part of this UI work.

## Remaining checks and limits

- No Android/iOS device or emulator was available. Native captures are real Flutter test renders, not hardware verification. Device GPS/camera permissions, push delivery, real map tiles, gestures, safe areas, and platform packaging still need device checks.
- Browser checks are sampled rendered routes and focused interactions, not exhaustive end-to-end testing of every mutation, auth failure, permission state, or network failure.
- No full new independent security/backend audit or production auth regression was completed. Prior auth fixes remain in place; do not describe them as comprehensively reverified here.
- Impeccable's local launcher returned permission denied; its written guidance and independent finish review were used, but no CLI ship gate was passed.
- Airen's final aesthetic acceptance remains the next visual decision. Review the actual implementation before making another direction change.

## Continue in Claude

Use `CLAUDE-START.md` beside this document. Begin with independent inspection of the current renders and the remaining verification, preserve the implemented direction and functional repairs, and record new findings with evidence. Complete reviewable fixes without repeatedly stopping after a single milestone. Commit/push/deployment still require Airen's instruction.
