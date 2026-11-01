# Predeployment check, 29 October 2026

## Verdict
Local automated checks pass; not an unconditional all-platform release clearance. No commit, push, deploy, production-data mutation or hosting-setting change was performed. The requested predeployment review does not authorize deployment.

## Fixes found in this pass
1. Required HQ had no keyboard-only selection when location permission was unavailable. Reproduced in Chromium: map focused, Enter yielded no pin. HqPicker now lets Enter select the map center after arrow-key panning; child controls do not trigger selection. A regression and real-browser runs cover it.
2. The profile trigger's custom accessible label conflicted with its visible content under axe. It now uses native button text plus hidden action context, keeping the account name and existing dialog behavior. Targeted interaction tests pass; final axe runs have zero violations.
3. Location helper text was 4.493:1 against its tinted background. Darkened it from #776b85 to #645570, now approximately 6.175:1. Final dialog axe scans pass.
4. Production dependency audit found GHSA-gg6h-894w-4m9c in Firestore's re2js dependency (2.8.6). In-range npm update resolves 2.9.1. Reference: https://github.com/advisories/GHSA-gg6h-894w-4m9c . Development-only jsdom/undici also had advisories; in-range update 8.12.1 to 8.12.3 clears them. npm changed the lockfile; no direct dependency versions or Firebase/gRPC versions changed. npm-generated require-from-string dev metadata also changed. Full web and API production audits are zero; full web audit including dev is zero. Clean isolated npm ci succeeds.

## Checked
- Web: 656 tests / 85 files, typecheck and release build. Existing >500kB bundle warning remains. Final logs copied here after completion.
- API: 658 passing, 36 skipped; skipped environment-only cases remain skipped in the ordinary full run.
- Firestore real adapters: 65 passing in 12 files on the isolated local emulator.
- Rules: 161 passing, 0 skipped on the isolated local emulator.
- Flutter: analyze clean; 315 tests pass; all 15 golden hashes verified. No native source changed in this pass.
- Release environment validator: 9 tests pass. Default local development API URL is correctly refused by build:release; explicit deployed HTTPS API address passes. No .env file was edited or printed.
- Recovery/native guard scripts: 3 + 1 tests pass. Source identity test passes. Diff whitespace check passes. Added tracked diffs contain no private-key/PAT/AWS-key patterns in the limited scan, which is not an exhaustive secret audit.
- Chromium, real local API/Firestore at 390/1440: no-HQ blocked with map-region focus; map pin, browser-supplied geolocation, keyboard center selection; saved HQ read back, teams survive reload; zero page exceptions, overflow, or axe violations on dialog and teams page. Reverse-place lookup is deliberately mocked; geolocation is browser-injected, not a device GPS measurement.
- Three engines, 390/1440: 54 route/HQ observations. Chromium18 and Firefox18 have no page exceptions or overflow. WebKit18 has no overflow and HQ validation/keyboard selection works, but 30 Firestore Listen access-control page exceptions occurred across its route navigations. Recorded, not suppressed; not an error-free WebKit result.
- Production read-only: website/login and build-identity return200; API health200, unauthenticated users/me401; API CORS allows the recorded production web origin.
- Remote production and feature branches both remain19435bb. Existing GitHub CI checks on that commit pass; they do not verify the uncommitted overlay.

## Compatibility / deployment preparation
Only the active TeamsPage creates teams in the running web app. Legacy TeamsPanel still has a no-HQ POST but is referenced only by component tests, not a runtime route. Flutter contains no team-creation client. Existing team records and PATCH semantics are unchanged. Rules/indexes have no changes, so this patch needs no Firebase rules/index deployment. Both updated dependencies meet Node22.19+; CI follows Node22.

The web UI can ship before the API validation because it sends HQ to both old and new APIs. Cached old clients can receive hq_required and need refresh. Roll back the release commit(s) if sign-in, team creation, account photos or ordinary report operations regress; no database migration is needed.

## Still open
- Connected Vercel CLI workspace personalfranz does not list the historical disaster-rescue-web project; project inspect returns project_not_found. The public domain is alive. Production ownership/build settings were not confirmed, and no relink/new project was attempted. Verify the intended project/account before CLI deployment.
- Automatic approval review rejected the external read-only Opus invocation because repository source could be transmitted to Claude without explicit source-transfer permission. No retry/bypass. This pass has local source review and test evidence, but no new independent Opus review.
- Existing local WebKit Listen defect/symptom remains. Hosted Safari/WebKit behavior was not tested here.
- Physical phones, real screen readers/push/email/Cloudinary and hosted photo deletion remain unverified; this pass does not certify those provider/device gates.
- Submission archives/source ZIP and their earlier manifests predate HQ/accessibility/dependency changes. They were preserved, not silently relabeled current. APK update18's native source remains current; physical installation is unverified.

## Harness caveats
An initial API-test attempt was sandbox-blocked on loopback; the authorized rerun passed. The release-env test was initially invoked using node --test even though it is a Vitest file; corrected to Vitest and all9 pass. An early team-name locator wrongly required exact text despite the nested identity badge; fixed in the harness. Later repeated browser passes on the reused stack timed out; the cause was not proven. Final results use a freshly started dedicated stack and pass, with API error response logging enabled. No existing user/session process was stopped; only this pass's owned launcher was stopped.
