# Website functional audit — 18 October 2026

## Verdict

**Not ready for deployment sign-off.** The main workflows operate, but this pass confirmed ten functional gaps. Four need priority attention: stale authorization after a same-second role change, incomplete staff activation, missing responder team management, and exports that ignore selected filters.

This is an audit of the current React website, Express API, and Firebase authorization in the shared working tree. It is not a review of the older hosted commit, a Flutter device audit, or a claim that every possible failure has been tested. No product source was changed or fixed in this pass.

## Environment and evidence

All writes were confined to **`demo-functional-audit`**: web `localhost:5177`, API `localhost:3104`, Auth emulator 9499, Firestore emulator 8390. The original QA workspace on 5174, clean Harbor presentation on 5176, separate live-config Flutter process, and production were untouched. Auth project/emulator checks preceded browser sign-in. Real Firebase service hosts were blocked in the browser harness.

This audit deliberately uses test content and photo fixtures. Its screenshots are not the clean presentation workspace and should not be treated as a regression in that workspace.

| Fresh verification | Result | Evidence |
| --- | --- | --- |
| Web component suite and TypeScript | 381 tests pass, 52 files; typecheck passes | `web-tests.log` |
| API automated suite | 305 pass; one emulator-only test skipped | `api-tests.log` |
| Firestore permission suite | 128 pass | `rules-tests.log` |
| Web production compilation | Pass, scratch output outside product source | `build.log` |
| Real API/emulator integration | 77 checks: 72 pass, five fail after correcting one invalid responder-stats expectation | `api-results.json`, `api-integration.log` |
| Critical real follow-ups | Filtered CSV/PDF defects, immediate-vs-delayed token revocation, three last-admin races | `critical-results.json` |
| Protected web routes | All 65 combinations of 13 private routes and five roles pass | `browser-curated.json` |
| Chromium workflow set | 23 consolidated scenarios: 20 pass, three fail; targeted management and follow-ups add separate evidence below | `browser-curated.json` |
| Additional real assignment/retry/reconnect | Assignment, acknowledgement/reconnect, and network retry pass; later responder team-link fails | `followup.json` |
| Admin/Users/Audit/settings | Staff create/role save, deactivate/reactivate and audit filters pass; empty settings validation fails | `management-browser.json`, `management-recheck.json` |
| Firefox and WebKit focused checks | All 12 checks pass; WebKit resident context also logged two Firestore Listen access-control errors | `cross-browser-final.json` |

These groups overlap and must not be added into one claimed count of independent tests. “Real” means the running API and local emulators, with persisted results or reload/realtime verification. Mocked failure cases are identified below.

## Findings

P1 means address before release sign-off. P2 means a material functional gap requiring a fix or an explicit acceptance decision. No production exploit test was performed.

