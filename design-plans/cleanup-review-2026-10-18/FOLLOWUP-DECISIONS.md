# Follow-up decisions and scoped verification — 18 October 2026

## Current verification

All 343 entries in the refreshed durable source manifest match the integration files. Re-ran the earlier late-completion model against the repaired implementation: the row remains reconciling when the upload is absent, a provider completion after the former terminal grace is found by a later drain, and the asset is removed. Evidence: late-upload-fixed.mjs / late-upload-fixed.json. This is an in-memory repository/fake-provider test, not real Cloudinary, a real process crash or a new full-suite run. No product code, dependency override, commit, push, merge or deployment occurred in this review.

## Decisions for the next pass

1. Keep the server-generated internal attempt identity for requests without a client key. Preserve API compatibility and ledger tracking. Clearly distinguish tracking one attempt from deduplicating separate client requests: retries without a stable client key can still create duplicates.
2. Interim technical retention: no automatic expiry of unresolved/reconciling records while provider completion remains unknown. Retain the capped daily recheck backoff; expose row count/age and provider-call volume so stalled or costly reconciliation can be reviewed. Final retention/TTL for resolved records remains a separate policy decision. Do not delete uncertainty merely to cap storage, and do not run bulk historical-asset deletion.
3. Approve a separate isolated gRPC override compatibility experiment. Do not change integration package files or its symlinked dependencies until the results are reviewed. Record selected version and dependency range, audit output and actual resolved dependency tree. Check auth/session restore, Firestore listeners and reconnect, permission denial, browser/build behavior and relevant Node consumers. A clean advisory count alone does not prove compatibility. No deployment permission is granted.
4. Keep commas in the storage-failure wording. Re-capture clean 390/1440 evidence for the new responder surface; the known overlay captures are not finished visual evidence. Hosted indexes, provider delivery, native hardware/release builds and owner hotline/privacy policy remain open.

## Port 3110 incident clarification

Read-only inspection found no current listener on port3110. The earlier Codex preview log, `/private/tmp/rescue-release-integration-2026-10-18/design-plans/completion-verification-2026-10-18/preview-stack.log`, records `API listening on 3110`, followed by a Node metadata warning identifying PID3561. That launcher created an emulator-only Node API alongside the temporary web preview. This supports identifying the stopped process as that render API; it does not support the claim that it was a simulator service. A dead PID alone is insufficient to rule out later PID reuse, so no unrelated service restart was guessed or attempted. No processes were stopped or restarted by this review.

Future render launchers must verify ownership, bind success and an application-specific health identity before accepting evidence, and only terminate child PIDs they actually spawned. If a required port is busy, fail or choose an unused port instead of reclaiming it.
