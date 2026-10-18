# Release integration verification: plan

Spec: `RELEASE-INTEGRATION-SPEC.md` (approved by Airen, 2026-10-18). Owner answers to section 7 are still outstanding, so G1 and device checks stay BLOCKED until given.

## Phases

- **P0 Preflight (no writes).** Assert the stack: 5174 served by our Vite, emulator project `demo-disaster-rescue`, Auth 9299, Firestore 8190, API 3102. Record report counts and staff accounts.
- **P1 G2 Management persistence and concurrency (emulator writes).** Team create and rename; user role change; last-admin refusal; two concurrent admin demotions. Read back after each. Then re-seed.
- **P2 G3 Exports.** CSV and PDF as dispatcher, DMO, admin; resident refused. Compare CSV to stored reports. Then one UI download in Analytics.
- **P3 G5 Flutter.** `flutter analyze` and `flutter test` in `mobile/`. Device check recorded as BLOCKED.
- **P4 G4 Reconnect (browser, emulator).** Offline/online toggle on dispatcher dashboard, resident detail and responder assignments, with an API write made while offline. Re-seed after.
- **P5 G1 Uploads.** BLOCKED pending a non-production Cloudinary name. Contract-only checks labelled MOCKED.
- **P6 Ledger and handoff.** Write `LEDGER.md` and a HANDOFF. No commit (spec says no commit without explicit authorization).

Evidence: `evidence/`. Scratch scripts: scratchpad only.
