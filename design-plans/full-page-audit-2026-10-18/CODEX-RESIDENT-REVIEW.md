# Resident continuation review — October 18, 2026

Reviewed Claude's HANDOFF-2026-10-18.md and current source. This is a source/test review, not an independent repetition of Claude's browser, mutation or emulator-persistence evidence.

## Two findings fixed

1. **Unconfirmed report submission claimed definite non-delivery.** A failed fetch/response can occur after the server creates a report; the web request currently supplies no idempotency key. The API already supports an optional key, but that does not deduplicate a keyless web retry. Removed “not sent” assertions. Network and server failures now say receipt could not be confirmed, preserve entered details, and direct residents to check My reports before sending again. Regression tests cover both network/status 0 and status 500 with draft preservation and no automatic retry. This wording mitigates duplicate risk; end-to-end idempotent submission remains a separate task.
2. **Broken-photo fallback persisted after URL replacement.** PhotoImage's failure state never reset when src changed on the same component. The image state now has a source-keyed child, so a replacement URL gets a fresh load attempt. Added a failing-photo → replacement-URL regression test. Existing clickable attachment wrappers and fallback text remain.

## Correction to the report

The no-approved-retention-policy explanation appears in a developer comment in ReportForm.tsx, not in rendered form copy. No such wording was added to the product. beforeunload protects reload/tab close only; it does not establish a client-side route-navigation guard. Persistent drafts remain unimplemented. Do not claim all forms of leaving the route are protected or that a browser-native leave dialog proves draft recovery.

## Current checks

361 web tests across 52 files pass, TypeScript clean; production build succeeds. Logs copied alongside this record. No new browser check or Cloudinary upload was run by Codex in this review. Preserve Claude's evidence with its real/mocked distinctions.

## Remaining work

- Non-production Cloudinary configuration and real photo-upload persistence.
- Long-history fixture and visual/task review.
- In-app navigation warning if required; verify the intended unsaved-data behavior rather than assuming beforeunload covers it.
- Connect web retries to the existing backend idempotency contract and test an accepted report whose response is lost. Reuse one submission key for the same attempt; do not accidentally reuse it for changed report content.
- Claude's incident/dashboard/responder/Admin follow-ups remain as recorded. A local fixture copy migration from the preceding pass is not evidence of a working Admin save flow.

Nothing committed, pushed or deployed. No emulator or production writes performed in this source/test review.
