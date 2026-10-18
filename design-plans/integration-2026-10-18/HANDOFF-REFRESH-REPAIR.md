# Integration refresh: report retry repair and Flutter golden infrastructure (18 October 2026)

Start here. Earlier handoffs describe the pre-repair integration. The archives named `pre-repair-*` are superseded.

## Source identity

- Worktree: `/private/tmp/rescue-release-integration-2026-10-18`, branch `integration/redesign-functional-2026-10-18`.
- Base: `76e54ff` (functional fix branch). Everything below is uncommitted on top of it. No commit, push, merge or deployment.
- Current artifacts: `integration-overlay.tar.gz` (291 files), `integration.patch` (applies with `git apply` to a clean `76e54ff`; verified against a fresh clone with 0 byte mismatches), `source-manifest.json` (per-file SHA-256), `SHA256SUMS.txt`.
- Pre-repair artifacts: `pre-repair-integration-overlay.tar.gz`, `pre-repair-integration.patch`, `pre-repair-source-manifest.json`. Do not restore from these for the repair.
- Original worktrees were not modified: `/Users/rien/Documents/FINAL_PROJECT` (branch `build/disaster-rescue`, HEAD `effd53f`) and `/Users/rien/Documents/FINAL_PROJECT-fixes` (HEAD `76e54ff`, clean).

## What changed

### Backend (API)

- `api/src/domain/submission.js` (new): pure decisions shared by the fake repo and the Firestore adapter. `decideClaim` (run, replay, pending, conflict, unresolved), `decideCommit` (commit, replay, fenced), `decideRelease`.
- `api/src/services/reportService.js`: rewritten. A claim reserves a report id and reference. Uploads run outside any transaction. One transaction writes the report and completes the claim. Audit and notification run only after a commit this request made. A lost commit reply is resolved by reading the claim. Only a proven "not committed" releases this attempt's photos. Legacy pending claims without a reserved id are refused as `submission_unresolved` and never recreated. Clients without a key behave as before.
- `api/src/adapters/firestoreRepo.js`: `claimSubmission`, `commitSubmission`, `releaseSubmission` and `getSubmission`, each one transaction. `completeSubmission` is removed.
- `api/test/fakes/memoryRepo.js`: the same operations, one synchronous step each. A test-only `seedSubmission` writes legacy claims.
- `api/src/ports/repo.js`: method list and typedefs updated.
- `api/package.json`: `test:submission-emulator` (runs the real Firestore emulator suite; the config path can be set with `SUBMISSION_EMULATOR_CONFIG`).

### Browser

- `web/src/features/resident/submissionAttempts.ts` (new): SHA-256 digest of normalized fields and each photo's bytes, in order. A per-account, per-project, per-API bounded store (5 entries) in `sessionStorage`, with an in-memory fallback. Stores only version, digest and key.
- `web/src/features/resident/ReportForm.tsx`: the File-identity fingerprint is removed. The digest is computed inside the busy guard. Entries are cleared only on a confirmed send or a refusal of the content (400, or 409 for a reused key). An evicted entry shows a notice. The note now says drafts are not saved and that a reload clears them.
- `web/src/auth/AuthProvider.tsx`: `useOptionalUid()`, so the form works without a provider in tests.

### Flutter golden infrastructure

- `mobile/test/goldens/`: the 15 references copied unmodified from `design-plans/codex-redesign/native/`, with `SHA256SUMS.txt` and `PROVENANCE.md`. The provenance says these are a legacy set. They are not approval of the current design, and the generation command is not on record.
- `mobile/test/redesign_visual_test.dart`: references now load from `goldens/<name>.png`. The external `design-plans` link is gone.
- `mobile/test/draft_store_test.dart`: a realistic phone fixture replaced with `09170000001`.

## Verification

Injected failures and real emulator evidence are listed separately.

| Check | Result | Kind |
| --- | --- | --- |
| API full suite | 342 passed, 8 skipped (emulator-only files) | mixed: fakes and injected faults |
| Domain decisions | in the API suite | pure |
| Service atomicity, lost reply, lease takeover, content binding, legacy, no-key | in the API suite, 13 tests | injected faults labelled `[injected]`, controlled clock |
| Firestore emulator suite (7 tests): 6-way concurrent race, injected pre-commit failure, injected lost reply, stale-worker fencing, restart replay, rebinding refusal after expiry, legacy unresolved | 7 of 7 on two runs | real Firestore transactions. The fencing and expiry cases use seeded timestamps, not waiting |
| Firestore rules | 128 of 128 | real emulator |
| Web full suite | 425 passed (62 files) | jsdom plus injected transport failures |
| Attempt store and digest unit tests | 13 passed | pure, with injected storage faults |
| Form retry behavior (reload, edit-away-and-back, account switch, cleared on success, storage denied, storage contents, double activation) | 7 passed | jsdom, injected storage and transport |
| Web typecheck and production build | pass | |
| Browser lost-reply and reload retry on the integration stack (real emulator) | Chromium 8 of 8, WebKit 8 of 8. Firefox blocked: see limits | real emulator with one injected lost reply (the server commits, the response is aborted) |
| Accessibility (axe, WCAG 2.x A/AA) on the report form, empty and after invalid submit, 390 and 1440 px | 0 violations; focus moves to the first invalid field; 3 invalid markers; 4 required marks | real page |
| Flutter analysis and tests, with references tracked inside `mobile/test/goldens` | analysis clean; 128 of 128 | Flutter tests on the host, no device |
| Clean checkout | patch applies to a fresh clone at `76e54ff`; 0 byte mismatches across 167 changed or new files | |

