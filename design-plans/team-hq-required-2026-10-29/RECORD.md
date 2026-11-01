# Required team headquarters, 29 October 2026

User request interpreted as requiring an HQ location before team creation. Previously both UI and API allowed a missing headquarters.

## Changes
- Teams create form requires a selected HQ; missing selection shows an alert and focuses the map region without sending a request.
- HQ has a required marker, clear instructions, map pin and current-location options. Removed the contradictory create-without-HQ instructions.
- POST /teams rejects missing/null HQ with 400 hq_required before persistence. Existing Philippines validation remains. No existing team data or PATCH behavior changed.
- Updated success fixtures to supply HQ, retained busy-button focus coverage.

## Verification
- New UI regression failed against the old form (it created the team instead of showing the alert), then passed.
- New API missing/null regressions returned 201 before the fix and 400 after it. Initial sandbox run could not bind localhost; the authorized loopback rerun confirmed the actual failures.
- Full web: 655/655, 85 files. Typecheck clean; production build succeeds with existing bundle-size warning.
- Full API: 658 passed, 36 skipped, 77 passing files / 9 skipped files.
- git diff --check clean.
- No browser visual or production submit performed in this pass. Flutter unchanged.

No commit, push, deploy or production-data change. Existing submission packs and manifests remain historical snapshots and do not include this change.
