# Rescue Reports — start here

Source: uncommitted integration on base `76e54ff`, branch `integration/redesign-functional-2026-10-18`. Nothing committed, pushed, merged or deployed.

## Status (18 October 2026, late pass)

- Web: 497 passing across 69 files; typecheck clean. The closed responder view shows the newest five updates, then a disclosure; "Load older updates" widens the raw history window.
- API: 421 passing, 24 skipped. The emulator-only files skip in the unit run, and skips are not passes.
- Firestore emulator: adapter suites 19/19; rules 159/159 on a scratch emulator port.
- Flutter: 160/160, analysis clean. Native checks are widget and golden only, not a device.
- Abandoned-photo cleanup is implemented per spec, tested with a fake provider. A `not_found` result is durable reconciliation, never terminal. Unkeyed uploads use a server-generated attempt identity that the client never sees.
- The closed-report query is server-bounded: team, terminal statuses, newest update first, limit 10. Required indexes are in `firebase/firestore.indexes.json`. Hosted index build is a deploy gate and is not verified here.
- Dependencies: web production advisories 11 → 4, all in the firebase / @firebase/firestore / @grpc/grpc-js chain. The gRPC override is NOT applied. `@firebase/firestore` 4.18.0 declares `@grpc/grpc-js` `~1.9.0`; the lockfile resolves 1.9.16. The upstream advisory GHSA-m9gg-hp2v-232j affects `<1.13.6` and `>=1.14.0 <1.14.5`, with patched lines 1.13.6 and 1.14.5. An override is a transitive pin outside the declared range and needs an isolated compatibility experiment first.

## Next

1. Decide: photo requests without a client key stay accepted via the server attempt identity (current), or are rejected (an API contract change needing approval).
2. Decide: the reconciliation retention policy. Rows are never expired and the re-check interval is capped at 24 hours. That has a storage and provider-call cost. Real Cloudinary behaviour is not verified.
3. Run the isolated gRPC override compatibility experiment (auth, listeners, reconnect, rules, browser build). Not started.
4. Native: storage-failure behaviour on a device, and a release build.

## Gates still open (not verified here)

Real Cloudinary upload, private URL and destroy; a real process crash mid-upload; hosted Firestore indexes and listeners; real email and push delivery; hosted WebKit and Firefox; native devices and simulators; approved hotline, privacy and retention copy; release configuration.

## Read in order

- `design-plans/completion-verification-2026-10-18/PAGE-LEDGER.md` (durable ledger, newest sections last)
- `design-plans/cleanup-review-2026-10-18/REVIEW.md` (the review that drove this pass)
- `design-plans/completion-verification-2026-10-18/source-bundle/` (patch, overlay, manifest, checksums, reconstruction)

The original audit in `design-plans/full-audit-2026-10-18/` is frozen. Its findings are historical.

Original worktrees have independent edits; do not overwrite them.
