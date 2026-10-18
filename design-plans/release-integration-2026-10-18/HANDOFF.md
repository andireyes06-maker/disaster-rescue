# Release integration handoff (2026-10-18)

## Start here

- Status: verification pass done for G2 management, G3 exports, G4 reconnect (browser-level), G5 Flutter analyze/test. G1 uploads and device checks are BLOCKED on owner input. Full detail: `LEDGER.md` in this folder.
- Spec: `RELEASE-INTEGRATION-SPEC.md` (approved). Plan: `RELEASE-INTEGRATION-PLAN.md`.
- Export fix committed as `82275ad` on branch `fix/export-demo-filename` (from `effd53f`). Nothing pushed or deployed. The main working tree on `build/disaster-rescue` still holds other sessions uncommitted work, including their edits to the same four files; reconcile when merging.
- Suites after this pass: web 52 files / 381 tests pass; `tsc --noEmit` exit 0; API 302 pass, 1 skipped (emulator-only); `flutter analyze` clean; `flutter test` 128 pass.

## Next step (in order)

1. Done: F1 export fix committed (`82275ad`, branch `fix/export-demo-filename`). Merge when reconciling the shared tree.
2. Airen answers three owner questions: non-production Cloudinary cloud name (G1); a physical device or simulator (G5 devices); approved service-area hotline (settings save).
3. F2 product decision: add a visible offline/stale indicator to the realtime pages? Wording and placement need Airen's approval before any change.
4. Not yet run: G2 audit-log entries, responder reconnect, backend-down reconnect, Firefox/WebKit for these flows.

## Gotchas

- The API process was restarted (F1 CORS fix). It must be started with `api/.env` loaded plus `FIRESTORE_EMULATOR_HOST=localhost:8190 FIREBASE_AUTH_EMULATOR_HOST=localhost:9299 FIREBASE_PROJECT_ID=demo-disaster-rescue PORT=3102 CORS_ORIGINS=http://localhost:5174`. Without the emulator overrides it can point at the live project.
- `localhost:5174` has two listeners: our Vite on `[::1]` and a live Flutter `dartvm` on `*`. Browser runs must assert Auth goes to `localhost:9299` before sign-in.
- Demo seed: run `api/scripts/seed-demo.js` directly with the emulator env vars (not `emulators:exec`, which would clash with the running emulators). Five non-scenario reports and three email-less user docs predate this pass and persist after reseed.
- Demotion revokes the target's session, so tests must sign in fresh each round.
- Report inbox rows show the description, not the reference. Locate rows by description.

## Open questions for Airen

- Non-production Cloudinary cloud name, for G1.
- Physical device or simulator, for G5.
- Approved service-area hotline, for settings save.
- Offline indicator: wording and placement, for F2.

## Evidence

- `evidence/g2-management-output.txt`, `g3-exports-api-output.txt`, `g4-reconnect-output.txt`, `g5-flutter-*.txt`, `fix-web-tests-output.txt`.
- Screenshots `g3-*`, `g4-*`. Scripts in `evidence/scripts/`.
