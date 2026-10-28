# History

## Handoff of 28 October 2026 (evening), moved here the same night

> Branch `feat/ui-response-workspace-2026-10-28`. Production branch `build/disaster-rescue` (a push deploys the live web and API; push only with explicit approval each time). Recording day is 29 October.

## Start here
- **Local only, not pushed:** `1bc45c3` (web audit repairs), `0bcbfe2` (mobile lost-photo recovery), `4dcaa25` (overview greeting). Live site is still `dc6f7cc`. Checks on this tree: `tsc` clean, web 583 tests pass (78 files), `npm run build` ok, Flutter analyze clean, 281 tests pass. `npm run build:release` needs deploy env vars, so it was not run.
- **Audits run today (read-only subagents, then fixed):** security (no high or medium; lockout is advisory, comments corrected; frame protection and nosniff added in `web/vercel.json`, full CSP not added because it cannot be checked without a browser run), accessibility (input border contrast, failed sign-in message tied to the password field, Show password name, dead forgot-password code removed), code review (OperationForm stuck busy after same-account sign-in, "load more" resetting the list, Android lost photo), copy (em dashes, "report" and "progress updates" wording). Each new test was confirmed to fail without its fix.
- **Not verified:** nothing run on a phone or in a signed-in browser. Mobile lost-photo recovery (`ImagePickerPhotoService.recoverLost`) is covered by unit and widget tests only. Header changes are untested on Vercel.
- **Next, in order:**
  1. Owner asks Codex for a frontend audit of this tree, then fix what it finds.
  2. Emergency types: spec first (`X-SPEC.md`, no code before approval). Owner wants Medical emergency, Road hazard and Power line added to Flood, Fire, Landslide, Earthquake and Other. Their screenshot is a map legend (TYPE row with icon chips); take inspiration, do not copy.
  3. Approve a push of the three local commits (deploys production).
- **Places that hard-code emergency types (from the code review):** `web/src/types/domain.ts:3`, `web/src/lib/schemas.ts:83`, `web/src/features/map/disasterSymbols.tsx:3-9`, `web/src/features/reports/IncidentPreview.tsx:15-29`, `ReportQueue.tsx:70-71`, `web/src/features/analytics/ChartCard.tsx:20`, `web/src/styles.css:186-190` plus `--color-flood/fire/quake/slide`, `web/src/responder-workspace.css:29-31`, `web/src/pages/Landing.tsx:68`, `api/src/domain/validation.js:55`, `mobile/lib/data/report_models.dart:3`, `mobile/lib/features/report/report_flow_page.dart:33-55`. Other mobile screens fall back to `reportTypeInfo['other']`. Rules and indexes hold no type list. Re-check line numbers before use.
- **Open owner decisions (older):** keep or delete `CLAUDE-SECURITY-20261028-063336/` (empty scan output); fresh release APK for the professor (still `update14`, no camera change); which "Rescue" names outside the package to rename; physical-phone camera test; manual check of the closed-assignments tab on the live site with `sample.rescuer@harbor.example` (password in `~/Documents/i-report-sample-logins.txt`).

## Gotchas
- Production log deletion (updates, notifications, auditLogs) is done and backed up at `~/.config/i-report/prod-logs-backup-2026-10-28/`. Do not repeat.
- Index deploy is done. Production writes, Firebase deploys and rules changes need approval. No Android emulators.
- Device takeover allowed, email-as-password reset accepted, empty-team assignment refused on purpose. Do not regenerate goldens without viewing them. Do not revert the Zod 4 migration.
- `docs/documentation/handoff.md` has uncommitted edits from another session; do not commit it with this work.
- Never print or commit keys. Use new emails for new sample accounts.
- zsh does not split an unquoted variable of file names; pass them one per line to `xargs`.

## Resume prompt
"Read HANDOFF.md, then continue from step 1 of Next. Tell me what you need from me."

## Pointers
- Older handoffs: `docs/history.md`. Earlier audit record: `design-plans/responder-web-audit-2026-10-28/`.

---

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