| ID | Priority | Finding | Reproduction and consequence | Evidence / source owner |
| --- | --- | --- | --- | --- |
| F01 | P1 | Same-second role changes can leave old API privileges usable | Sign in a temporary dispatcher and demote it to resident within the same second. After another 1.2 seconds, its old token still returns **200 on `/users`**, despite the canonical role being resident. A control with a 1.2-second delay before demotion returns 401. | `critical-results.json`, `revocation-granularity`; `api/src/server.js:21`, `api/src/middleware/auth.js`. Confirmed on emulator; production behavior is not independently certified. |
| F02 | P1 | Newly created staff have no activation/sign-in path | Admin creates a responder. Auth contains no password, no activation/reset code was generated, and the web supplies no invitation or password-setup action. Creating the row succeeds, but the new person cannot complete onboarding through the product. | `api-results.json`, `staff-onboarding`; `api/src/services/userService.js:41`; Users and Accounts creation forms, login page. Later responder tests explicitly set a password through emulator Admin SDK; that is test provisioning, not a product pass. |
| F03 | P1 | A responder created without a team cannot be linked later | Creation explicitly allows “No team yet.” A later `PATCH /users/:id` with `{team: "demo-team-lima"}` returns **400 `nothing_to_update`**. Existing-account controls expose role/access changes but no team assignment. The responder's “Ask a dispatcher…” recovery instruction cannot be completed through the current UI/API. | `followup.json`, `responder-team-link`; `api/src/services/userService.js:66`, `web/src/features/admin/AccountsPanel.tsx`, `web/src/features/users/UsersPage.tsx`, `web/src/features/responder/AssignmentsPage.tsx`. |
| F04 | P1 | CSV and PDF ignore incident type/status filters | `/stats?type=flood` reports **10**, but `/export/incidents.csv?type=flood` includes **15 excluded incidents**, and the PDF total remains **25**. For `status=Submitted`, stats reports **1**, while exports still include all 25. Date filtering is separate and is not the failing property. | `critical-results.json`, `filtered-type.csv/pdf`, `filtered-status.csv/pdf`; `api/src/routes/export.js:21` and `:30` use `parseRange`, whereas stats uses `parseFilters`. The web sends type/status in export URLs. |
| F05 | P2 | A reused idempotency key silently accepts a different report body | Submit once, then send a different description with the same key. API returns **201 and the original report ID**, with the original description still stored. The second payload is silently discarded. | `api-results.json`, `idempotency-body`; `api/src/services/reportService.js:27`, `api/src/adapters/firestoreRepo.js:106`. The current web fingerprints content, which reduces the normal UI trigger; the API contract remains unsafe for mismatched retries/other clients. |
| F06 | P2 | In-app navigation discards an unsent report without warning | Enter report text, click My reports, wait for that page and form removal, then return to Report an emergency. Text is empty and no leave warning was shown. Browser reload/tab-close warnings do not protect router navigation. | `browser-rechecks.json`; `web/src/features/resident/ReportForm.tsx:67`, `ResidentLayout.tsx:26`. The first overly fast navigation probe was replaced by the settled-page reproduction. No draft storage is needed merely to warn before leaving. |
| F07 | P2 | Realtime pages show stale status without an offline warning | Put resident detail offline, change its report through the real API, and inspect the page. It still looks current while displaying the old status. Reconnecting does recover the latest state. Responder priority changes also recover after reconnect. | `browser-curated.json`, `resident-offline-stale.png`, `followup.json`, `responder-offline.png`; the report/assignment hooks do not expose cache/connection freshness. This is a warning-state gap, not evidence that reconnect is broken. |
| F08 | P2 | New resident profiles omit email, breaking account search | Fresh browser registration reaches My reports and survives reload. Searching its registered address in Admin returns **No matching accounts**. The profile lacks email; seeded and staff accounts have it, which previously hid this issue. | `api-results.json`, `resident-profile-email`; `admin-resident-email-search.png`; `api/src/services/userService.js:149`. `server.js:23` also drops the decoded email from the identity adapter. Fix using the verified identity, not a client-supplied arbitrary email. |
| F09 | P2 | Team creation and renaming are absent from the audit trail | Create and rename a team through the API and verify its stored name. Neither action writes a team audit event, even though the audit UI includes Team created/Team updated labels. Account/report/settings events do persist. | `api-results.json`; `api/src/routes/teams.js:22` and `:30`; `web/src/features/audit/presentation.ts`. This is a traceability gap, not failed team persistence. |
| F10 | P2 | Settings API accepts empty fields the UI declares required | PUT `{hotline:"", residentNotice:""}` as admin returns **200** and saves both empty strings. The web validation refuses the same values. The original audit-environment values were restored afterward. | `management-browser.json`, `settings-empty-values`; `api/src/services/adminService.js:24` and `:27`, `web/src/features/admin/SettingsPanel.tsx`. Decide one consistent empty/unconfigured contract; do not fill the gap with an invented hotline. |

## Recommended repair order and acceptance checks

1. **F01:** Make canonical active/role/access-sync state authoritative for API permissions; do not depend solely on second-granularity token revocation. Regression: an immediate demotion removes privileged endpoint access, including with an already-issued token. Preserve last-admin transactions and Firestore rules.
2. **F02–F03:** Finish staff onboarding and team membership as complete workflows. Provide a secure password-setup/recovery path and a later assign/reassign-team control with an API contract, claims synchronization, validation, and audit records. A freshly created staff member must reach the allowed page without Admin SDK intervention.
3. **F04:** Share the filter parser/scope between Analytics and both exports. Assert exported references and PDF totals match the selected type/status/date combination, including empty results.
4. **F05–F08:** Bind idempotency keys to canonical submission content; protect dirty in-app navigation; expose honest offline/stale state; store verified resident email for account search. Test real failure/retry/reconnect and new registrations, not only seeded fixtures.
5. **F09–F10:** Complete team audit events and align settings validation between API and web. An unconfigured hotline must remain truthful.

## Page-by-page functional ledger

