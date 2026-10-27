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
