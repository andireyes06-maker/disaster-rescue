# Continuation review — 18 October 2026

The current 339-file durable source manifest matches all corresponding integration files. This review did not edit product code, apply an override, rerun full suites, commit, push, merge or deploy. The newly reported 481/415/159/160 totals are the continuation author's evidence, not independent reruns in this review. Security Review skill used for upload ownership and dependency context; findings below are correctness/completeness gaps, not claims of unauthenticated exploitation.

## C1 — Late completion after terminal grace can escape cleanup

Confirmed with the existing in-memory repo and fake provider. Reserve an asset, leave its upload held, run cleanup after the 10-minute deadline, then again after the additional 15-minute not-found grace. The ledger becomes `deleted` with `nextAttemptAtMs: null`. Simulate the API process having died by leaving no request continuation, then let the provider finish the held upload. A later drain checks zero entries, leaving the asset present.

See late-upload.mjs and late-upload.json. This is a controlled fake-provider timing/crash model, not a real Cloudinary crash experiment. Code: `api/src/domain/photoLedger.js` planDestroyOutcome, `services/photoCleanupService.js`, `adapters/cloudinaryUploader.js` withWait. The timeout wrapper rejects but does not establish that the provider cannot complete later. The spec explicitly requires cancellation/unknown-result reconciliation and says uncertain tombstones must not expire prematurely.

Required repair: keep unknown outcomes eligible for durable reconciliation until completion/cancellation is established, or enforce a proven provider-side completion boundary before making not-found terminal. Test completion after the current full deadline-plus-grace with no live request continuation. Do not simply increase the timer. Keep committed/winning assets protected transactionally.

Unkeyed uploads are also still outside the ledger, as the author disclosed. Track every new upload through a server-generated internal attempt identity when no client key exists, without implying that such a key deduplicates separate client retries; alternatively explicitly reject photo submissions without a key as a reviewed API contract change. Do not claim complete orphan protection while that path remains untracked.

## C2 — Closed detail drops access to older history

`web/src/features/responder/ClosedReportDetail.tsx` calls the newly bounded useReportUpdates but passes only updates/error into ClosedReportDetail. It does not expose hasMore/loadOlder. The hook limits the initial window to 20 raw update rows and filters acknowledgement rows afterwards. Reports with more than that cannot expose older progress in this responder view, despite the general bounded-history claim.

Add read-only Load older updates, loading/error/retry feedback and tests using hasMore=true. Read-only means no operational writes; a history navigation button is appropriate. Existing test asserting zero buttons must be narrowed to forbid operational actions rather than all controls.

## C3 — Recently closed is display-bounded, not query-bounded

`useClosedTeamReports.ts` listens to every report with the team's assignedTeamId, filters terminal reports and sorts in memory. AssignmentsPage slices ten afterward. The new second listener repeats the same unrestricted team query used for open assignments. The displayed ten-item cap therefore does not cap returned documents or client processing.

Use a server-bounded closed-report query with the necessary indexes and emulator/hosted-index verification, or a deliberately bounded shared data source that supports both surfaces. Do not treat merely removing the duplicate listener while still downloading all team history as a complete read-volume bound.

## Dependency decision

The current lockfile has Firebase13.0.0 / Firestore4.18.0 and grpc-js1.9.16. Firestore declares grpc-js `~1.9.0`. Override1.13.7 is outside that range, so do not approve integration use based only on advisory count. Approve an isolated compatibility experiment, then assess auth, listeners, reconnect, browser exports, builds and any Node consumers. No claim that 1.13.7 is the only patched release: the [gRPC maintainer advisory](https://github.com/grpc/grpc-node/security/advisories/GHSA-m9gg-hp2v-232j) lists 1.13.6 and1.14.5 as patched lines. That advisory describes a server authentication configuration; an application exploit here has not been demonstrated. [Firestore's upstream package definition](https://raw.githubusercontent.com/firebase/firebase-js-sdk/main/packages/firestore/package.json) also declares the narrow grpc range at review time. Neither source proves override compatibility.

## Decisions and record keeping

- Commas are acceptable; keep them. No need to reintroduce an em dash.
- Keep the closed view read-only and current-team scoped; fix its pagination and query scaling before calling it finished.
- Ten-minute/60-second/15-minute values can be provisional local test defaults, not a verified production cancellation or retention boundary. Real provider validation remains open.
- The durable completion ledger has the newer continuation entries. The integration's own completion ledger and root HANDOFF still show the older 456/155 pass. Synchronize the start-here pointers and current disposition when regenerating the next bundle; do not rewrite frozen historical evidence.

Provider delivery/uploads, hosted WebKit/Firestore, native devices and release gates remain unverified. Reconstruction proves source identity, not those gates.
