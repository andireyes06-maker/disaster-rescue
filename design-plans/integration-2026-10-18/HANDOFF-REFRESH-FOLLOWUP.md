# Integration refresh: Codex retry-review follow-up (R1, R2, R3)

Start here. This supersedes `HANDOFF-REFRESH-REPAIR.md` for the retry work. Source: `/private/tmp/rescue-release-integration-2026-10-18`, branch `integration/redesign-functional-2026-10-18`, base `76e54ff`, all uncommitted. No commit, push, merge or deployment. Both original worktrees were not modified.

Artifacts (current): `integration-overlay.tar.gz` (297 files), `integration.patch` (applies to a clean `76e54ff` checkout; verified with 0 byte mismatches), `source-manifest.json`, `deleted-paths.txt`, `SHA256SUMS.txt`. Earlier versions are `pre-followup-*` and `pre-repair-*`.

## What changed

**R2  - claim identity (API).** `claimDocId(uid, key)` is the SHA-256 of the canonical JSON pair `[uid, key]`, so no two account/key pairs share a document. Legacy records under the old `uid__key` text are read only when their stored `uid` is the caller (ownership check). A legacy record can replay, conflict, wait or be reported unresolved, never taken over. Stored claims must match `uid` and `key`, and commit, release and read refuse a mismatched owner. The in-memory fake uses the same addressing. Atomicity, fencing and the generation rules are unchanged.

**R1  - no automatic eviction (browser).** The attempt store no longer evicts. When `ATTEMPT_LIMIT` (5) unconfirmed versions are held, a new version is blocked: it is not sent, and the form says so, offers "Check My reports", and offers "Forget these unconfirmed sends" as an explicit person-chosen action. The original payload keeps its key, so retrying it reuses that key.

**R3  - confirmed keys and replays (API + browser).**
- The API marks a reply that came from a completed key with header `Idempotent-Replayed: 1`. The body shape is unchanged, and the header is exposed through CORS.
- The form does not navigate silently on a replay. It shows an explanation, focuses it, and offers "Open the report" (which clears the key) or "Send as a new report" (which drops the key and sends fresh).
- `confirm`/`forget`/`forgetAll` return `persisted`. The form shows a memory-only notice when the last write did not reach storage. A failed removal leaves its entry on disk; the next successful write drops it.
- Behavior change to know about: a retry after a lost reply now shows the replay notice and needs one click to open the report. It no longer opens the report automatically.

## Reruns (this turn)

| Check | Result |
|---|---|
| API full suite | 344 passed, 14 skipped (emulator-only files) |
| Firestore emulator suites (`npm run test:submission-emulator`, two files) | 13 of 13 |
| Identity regressions against the pre-fix adapter (red check) | 4 failed, 2 passed (the two guards for legacy records owned by the caller) |
| Identity regressions against the fixed adapter | pass on the emulator |
| Replay header (API route + CORS) | pass |
| Web full suite | 436 passed (64 files) |
| Web typecheck and production build | pass |
| Firestore rules | 128 of 128 (isolated emulator) |
| Chromium resolution scenario, real API + emulator, injected lost replies and storage denial | 11 of 11 |
| WebKit resolution scenario | 11 of 11 (run alone, within the submission limit) |
| Chromium and WebKit lost-reply retry (updated to the replay flow) | 9 of 9 each |
| Accessibility (axe) on the report form base states, 390 and 1440 px | 0 violations |
| Flutter | not rerun (no Flutter change in this turn) |

Firefox: blocked. The installed Firefox build does not accept Playwright 1.64's request-interception parameters, so the lost-reply injection cannot run there.

## Test changes to know about (not weakened)

- The admin audit test had a time-dependent check (`/09/`) that matched the timestamp hour. It now checks for an 11-digit phone pattern (`\b09\d{9}\b`) and keeps the password and token checks. This was a pre-existing flake, not part of the retry work.
- The emulator suite's `test:submission-emulator` script now runs every file under `test/adapters/submission`.
- The emulator race test keeps its 30-second timeout from the earlier round.
- The memory-only form test was tightened to the new notice wording before I observed it fail. It passes now. I did not observe that tightened version fail.

## Remaining limits (state these in any summary)

- **Orphaned photos** after a crash between upload and commit, and **post-commit audit or notification loss** after a crash. Unchanged; they need their own design.
- **Claim documents never expire** (LOW-002). Unchanged.
- **Browser key survives only the same tab's reloads.** A closed tab, another device, or a blocked write falls back to the explicit replay notice or the memory-only notice.
- **Real storage quota** is not exercised in a browser; storage denial is injected.
- **Legacy claims** are tested with seeded records only. No production legacy data was inspected.
- **Blocked, not passed:** Cloudinary photo upload (no configuration), email and push delivery, hosted WebKit (no non-production Firebase), physical devices, Firefox interception, the hotline number and wording (owner input).
- **Security:** VERIFY-001 (UID delimiter collision) is resolved by the hashed identity. LOW-001 (digest guessing from tab storage) remains and is accepted: it adds no exposure beyond the form.
