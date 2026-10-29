# I-Report finishing and launch audit
29 October 2026, Asia/Manila. LAJR Solutions, BSIT 3J-G1.

## Verdict
The local launch candidate passes its recorded software checks. It is **not published** and is not certified as an operational emergency service. Publish/verify the prepared APK before deploying the web code that links to it. Device/provider checks and submission-member confirmation remain separate from passing automated tests.

## Authoritative identity
- Local HEAD `135a3ad6ac5050d06d463f8c6a3af270c8fd54e8`, plus the named uncommitted repairs in the new source manifest.
- During this audit another session committed the earlier HQ/profile/dependency fixes, added optional responder-update photos and deployed `7e21395`. Its changes were read and retained, not reverted. Initial 19435bb/update18 checks are historical, not the current verdict.
- Current production API: Render confirms `7e21395` live. Vercel status and GitHub web-api/Flutter/Firestore checks on that commit succeed. The existing production integration is `lajr-solute/disaster-rescue-web`; the CLI is authenticated to a different account/workspace. No project ownership, credential, environment, rules, index, push or deploy changes were made by this audit.

## Confirmed findings and remediation
| Severity | Finding | Evidence / final state |
|---|---|---|
| Important | Native responder retry identity used only photo filename/length, allowing different same-size bytes to reuse a key. | `mobile/lib/features/responder/operation_form_page.dart`: replaced with structured identity containing SHA-256 of each image. A→B→A widget regression failed at the key comparison before the fix, passes after; A keeps its original key. |
| Medium | Attachments could change while the form awaited location, after identity was chosen. | The submitted photo list is frozen before the await; photo controls and text are read-only while busy. Disabled-control regression and full native suite pass. The specific temporal race was confirmed by source reading, not a real-phone reproduction. |
| Medium | WebKit emitted Firestore access-control errors when a document reloaded during listener startup. | Minimal Firebase-only control reproduces it. IP host, long polling, same-origin proxy and pagehide cleanup did not fix it. Before-unload network pause works for routine navigation; installed only against the local emulator, never hosted Firestore. Actual admin/responder 78 route/HQ cases in Chromium/Firefox/WebKit at390/1440 now have zero page exceptions/overflow. |
| Medium, rollout gate | Live landing has no Android download; the public downloads repository still contains only the October23 prerelease. | Prepared update20 and a pinned first-party default URL in `web/src/config/downloads.ts`. Existing hosting override remains supported. **That new asset is not public yet.** Publish the exact release/filename, verify HTTP200 and SHA256, then deploy. No Vercel environment export/account change is required. |
| Low | Public download badge accessible names did not match visible labels. | `web/src/pages/Landing.tsx`: native visible button/link names, explicit spaces between text spans. Regression and both-width public axe scans pass. |
| Low | Phone profile privacy paragraph named retired dispatcher/disaster-office roles. | Now names the actual administrators and assigned responders. Candidate profile image and isolated diff were viewed; only `profile.png` changed. All15 golden checksums match and the full suite passes. No authorization/rules change. |

The earlier HQ requirement, keyboard map-center selection, profile trigger name, helper contrast and dependency updates are now committed by the other session in560e16a. They remain present and tested. No confirmed Critical finding was found in the scoped manual review; this is not a penetration-test claim.

## Verified on the reconciled source
| Check | Result |
|---|---|
| Web | 669 tests /88 files pass; typecheck and release build pass. Existing >500kB chunk warning remains. |
| API | 669 pass,36 skipped. Environment-only skips are not counted as passes. |
| Real Firestore adapters | 65 pass on the dedicated local emulator. Rules/adapter source unchanged by later native/web repairs. |
| Firestore rules | 161 pass on the dedicated local emulator; client writes remain denied and reads scoped by current profile/team. |
| Hosted index definitions, read-only | All18 local definitions are present among18 hosted indexes after normalizing Firestore's implicit `__name__` tie-breaker. Build-state readiness is not returned by this CLI; no deploy performed. |
| Flutter | 320 tests pass; analyze clean; all15 golden checksums verify. |
| Dependency/security hygiene | Full web audit, web production audit and API production audit have0 vulnerabilities. A clean isolated npm ci resolves the lockfile. Gitleaks scanned1253 current text files: seven matches reviewed as synthetic test keys, checksum metadata and a public provider deployment identifier; no confirmed credential in that scan. No private configuration values printed. |
| Browser routes | 54 admin/HQ +24 responder cases across three engines and two widths:0 page exceptions or horizontal overflow after the local WebKit mitigation. |
| Accessibility | 34 page scans (5 public,8 admin,4 responder at two widths) and8 modal scans:0 axe violations after normal entry motion settles. Profile/password, HQ editor, submitter profile and assignment dialogs fit390/1440. Initial modal contrast reports during animation were not reproduced after settling; no suppression added. |
| Flutter Chrome | Fresh emulator-only web build; resident report flow and responder assignment list rendered at390. Explicit field focus/blur fixed the harness's premature sign-in click. These are Chrome/layout observations, not device/permission evidence. |
| Core workflow | Real local Auth +Firestore: provision a team/responder, resident submits report with photo, admin verifies/assigns, responder acknowledges and posts a photo update, resolves, admin closes, resident reads Closed. Another team gets404. Image delivery is fake, not Cloudinary. |
| Lost reply | The test server cut the responder reply after commit. Retry used the same key: one status row, one progress-photo record, no second upload. Read-only receipt returns saved. No production write. |
| Artifacts | Existing FINAL pack313 checksums valid; update20 has same signing certificate as19, package local.rescuereports.app, versionCode20, HTTPS live API, emulators off, debug ribbon off. No physical install. New source ZIP reconstructs exact committed blobs plus named hash-verified repairs. |

