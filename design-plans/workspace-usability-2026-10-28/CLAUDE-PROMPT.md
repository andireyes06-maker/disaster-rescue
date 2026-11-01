Continue I-Report from the CURRENT deployed source. Start by verifying the repository identity, reading its applicable AGENTS.md/CLAUDE.md and design instructions, then reading:
- design-plans/workspace-usability-2026-10-28/REVIEW.md
- design-plans/workspace-usability-2026-10-28/RELEASE-2026-10-28.md
- design-plans/workspace-usability-2026-10-28/CHANGED-SOURCE.json

Authoritative source: /Users/rien/Documents/FINAL_PROJECT/app. Review branch: feat/ui-response-workspace-2026-10-28. Production branch: build/disaster-rescue, NOT a literal main branch. Both were pushed to cd087ca3362c62468cbbc2c7430c21285dfbb854. API changes are the preceding commit3a57ca912a57154fba2f60004ab1e9e4b215f516. Verify current HEAD and git status before editing; another session may have advanced them. Historical /private/tmp integration trees and old recovery manifests are not the current authority.

The owner requested and received these changes:
1. Users: aligned account, active status, team membership and access controls; missing email no longer exposes a UID as its substitute.
2. Header: profile then notification bell. Change password inside profile. Sign out at sidebar bottom, inside expanded Menu on phones.
3. Admin: task destinations and distinct People/access and Service operations groups with clearer hierarchy.
4. Teams: create and headquarters-edit dialogs, properly resized Leaflet maps, selected-place labels and visible save/background error recovery.
5. Incidents: explicit incident type, optional custom classification only when present, separate resident landmark/pin place/contact name/telephone. Report/location and Response/updates tabs. Viewport-bounded modal and scrollable bounded history, preserving existing incremental data loading.
6. Maps: consistent disaster symbols and priority color/shape legends; selected-pin inspector with approximate place, coordinates and Google Maps link. Inspecting a point never rewrites an incident location.
7. Nested dialogs: Escape closes only the top layer; exit cleanup has a bounded watchdog and reopening cancels it.
8. Authenticated read-only /api/places/reverse endpoint: active canonical admin/responder access; rounded upstream coordinates, bounded cache/coalescing/queue,1.1s upstream spacing and timeout. Coordinates remain available when lookup fails. See service source and review for precise behavior. Native direct lookups were not changed; aggregate public-provider traffic and scale-out need review.

Production: https://disaster-rescue-web.vercel.app and https://disaster-rescue-api.onrender.com. API deployed first and confirmed live before web. Details and deployment IDs are in RELEASE-2026-10-28.md. Public production smoke passed8 route/width checks, without production authentication or writes. Authenticated production geocoder remains unverified.

Preserve I-Report branding, existing logo and purple/harbor colors, current role policy (admin/responder website, resident mobile; retired dispatcher/DMO records retained), CURRENT priority-first queue, validation, idempotency/retry protections and profile/session synchronization. Do not restore old FIFO policy, retired-role access or removed public password-recovery UI from historical handoffs. Do not silently change the existing owner-approved administrative password-reset policy during UI work.

Next work: independently inspect the implementation, fix confirmed remaining defects, and clear the actual CI failures. Use relevant installed frontend, accessibility, motion, testing and security skills; read their instructions and report which you actually used. Do not claim all plugins ran.

CI is NOT green: run40550776637. Firestore passed. Web checks and production audit passed, API functional tests passed548 with36 skipped, but API audit fails on body-parser GHSA-27r3-jxmh-p828 and Zod GHSA-mrhx-c7xc-m3w5. These also appear on baseline3eb4a7d. Patch body-parser safely; evaluate the Zod3-to4 migration in an isolated clean install with API/schema compatibility tests. Do not use audit fix --force, suppress findings or weaken the release gate. Flutter analyze fails on an async BuildContext use in operation_form_page.dart:162 and missing braces in operation_transitions.dart:5,8. Read current line locations, fix correctly, run analyze and full native tests; do not regenerate golden images just to make failures disappear. Flutter tests and Python guards did not execute remotely after upstream failures.

UI local evidence:516 web tests, typecheck/build pass;548 API tests with36 skipped. Populated Chromium checks390/1440,45-update fixture pagination, nested Escape/focus, forced interrupted exit, real local API place names, injected tile failure/retry all recorded. Mocks, emulators and synthetic data are explicitly identified. Firefox/WebKit, screen readers and devices were not rerun for this pass. Keep normal motion and verify actual interactions, not screenshots alone; preserve accessible motion preferences.

Keep future changes uncommitted for the owner's review unless explicitly authorized again. Do not push, deploy, change production roles/data/secrets or redeploy rules/indexes as part of this review. Use your own isolated preview/emulators and verify source identity. Preserve other sessions' edits and unrelated untracked promo/video/build/evidence files. Never kill a process you did not start. Do not expose credentials or invent addresses, operational data, verification claims or participant contributions.

Finish with exact files changed, defects versus design decisions, source/commit identity, test results and genuine remaining gates. Update the local review record and give the owner a concise reviewable handoff.
