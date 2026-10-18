> Completion update: the web finishing items below have now been worked through. Read [the newest handoff](../web-redesign-finish-2026-10-18/HANDOFF.md) for current status, evidence and release limits.

# Completed visual fixes and Claude handoff — October 18, 2026

## Start here

The three findings from `design-plans/visual-motion-audit-2026-10-18/REPORT.md` have been implemented. This record supersedes that report's open M1/V1/M2 status within the evidence below. The prior all-page audit is still the page ledger; this implementation pass verifies the changed surfaces rather than claiming another all-route review.

Nothing committed, pushed or deployed. Current shared working tree is intentionally dirty. Preserve all existing changes. Production and the separate Flutter/live-config process at 127.0.0.1:5174 were not used.

## Changes

| Finding | Completed change | Source owners |
| --- | --- | --- |
| M1 — validation overlap | Changes to error/banner feedback now place controls directly in their final layout, preventing inverse FLIP transforms from moving controls across new error text. Local fully opaque feedback motion remains. Ordinary layout changes with unchanged feedback still use the existing 220ms FLIP. Values, focus, validation associations and repeat-submit guards are preserved. | `web/src/components/MotionForm.tsx`, `MotionForm.test.tsx` |
| V1 — secondary typography | Notification unread text, timestamps and row actions are 13px. Landing film chapter labels/numbers, scene caption and phone feature promise use the existing 13px secondary scale. Wrapping remains responsive; decorative miniature internals and tiny bell counter were not globally enlarged. | `web/src/features/resident/notifications.css`, `web/src/pages/landing.css` |
| M2 — slow-start exits | Bell, dialog, overlay and custom-select close styles use the existing `cubic-bezier(.16,1,.3,1)` response curve. Bell exit remains 160ms; dialog/overlay 140ms; select 120ms. | `web/src/components/product-motion.css` |

`DESIGN.md` now describes the validation exception accurately: ordinary layout motion remains, while inserting/clearing feedback does not sweep fields through it. Keep the existing approved Geist/violet/deep-indigo design, landing film, meaningful route motion, bell ring and row stagger. This is not a request for another aesthetic reset.

## Verification

- Full web suite: **377 tests, 52 files pass**; `npm test` includes a clean type check. Updated the regression to verify validation insertion/removal does not translate controls while retaining values/focus/ARIA. Added one test proving ordinary layout motion remains. Existing shared consumer tests pass.
- Scratch production build passes. `git diff --check` clean. No new dependencies.
- **Eight frame-sampling runs:** login and registration × Chromium/WebKit × 390/1440. Zero error/control rectangle intersections across the sampled entry frames. The audit previously reproduced up to 20.14px of overlap. See `validation-frames.json`.
- **40 interaction checkpoints:** Chromium/WebKit × 390/1440, covering registration error appearance, settled layout and error removal, login errors, bell entry/open/exit/reopen, and resident forward/back navigation. Zero document overflow. No `form-reflow` runs during those validation changes; local feedback animations remain. Bell exit keyframes use the new curve in all four combinations. The forward/back workspace still moves from +10px/−10px. See `interactions-ready.json`.
- Typography probes at 390/1440 confirm the changed landing/bell text resolves to 13px. Phone and desktop screenshots captured. Current phone registration entry/settled states, notification panel and lower landing were visually inspected. See `craft-probes.json` and PNGs.
- Staff overlay checks are recorded separately in `overlays.json`: Reject and Assign team on suitable current local reports; empty assignment validation only, no assignment submitted. The script verifies exit easing/duration, focus return, and reopen during exit. Native team select is not a custom-select-animation test.
- Scripts and logs are alongside this file. Browser walkthrough videos are saved but were not watched end to end; screenshots and actual in-page animation/frame records were used for review. Screenshots do not prove real-device frame performance.

Normal-motion browser checks only, as Airen requested. Existing preference behavior is preserved; no reduced-motion browser pass was performed. The full unit suite still contains its existing preference tests.

## Audit scope that remains open

The three targeted findings are addressed. That does not certify every route/state for release. Carry forward the page ledger and remaining gaps from `design-plans/audit-round2-2026-10-18/HANDOFF.md` and the visual audit report:

- Expanded Admin Teams/health/settings/audit interiors and every saving/error/live-refresh animation still need a comprehensive visual walkthrough. The prior normal page captures show closed sections, not proof of their interiors.
- All shared MotionForm consumers receive the correction; login/register and assignment dialog have fresh browser checks. Report form, account/settings/team forms and all error combinations were not individually frame-sampled in this pass.
- Custom-select exit styling changed consistently, but no freshly exercised custom-select runtime is claimed. Staff assignment uses a native select. No full Firefox, physical-device or native Flutter pass was run.
- No GPU/frame-time performance trace, screen-reader speech audit, real subscription reconnection/stale transport test or complete animation-interruption matrix.
- Actual photo upload still needs non-production Cloudinary. Real account/team/settings persistence and concurrency, export contents, complete historical transition data and backend idempotency body matching/reload behavior remain open. Beforeunload protection does not guard in-app navigation.
- No invented hotline, official affiliation, response guarantee, privacy promise or app-store availability. Preserve the approved fictional Harbor content and removal of public school/demo placeholders.

## Environment and tooling

React is reviewed at `http://localhost:5174`. Assert Firebase `demo-disaster-rescue` and Auth emulator before signing in. Auth emulator 9299, Firestore 8190, local API 3102. Do not use 127.0.0.1:5174, which is a separate live-config Flutter process. Local account addresses are recorded in the earlier product-copy handoff; do not use production accounts or credentials. This pass made no product writes; scripts block API mutations after authentication.

The owner explicitly authorized implementation after the read-only visual audit. No further design-direction interview was needed. Relevant skill guidance was used; there is no fresh Impeccable detector result. If a design sidecar needs synchronization after DESIGN.md changed, follow its actual instructions and report the result honestly rather than suppressing the warning broadly.

## Next session

Read `CLAUDE-PROMPT.md` in this folder, this handoff, the prior visual report and the latest page ledger before editing. Validate this working tree rather than assuming historical test counts apply. Continue with the remaining expanded Admin and shared form/state visual coverage, fixing demonstrated defects. Do not commit, push or deploy unless Airen asks.
