# Release handoff, 19 October 2026

Authoritative tree: `/private/tmp/rescue-release-integration-2026-10-18`, branch `integration/redesign-functional-2026-10-18`. Do not overwrite it from the older product tree.

## Checkpoint and authorization
- Verified 777-file checkpoint committed as `838df8b` and pushed to origin.
- CI follow-up `42cff61` excludes only generated `mobile/build/**` dependency sources from Dart analysis. No app logic changed.
- All three remote jobs passed on `42cff61`: web/API, hosted CI Firestore emulators, and Flutter. Run: https://github.com/andireyes06-maker/disaster-rescue/actions/runs/39248752254
- The user explicitly authorized commit, push, staging setup, smoke tests and deployment after verification. Earlier no-commit/no-deploy instructions in historical notes are superseded. No production deployment or default-branch merge has happened.

## Staging already configured
- New Firebase project creation was refused for account project quota. The user then explicitly designated `aclon-franz2` for staging. Always pass `--project aclon-franz2`; never use CLI defaults or the live `flutter-5094e` project.
- Standard Firestore database created in `asia-southeast1` without enabling billing. Rules deployed; all 11 composite indexes verified READY.
- Separate Firebase web app registered: `Rescue Reports Staging`. Email/password Auth initialized using the supported Firebase deploy command.
- Real hosted smoke checks passed: two temporary accounts signed in; owner read allowed; another resident denied; canonical deactivation denied an existing token; revoked ID token rejected and refresh returned TOKEN_EXPIRED. Only these fixtures were removed afterward.
- Separate Vercel project created and linked to a clean source snapshot: `personalfranz/rescue-reports-staging`, ID `prj_6xCnD0P4CIrMM6FOmgr4N05ivkXW`. Node 22, root `web`, release build. All four Firebase preview variables are configured; the actual staging API URL is still missing. No working web preview has been published yet.

## Immediate blockers
- Render is not connected and no Render API credential is available. The Render integration was offered to the user; do not claim it is connected until confirmed.
- Staging Cloudinary credentials are not available. Never substitute production secrets or make a fake upload provider pass as real verification.
- Therefore the staging API, its real URL/CORS, full website workflow smoke tests and production release remain unfinished.

## Other open verification
WebKit Listen errors reproduce in a minimal Firebase-only local control; exact transport cause and hosted browser behavior remain open. Actual email/push delivery, physical Safari/screen readers/devices and signed native builds are not verified. Owner hotline, support, privacy, retention and app IDs remain unset; do not invent them.

## Records and next action
Durable ledger and bundle live in `/Users/rien/Documents/FINAL_PROJECT/design-plans/full-repair-2026-10-19/`. Read `RELEASE-EXECUTION.md` for current actions, evidence and required inputs. The 777-file recovery bundle is refreshed after source changes; old copies are historical.

Next: obtain the Render connection and staging upload credentials, deploy the API, supply its actual HTTPS URL to the staging web project, deploy the preview, then run the requested functional smoke pass. Do not restart the redesign or reuse production as staging. Preserve other sessions' files and processes.
