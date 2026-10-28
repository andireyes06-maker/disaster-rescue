# History

Earlier handoff, moved here on 27 October 2026.

# Current release handoff, 23 October 2026

- Source: this worktree, branch `fix/release-professor-2026-10-23`.
- Integrates professor clarification `02ba92e` with the reviewed Flutter redesign and APK fixes from `6dbe760`. The previous `/private/tmp/rescue-release-integration-2026-10-18` folder no longer exists.
- Target: admin web; resident/responder Flutter. Dispatcher/DMO records retained, API and staff reads refused. No automatic promotion or data migration.
- Admin queue and responder assignments are oldest first. Validation is manual, with validator/time and audit records.
- CI on `02ba92e` failed two emulator notification tests: they still seeded dispatcher recipients after delivery moved to admin. Repair verifies recovery and read-state preservation for admin recipients.
- Reviewed native harbor layout, font, navigation, golden references, emulator-host fix and hidden debug ribbon are preserved in this integration.
- Deployment blocker identified: Claude Code auto-mode classifier rejected production commands. No explicit deny rule was found; permission settings are not modified.
- Release checks and deployment outcomes: `docs/release/2026-10-23-repair.md`. Read that file for current results and remaining gates.
- Do not archive dependencies, credentials or scratch tokens. Only stop owned processes.

## Live result

- API/web and Firestore rules are deployed. API source `35760d8`; all remote CI jobs green.
- Jose Reyes is now admin under the owner's delegated choice. His existing login is unchanged; sign out/in to refresh a pre-existing session. Other accounts were not promoted.
- Admin-only staff access, FIFO queue, validation and mobile report reads verified. DMO refusal verified after rules publication.
- Vercel uses locked npm ci, and its source fingerprint matches the tested worktree. `.vercelignore` keeps native outputs out of web uploads.
- Delivery: `/Users/rien/Documents/FINAL_PROJECT/SUBMISSION-2026-10-20/Android/Rescue-Reports-Online-2026-10-23.apk`. Debug-signed group test build, not a store-signed release.
- Older presentation media must be re-recorded for the new admin-only workflow; see release record.


---

## Archived from HANDOFF.md on 28 October 2026 (evening)

# Handoff: I-Report, 27 October 2026

> Session: I-Report product work (rebrand, admin, responder, resident apps). Branch `build/disaster-rescue`, last commit `35e2c81`.

## Start here
- **28 October, latest:** APK `SUBMISSION-2026-10-20/Android/I-Report-2026-10-28-update11.apk` (SHA-256 `153c833a…4e4364`), a debug build of local commits, with production API and Firebase values passed as defines. Not tested on a device. Local commits not yet on `build/disaster-rescue`: the push was denied by the auto-mode classifier as a production deploy, and it needs an explicit go-ahead from the owner. Audit: `design-plans/workspace-usability-2026-10-28/AUDIT-2026-10-28.md`. Locality backfill: dry run not done (needs production Firestore read access).
- **28 October continuation (earlier):** PDF items A to D and CI fixes are in the working tree, not committed or deployed. Review record: `design-plans/workspace-usability-2026-10-28/REVIEW.md` (section "Continuation pass"). `report-details.png` golden regenerated and viewed (see `mobile/test/goldens/PROVENANCE.md`). `report-review.png` regenerated and viewed (it still captures step 3, because validation blocks Next without a photo). Full Flutter suite: 261 passing. Open gates: two golden hashes in `mobile/test/goldens/SHA256SUMS.txt` still do not match the committed images (`map-tile-free`, `register`; left unchanged on purpose); `flutter run -d chrome` and device checks; live audit and analytics browser checks.
- Repo: `/Users/rien/Documents/FINAL_PROJECT/app`. Push target: `build/disaster-rescue` (auto-deploys Vercel web and Render API).
- Web and API are live for `35e2c81` (API deploy may still show "in progress"; health check returns 200).
- Firestore rules and indexes deployed to `flutter-5094e` (rules unchanged since). Index build state not verified.
- APK: `SUBMISSION-2026-10-20/Android/I-Report-2026-10-27-update10.apk` (SHA `fceb79ef…`), built from `620a45f`. The `1-APK-for-phones.apk` shortcut points to it. Phone code has NOT changed since, so rebuild only after the next phone change.
- Phone has NO change-password feature (removed on owner request).

## Next steps
1. Confirm the live Cancelled inbox count after the `35e2c81` deploy.
2. Ask the owner's group to test update10 on a device: Assigned tab (multi-team), per-team Acknowledge, resident Rescue updates card, Forgot password, Contact an admin.
3. Forgot password on the phone: no cause found from code. Need the exact error or the symptom (no email?). Test with an account that exists.
4. Reset password (admin help panel) sets the password to the account's email. Owner accepted the risk (see `api/src/routes/auth.js` comment). Do not extend it.
5. Remaining red test: `mobile/test/goldens/report-details.png` (8.87% diff, scroll offset). Needs a reviewed decision; do not regenerate blindly.

## Gotchas
- Goldens: only regenerate after viewing the render; record in `mobile/test/goldens/PROVENANCE.md` and update `SHA256SUMS.txt`.
- Shell: zsh treats `===` oddly; use plain echo labels.
- Firebase deploy from production was blocked once by the auto-mode classifier; the owner approved it explicitly later. Ask before any production write.
- Multi-team: reports have `assignedTeamIds` and `acknowledgedTeamIds`; old reports only `assignedTeamId`. Both are read.
- Drafts restored from disk lose `locality` until the pin is picked again.
- Mobile `areas.dart` must stay (API parity test). Province is optional in the API.

## Pointers
- History of earlier handoffs: `docs/history.md`.
- Commit log on the branch is the best timeline (`git log --oneline`).
