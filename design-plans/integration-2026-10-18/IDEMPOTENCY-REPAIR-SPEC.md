# Report retry repair spec

Status: proposed implementation brief, October 18, 2026. This document changes no product code and grants no commit/push/deployment authorization.

## Problem and outcome

The report service creates a report and then completes its submission claim in separate writes. Round 3 reproduced two reports after completion failed and a same-key retry reclaimed the claim after 120 seconds. The client stores its key in a React ref, so it cannot reuse it after reload. The repository also replaces stale claims without first enforcing their existing fingerprint binding.

Required outcome: for a given authenticated account and submission key, successful persistence produces at most one report, with a replayable response. Matching retries after a lost response, expired lease, or server restart return that same report. Changed content using that key is refused. The browser can recover an unchanged attempt's key after a same-tab reload without storing report text, contact data, coordinates or photos.

This is a submission-persistence guarantee, not a promise of exactly-once email/push, cross-tab intent detection, indefinite browser persistence, or full draft recovery.

## Backend design requirements

1. Bind the claim to account, key, immutable server fingerprint and a reserved report ID. Enforce fingerprint equality before any stale-claim takeover; expiration must not permit rebinding a key to different content. Preserve actual-byte photo hashing.
2. Persist the report and completed claim/result in one Firestore transaction. The transaction must observe the current claim and existing reserved report before deciding its outcome. Transaction retries must not create new report IDs, perform uploads or send notifications.
3. Use an ownership token/generation for pending work if a lease permits takeover. A worker whose ownership was replaced must not commit. Two workers crossing the 120-second boundary must still produce one report. Returning the completed winner's response is acceptable for an unchanged retry.
4. Keep Cloudinary uploads outside transaction callbacks. On a lost race or failed commit, remove only assets uploaded by that losing attempt. Never remove the winner's photos. Preserve existing upload-failure behavior and retry-safe response wording. Document crash orphan cleanup limits if no durable cleanup mechanism exists.
5. Keep audit/notification side effects after successful commit and ensure a completed replay does not run the creation side effects again. Do not claim guaranteed delivery or exactly-once side effects across a crash; that would need its own durable delivery design.
6. Preserve existing API response shape, authorization, photo limits and no-key clients. Do not require mobile changes merely to retain their existing supported behavior.
7. Handle legacy claims explicitly. Existing completed claims remain replayable. Older pending claims may have no reserved report ID and may already have created a report: do not blindly expire/recreate them. Return a safe unresolved-submission response unless their result can be established. Do not delete existing reports or migrate production data in this task.

## Browser design requirements

1. Store only a versioned key, stable content digest and minimal retry bookkeeping in sessionStorage, scoped by authenticated UID and Firebase project/API environment. Never store raw fields, photos, auth tokens or passwords. Do not use localStorage or silently introduce persistent drafts.
2. Compute a stable digest from normalized submitted fields and actual file contents, including file order. WeakMap File identities cannot establish equality after a reload or reselect. Keep the API fingerprint authoritative.
3. When an identical unconfirmed payload is re-entered/reselected in the same tab after reload, reuse its retained key. New content gets a new key. Preserve unconfirmed mappings when switching between edited payloads so returning to an earlier unchanged attempt can safely retry it. Document bounded storage and expiry policy; never silently expire an ambiguous attempt and resend it as new.
4. Clear an attempt on confirmed success. Deliberate later submissions are new intents. Clear or isolate data on account/environment change and sign-out; a new user must not reuse another user's attempt. Handle unavailable/corrupt/full storage without crashing; retain in-memory behavior and accurately disclose the reload limit in that case.
5. Prevent duplicate activation while asynchronous hashing/storage/preflight work is pending. Preserve focus, busy labels, inline icon errors, required marks, report values, normal motion, unsaved-navigation warning and existing form accessibility.
6. Keep the visible statement that drafts are not saved accurate. Reload does not restore typed content or attachments; after manually re-entering the same payload, the retained key protects that retry. Do not promise draft restoration.

## Acceptance checks

| Scenario | Required evidence |
|---|---|
| Atomic commit fails before persistence | No report and no completed claim; safe retry succeeds once |
| Commit succeeds but response is lost | Same-key retry returns original ID/reference; one stored report |
| Concurrent matching requests | One report, same eventual result; pending response allowed |
| First worker exceeds lease while retry takes over | Old worker cannot create a second report or remove winner photos |
| Server restart and expired lease | Matching retry still produces/replays one report |
| Different body or equal-size different photo bytes | 409 conflict for reused key, including expired claims |
| Completed replay | No second creation audit/notification side effects |
| Legacy unresolved pending claim | Safe refusal/reconciliation; no blind duplicate |
| Legacy completed/no-key clients | Existing supported behavior remains |
| Same-tab reload, manually re-enter same payload and reselect same photo | Browser sends original key; one real emulator report |
| Edited fields/photos; edit away and back | Correct content/key binding and retained ambiguous attempt |
| Account/environment switch, storage denied/corrupt | No cross-user/environment key reuse, crash or false guarantee |
| Storage content inspection | No raw report/contact/location/photo/token data |
| UI behavior | Form focus/busy/errors and unsaved navigation still work |

Use meaningful service/API tests, real Firestore emulator concurrency tests, and a browser reload/lost-response case. Inject commit/transport failures explicitly and label injected behavior. Test the transaction adapter rather than relying exclusively on a fake repository. Use a controllable clock or seeded expired timestamps instead of waiting two minutes per test.

Run the full API/web/rules suites, typecheck/build and relevant Chromium/Firefox/WebKit retry cases. Record exact source identity and test counts. Update the handoff and regenerate the durable overlay/patch/manifest after product changes; the existing archive describes the pre-repair integration.

## Separate Flutter test infrastructure task

Track reviewed golden PNGs in `mobile/test/goldens/` and point matchesGoldenFile there. Add provenance (source revision, Flutter/platform/font setup and generation command). Start with the existing references; do not regenerate them to conceal differences or describe the old baseline as approval of the latest mobile design. A clean checkout must run the golden tests without external symlinks. Include only sanitized fictional fixtures. Actual current-design visual review and device verification remain separate work.

## Release boundaries

Use only isolated emulator/test resources. Preserve both original worktrees and the current redesign. No production credentials, invented hotline, commit, push or deployment is authorized by this spec. Missing external service/device configuration remains a named gate, not grounds to fabricate a pass.