| Surface | Fresh functional evidence | Open / qualification |
| --- | --- | --- |
| Landing `/` | FAQ disclosure, anchor navigation, viewport-aware film pause/play smoke; film component tests pass | No new exhaustive media/network-failure/device pass. Scrolling the film into view is required before expecting autoplay. |
| Login `/login` | Required validation, incorrect password/focus, all five role redirects, session reload; Firefox/WebKit sign-in/restore | No product password recovery/activation flow (F02). |
| Register `/register` | Real fresh resident creation, reload, and interrupted profile provisioning followed by successful retry | Profile failure was a mocked 503; successful retries were real. New profiles omit email (F08). |
| Forbidden `/forbidden` | 65 role-route cases exercise denial; existing Forbidden tests pass | No fresh unknown-role/claimless browser fixture in this pass. |
| Unknown address | Current 404 component included in passing web suite; prior visual capture exists | No fresh dedicated browser action for 404 recovery in this functional pass. |
| Resident hub `/my` | Session restore, own-list API isolation, live notifications, mark-read/reload | F07; public-map privacy verified through the real API, not a full map-tile/device test. |
| Report form `/my/report` | Required focus, category controls, coordinate fallback, denied GPS, rejected attachment, half-contact refusal, real submit and reload, mocked network refusal/real retry with one report | F05–F06; real upload blocked; idempotency across reload/completion-write failure not certified. |
| Resident detail `/my/reports/:id` | Real cancel/reload, ownership restrictions, verification/assignment/responder status updates without reload, offline/reconnect | F07. Attachment rendering unit suite passes; real external photo delivery not verified. |
| Dashboard `/dashboard` | Role gate, search/no-match recovery, selection/open details, real report state changes | No new multi-dispatcher sustained-load test or full filter-combination matrix. |
| Map `/map` | Type filter limits marker types; keyboard marker opens incident details | All query combinations and real device map gestures not exhaustively tested. |
| Monitor `/monitor` | DMO marker opens details without editing controls; mutation APIs refuse DMO | Same map/device limits. |
| Incident details `/incidents/:id` | Priority/classification persistence; real verify/assign and dialog flow; API reject, duplicate, illegal-transition, close and team-release checks | Reject/duplicate writes checked at API rather than every dialog branch in browser. |
| Assignments `/assignments` | Own-team isolation, real acknowledge, invalid count validation, progress/resolution, dispatcher closure/team release, reconnect priority update | F03/F07. New staff test credentials were fixture-provisioned (F02). |
| Teams `/teams` | Create/search/rename through browser and API; reload and stored values agree; DMO writes refused | F09; no team membership management (F03). |
| Users `/users` | API creation/role/access changes; browser activate/deactivate and reload; self/admin protections | F01–F03/F08. |
| Analytics `/analytics` | Real stats match stored scope, URL filters, invalid date range, CSV/PDF downloads/filename preservation, mocked export failure | F04. No performance/load certification or complete business review of rescued-count semantics. |
| Audit `/audit` | Account/report/settings events persisted; action filtering and date-range recovery; named records readable | F09. Does not establish audit survival under database outages. |
| Admin `/admin` | Real create and role-save/reload; self-change refused; three last-admin races; health/settings reads; Firefox/WebKit section/search controls | F01–F03/F08/F10. Saving a real verified hotline remains an owner-dependent gate. |

## Additional limits and release gates

- **WebKit transport:** two Firestore Listen access-control errors were recorded in its resident context, despite all focused interaction checks passing. This is not a clean cross-browser realtime certification. Reproduce against a non-production hosted Firebase environment before attributing it to emulator/browser behavior or product code. Firefox and Chromium did not log page errors in these final sets.
- **Uploads:** no confirmed non-production Cloudinary configuration was supplied. No live Cloudinary upload was attempted; SDK/unit upload tests are mocked evidence only. Real authenticated photo delivery and upload failure cleanup remain release gates.
- **External services:** push delivery, email/invitation delivery, operating-system GPS/camera permissions, and physical-device behavior were not certified. No real external push/email was sent.
- **Service failure:** profile-setup 503, export 503, and report connection refusal were browser-injected. Browser offline/reconnect used `setOffline`; the API stayed available to the harness. No real backend process restart/outage or Firestore service crash was exercised.
- **Idempotency:** same-session unchanged retry and body mismatch were verified. Key persistence over browser reload, claim-expiry recovery, completion-write failure after report creation, and concurrent lost-response retries still need explicit integration tests.
- **Concurrency:** one-team assignment race and three last-admin races passed. This does not establish behavior under production latency or load.
- **Build:** compilation passes; production environment values and deployment were not reverified here. The pushed export-filename branch remains separate from the dirty working tree; no merge was performed.
- **Mobile:** this report covers the website. No Flutter or physical-device functional certification is claimed.

## Harness corrections and audit state

Raw logs retain the failed attempts. Hidden radio inputs were exercised by clicking their visible labels; ambiguous headings/dialog names and toast text were corrected. The film was scrolled into view before testing autoplay controls. Setup-dependent assignment assertions were replaced by a fresh report/dialog workflow. The initial fast unsaved-navigation probe falsely passed; the settled-page repeat demonstrates the loss and is the accepted result.

The audit volume reached the API's configured 300-per-15-minute limit. Initial 429-interrupted submit and Firefox download/account cases were excluded; they passed after the normal window reset. Limits were not disabled or increased. The first API suite attempt failed because the sandbox prohibited local listening; its preserved log is `api-tests-sandbox.log`. The authorized rerun passes.

`browser-curated.json` consolidates corrected Chromium outcomes while preserving raw logs and rechecks. `cross-browser-final.json` is the final compatible installed-browser run; the first run requested an unavailable WebKit build and hit rate limits later in Firefox.

The audit workspace now contains intentional temporary users/teams/reports and changed statuses. Do not copy that dataset into the clean presentation or production. Its emulators are ephemeral. Scripts are stateful evidence, not idempotent CI tests: start a fresh audit workspace and review their prerequisites before replaying. No product code changes, commits, merges, pushes, or deployments were made.