Source review covered canonical authorization in buildApp, revoked-token verification, role/team checks, last-admin protection, report projection/privacy, byte-sniffed/size-limited uploads, update replay/receipt permission ordering, export formula neutralization, direct-read Firestore rules and unsafe HTML/eval sinks. No new confirmed issue in those inspected paths. Existing accepted orphan-photo/storage and responder retry persistence limits are not silently reclassified as fixed.

## Browser residual, retained explicitly
A separate injected native beforeunload-confirmation/slow-navigation control still emits two WebKit SDK teardown errors. Both cancelled-navigation and Back recovery receive subsequent real local Firestore updates successfully. This is not an error-free result for every browser lifecycle scenario, and not evidence about physical Safari. The ordinary product navigation cases above are clean. Raw/control results remain in this folder; nothing was filtered or suppressed.

## Pages / features checked
- Public: landing, login/recovery, mobile-only registration notice, Forbidden and missing-route page.
- Administrator: incident inbox, incident detail, map, teams, users, analytics/exports, audit and administration/settings. Current priority-first FR-06 decision preserved. Team creation requires a valid PH headquarters; map click, GPS and keyboard center selection tested.
- Responder web: overview, assignments, team map and assignment detail. Scoped data and read-only closed access reviewed. Route smoke checks do not imply every operational button was exercised by mouse in every engine; the real local workflow and suites supply complementary evidence.
- Native: resident/responder role gates, report flow, camera/gallery validators and limits, notifications, history, profile/password/photo controls, uncertain attempts and release guards covered by the full suite; representative Chrome render checked. No dispatcher/DMO native workspace was added.

## Remaining work before public release / final submission
1. Approve publication of update20 in the existing public downloads repo under `android-online-2026-10-29-update20`, with the exact APK filename in the source default. Verify public download/hash before pushing the web candidate. The source default must not be deployed while the file is404.
2. Commit only the named repairs, leaving `docs/documentation/handoff.md` alone. Push/deploy only after explicit owner approval, then check remote CI, download, sign-in, inbox and API health on that exact release.
3. A groupmate should install the online APK and perform a controlled phone photo/report/progress check before presentation. Camera/GPS permissions, real Cloudinary URLs/deletes, actual push/email, TalkBack/VoiceOver, iOS and store signing remain unverified. Existing debug-signed APKs are academic sideload builds.
4. The existing FINAL pack is intact but predates these local repairs. Replace its APK/source with the repair versions when assembling the approved submission and recompute archive/checksum metadata. Do not relabel historical test reports as current.
5. Technical/participation/intro/outro videos still use earlier Group3 branding and predate required HQ/optional update photos. Refresh branding/coverage while preserving required group information; each member must confirm real contributions/reflections. The62s promo is separate from the required2–3min participation video. No participation or member photos were invented.
6. Official hotline/authority, support/privacy/retention wording and permission to present real operational data are owner decisions. Keep demonstration data synthetic until those are settled. Promo music attribution/licence evidence was not independently verified in this code audit.

## Methods / limits
Security-reviewer, debugging and deployment-checklist workflows applied locally. No external Claude/Opus invocation in this finishing pass; user said Claude was unavailable. The earlier automatic source-transfer rejection was not bypassed. This report is a primary local review, not an independent Opus/security certification.

Test harness corrections were kept distinct from product fixes: invalid province/town fixture corrected; authenticated data was awaited before modal/API checks; native field focus/blur and tooltip finder corrected; raw minimal Firebase imports were aligned to Vite's module identity. Production requests were read-only. All mutation probes used demo-disaster-rescue on owned local emulators. Only owned test processes are stopped during cleanup.