Test timing note: the emulator race test had a default 5-second timeout and failed once at 5013 ms on the emulator. Its timeout is now 30 seconds, and it passed on two later runs. The assertions are unchanged.

## Real and injected evidence, kept separate

- Real emulator, not injected: the race, restart, fencing, rebinding, legacy, and the browser reload retry (apart from the one injected lost reply per engine).
- Injected: commit failure before persistence, lost commit reply, lease expiry with a stalled worker, upload failure, storage denied or corrupt, and the transport failure in the browser. Each is labelled in its test and in `retry-browser.json`.

## Idempotency: what is now guaranteed, and what is not

Guaranteed for one account and one key, when the server and emulator behave as tested:
- At most one report is persisted for a key and its content.
- Matching retries after a lost reply, an expired lease, or a server restart return the same report id and reference.
- A reused key with different content (including equal-size photos with different bytes, and after expiry) is refused.
- A stale worker cannot commit after a takeover, and cannot remove the winner's photos.

Not guaranteed (state these in any summary):
- Crash after a photo upload but before the commit leaves orphaned photos. There is no durable cleanup job.
- Crash after the commit but before audit or notification leaves the audit entry or the dispatcher notification missing. Exactly-once side effects need their own delivery design.
- The browser key survives a same-tab reload, not a closed tab, a new device, or an evicted entry. Entries are capped at 5 per account and deployment, with no time expiry. An evicted entry shows a notice and is not reused silently.
- A claim document is kept without expiry (LOW-002).

## Security review (security-review skill applied to the diff)

No high-confidence vulnerabilities. Open items:
- VERIFY-001 (medium): the claim id is `${uid}__${key}`, and keys may contain `_`. A UID containing `__` could collide with another account's claim. Firebase UIDs do not contain underscores in practice, but custom UIDs are not excluded. Recommended fix: nested `submissions/{uid}/keys/{key}`, or a hashed id. Not changed in this pass.
- LOW-001: a SHA-256 of short free text in tab storage could be checked against guesses by someone with access to the device and the tab. No exposure beyond the form.
- LOW-002: claim documents are never expired.

## Blocked gates (explicit; not passed)

- Cloudinary photo upload: the integration stack has no Cloudinary configuration, so uploads return `500 internal_error`. Upload failure leaves no report and releases the claim, which is the intended retry-safe behavior. A real upload and photo lifecycle remain unverified. Photo bytes are covered only by API tests with a fake uploader.
- Firefox request interception: blocked. The installed Firefox build does not accept Playwright 1.64's request-interception parameters (`bypassServiceWorker`). The Firefox retry case is recorded as blocked, not passed.
- Hosted WebKit (non-production Firebase): not available.
- Email and push delivery: no non-production target. Emulator out-of-band codes are not delivery evidence.
- Physical devices and Flutter on hardware: no phone attached.
- Hotline number and resident wording: owner must supply. None was invented.
- Flutter golden references: legacy set. They confirm the current screens match the earlier references. They do not certify the current mobile design.

## Skills

- Used: `superpowers:verification-before-completion` (evidence before claims for this handoff); `security-review` (applied manually to the diff; findings above).
- Not loaded: `superpowers:test-driven-development`. The backend and browser code were written before their tests, and the tests were then run against them. Failures were fixed in the test where the new contract changed, and no failing test was weakened to pass.
- Not loaded: `frontend-design`, `fixing-accessibility`. Accessibility was checked with `@axe-core/playwright` directly, not through the skill.

## Next steps

1. Decide on VERIFY-001 (nested claim layout) and whether to implement the orphan and side-effect limits as their own spec.
2. Commit scope and deployment authorization remain with the owner. Nothing here is committed.
3. For the blocked gates above, supply the external configuration named in each item.
4. Tracking the Flutter goldens in the repo happens when the integration is committed. The overlay already contains them.