## Archived handoff: Codex emergency-types release (28 Oct 2026 night)

## Start here
- **Deployed by Codex with Airen’s explicit approval:** Lifeline (`medical`), Roadblock (`road_hazard`), Live Wire (`power_line`) plus a typed Other (`typeDetail`, 3 to 40 chars, only on `other`). Commits `39f3382` API, `c147096` `643eb8c` `4747da9` `b90f8de` web, `5512adb` `0371e65` phone. Earlier commits `1bc45c3` `0bcbfe2` `4dcaa25` `54080d9` are included. Production branch is now `9313c72`; Vercel and Render deployments succeeded, all3 GitHub CI jobs passed. Release: `design-plans/emergency-types-2026-10-28/codex-review/RELEASE-2026-10-28.md`.
- **Checks (this tree, run separately):** API 618 pass 36 skipped. Web `tsc` clean, 622 pass (`--maxWorkers=2`), `npm run build` ok. Flutter analyze clean, 297 pass. Parity test `api/test/domain/reportTypes.parity.test.js` passes and fails when a label drifts (checked).
- **Committed:** the parity test, this file, `docs/history.md` and the spec status are in `2713cfa`. Codex continuation records are now uncommitted: this file and `design-plans/emergency-types-2026-10-28/codex-review/`. Preserve `docs/documentation/handoff.md` (another session's edits); do not stage it.
- **Codex continuation:** Opus review attempted on `54080d9..9313c72`; actual model `claude-opus-5-5`, but it hit the account spend limit before returning a completed review. CLI reset: **11:40 PM Manila**. Not passed, no fallback. Actual signed-in admin/responder maps now checked locally at390/1440 with all8 types, no overflow/page errors. API618+36skipped, web622+clean tsc/build, Flutter297+clean analyze rerun. Full record: `design-plans/emergency-types-2026-10-28/codex-review/RECORD.md`. Physical phone and the completed Opus review remain open; push/deploy succeeded under Airen’s subsequent approval.
- **Latest APK built, not installed:** `../SUBMISSION-2026-10-20/Android/I-Report-2026-10-28-update16-online.apk` (relative to app/), SHA-256 `3f69fa9d1946d735362393c14bceb1805151267037498dd0857dfdbae7ce2609`. Fresh build from9313c72, versionCode16, debug-signed universal; certificate matches update15. Live Firebase/API, no emulators, debug banner hidden, new type labels verified in APK. Receipt: sibling `ONLINE-BUILD-UPDATE16.json`. `1-APK-for-phones.apk` still points at update14; it was not repointed.
- **Next:** retry the Opus review of `54080d9..HEAD` after the account limit resets/changes; fix any Critical/Important findings test-first and request fresh approval before another push. Physical-phone and controlled live Lifeline submission checks are still unperformed.

## Decisions Airen made (do not reopen)
Names: Lifeline, Roadblock, Live Wire. Typed Other. Zero-count types hidden in the analytics chart and filter counts. New APK. Push after the work, with approval. Colours and legend were delegated; I changed ochre and slate to olive gold `#6B6400` and teal `#0B6B73` (too close to High and Low priority; ratios in `CONTRAST.md`).

## Rulings worth knowing
PDF summary and CSV use the label. The public incidents feed never carries `typeDetail`. Phone map Type filter is now one scrolling row (8 chips overflowed 360x640). Two goldens regenerated after viewing (`map-tile-free`, `report-type`), logged in `mobile/test/goldens/PROVENANCE.md`. Closed-draft headings on web read "Other report" for a typed Other (draft stores only the key).

## Gotchas
- Use Opus as the highest model for any subagent. Fable ran this session too hot.
- macOS `sed -i` needs `''`. zsh does not split an unquoted variable of file names. Typecheck and tests run as separate commands.
- Production writes, Firebase deploys and rules changes need approval. No Android emulators. Do not regenerate goldens without viewing them. Do not revert the Zod 4 migration. Never print or commit keys; the Firebase client values used for the APK were read in memory and deleted.
- Firestore rules have no type list or field allow-list (checked); no rules change.
