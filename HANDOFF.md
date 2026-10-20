# Release handoff, 19 October 2026

Authoritative tree: `/private/tmp/rescue-release-integration-2026-10-18`, branch `integration/redesign-functional-2026-10-18`. Preserve other sessions' work. Do not overwrite this source from the older product tree.

## Current status (20 Oct 2026, Flutter finish)
- Web/API deployment remains b834c03. This local pass changes Flutter and submission documents only; nothing committed, pushed, merged or deployed.
- Flutter now has a public welcome, resident notification bell, bounded detail/notification layouts and finite route/tab/error motion. Residents/responders remain native; staff/admin remain web.
- Final analysis is clean, 219 Flutter tests pass, all 15 golden checksums verify without regeneration. Chrome debug and Android debug builds succeed. Chrome visual reviewer scored its desktop-notification fix resolved; native hardware remains unverified.
- User-guide PowerPoint, source screenshots/generator, schema, video script and supporting silent preview are in docs/. Actual group narration/contributions and Office rendering review remain owner work.
- Start with durable FLUTTER-FINISH-2026-10-20.md and the current recovery manifest. Preserve the earlier 787-file checkpoint as historical; use the current 805-file bundle after this finish.

## Production release
The user requested a direct release instead of waiting for staging. The verified product commit `b834c038055db76438858abdb95aadffbd5fd32d` is now deployed:
- Web: https://disaster-rescue-web.vercel.app , Vercel deployment `dpl_7BL9kvvriSF4fB5f9wxpu74w8kfa`.
- API: https://disaster-rescue-api.onrender.com , Render deployment `dep-dbb1o6k9v7es73acih9g`.
- Production Firebase: explicit project `flutter-5094e`. Reviewed rules deployed and all 11 composite indexes READY.
- Remote CI on b834c03 passes web/API, Firestore and Flutter: https://github.com/andireyes06-maker/disaster-rescue/actions/runs/39256572821 . No default-branch merge occurred.

## Production checks and limits
API health and a browser cross-origin health request return 200. The landing video autoplays muted. Public login/register/Forbidden and signed-out protected-route redirects were checked in Chromium at 390 and 1440 px: no horizontal overflow, one main landmark, correct titles; empty forms show field errors and focus the first invalid field. No console errors occurred during those checks.
This is a production smoke pass, not a production role-workflow, photo-provider, email/push, device or screen-reader certification. Native signing/release builds and owner hotline/support/privacy/retention details remain open. The local WebKit reload issue remains unresolved; this Chromium pass does not clear it.

## Rollback
Previous API commit `effd53f9a6239154604ff48cec05214b1b27f098`, deployment `dep-db93li3rjlhs73bjvur0`. Previous web deployment: `https://disaster-rescue-k8xpfnmsw-personalfranz.vercel.app`. Prior rules/indexes and service settings are saved in secure local release scratch as `live-rollback.json`.

## Staging and records
Separate Firebase `aclon-franz2`, Vercel `rescue-reports-staging` and Render `rescue-reports-staging-api` were created during the earlier authorized staging work. The staging web is unpublished and the API lacks staging Cloudinary configuration. Do not present them as a verified full staging stack. Render CLI is authenticated; the connector OAuth callback failed, so do not repeat that flow.
Durable records, recovery bundle and release evidence: `/Users/rien/Documents/FINAL_PROJECT/design-plans/full-repair-2026-10-19/`. Read the latest section of `RELEASE-EXECUTION.md`; older no-deploy statements are historical. Never archive scratch credentials, CLI tokens or local OIDC environment files.

## Emulator reload follow-up, 20 October 2026
The installed firebase_auth_web 6.3.0 debug emulator reconnect is gated to browser hostname localhost. Reproduced the failed Google account lookup on 127.0.0.1, then verified three same-tab reloads each for resident and responder on localhost, with all captured Auth requests going only to the dedicated local emulator. No bootstrap logic changed. See mobile/README.md for the explicit Chrome launch command and durable FLUTTER-RESTORE-REVIEW-2026-10-20.md for evidence and limits. Hosted restore, fresh tabs and device restarts remain unverified.
