# Pre-deployment audit: website, Flutter, API, and Firebase

For **Airen**. October 16, 2026, Asia/Manila.

**Decision: NO-GO for the audited release candidate.** The existing suites pass, but additional checks expose authorization, assignment, submission, accessibility, and workflow failures. This audit does not change application code and does not authorize a push or deployment.

## Release identity and limits

- Repository: `/Users/rien/Documents/FINAL_PROJECT`; branch `build/disaster-rescue`; revision **`e9c6426`**.
- Scope: public/auth/resident/dispatcher/responder/DMO/admin website routes; all Flutter feature families and native configuration; API workflows, authentication, public projection, exports, Firestore rules, dependency advisories, and local release records.
- Accepted visual reference: `../dashboard-concept-v11-final-web.png`; mobile refinement: `../mobile-concept-v2-refined.png`. Preserve their indigo/violet identity. Do not reopen the palette or equate generated screenshots with implemented behavior.
- Read-only product audit. New audit documents, local test helpers, screenshots, and logs only. Existing unrelated/untracked files preserved. No production login, invitation, account mutation, data mutation, push, or deployment.
- Browser environment: isolated **`demo-predeploy-rescue`**, Auth **9299**, Firestore **8380**, Express **3301**, Vite **5175**. Synthetic records and local-only sign-ins. Upload/push adapters disabled. The browser rewrites only the served development Firebase module's hardcoded emulator ports; application source is unchanged. External account services are blocked; public OSM tiles are allowed. Existing local services were not reset.
- Cleanup: the audit-created emulator/API/Vite processes were stopped after verification. Archived helpers contain machine-local paths and demo-only fixtures; inspect the project/ports before rerunning and never substitute production configuration.
- Native findings use source inspection and Flutter widget tests. No Android device/AVD was available; iOS simulator tooling was unavailable. No native screenshot, real screen-reader session, push-delivery test, platform-permission test, or release package was verified.
- Public production URLs could not be accessed through the web tool. **Do not interpret this as proof of an outage.** Current deployed headers, API/frontend compatibility, live rules/configuration, and real account flows remain unverified. Older handoff statements about production are historical evidence only.

## Verification actually performed

| Check | Observed result | Evidence |
|---|---|---|
| Web typecheck + unit/component suite | **228 passed, 34 files** | `evidence/web-tests.log` |
| Web production build | Passed; chunk-size and ineffective-lazy-import warnings | `evidence/web-build.log` |
| Existing Chromium public/login smoke suite | **4 passed**; no live sign-in | `evidence/web-e2e.log` |
| Website route/role captures | **84 captures**, 1440/768/390/320px; no measured whole-page horizontal overflow | `browser-results.json`, `screenshots/` |
| Additional focused browser checks | Motion preferences, dialog focus, Back state, invalid fields, admin role display, 200% CSS zoom | `focused-probes.json`; 2 additional screenshots |
| API suite | **254 passed, 28 files** | `evidence/api-tests.log` |
| Firestore rules suite | **121 passed** in isolated test namespaces | `evidence/rules-tests.log` |
| Additional backend invariant probes | Four defect assertions reproduced | `evidence/backend-probes.mjs`, `.log` |
| Stale-claim Firestore probe | Old active staff claims still read a private record after canonical disable/demotion | `evidence/security-probes.mjs`, `.log` |
| Flutter analyzer | Clean (`flutter analyze --no-pub`) | `evidence/mobile-review.md` |
| Existing Flutter suite | **107 passed** | `evidence/mobile-tests.log` |
| Additional Flutter edge checks | **1 passed, 3 failed**: two missing semantic tap actions; landscape overflow | `evidence/mobile-edge-tests.log`, `mobile-edge-tests.dart` |
| API production dependency advisory scan | **0 reported advisories** | `evidence/api-dependencies.json` |
| Web production dependency advisory scan | **11 high dependency-tree entries**, not 11 independently demonstrated exploits | `evidence/web-dependencies.json`; D01 below |
| Application tracked diff | No application-source edits from this audit | final git verification |

The browser console includes deliberately failed synthetic photo URLs and injected team-service 503 responses. Those are test inputs, not evidence of an unexplained production fault. Do not claim a completely error-free console. The 200% CSS-zoom capture is a limited reflow check, not a full browser/assistive-technology certification.

## Priority and evidence conventions

**P1:** repair before the relevant public release; core workflow, privacy, access, or critical accessibility failure. **P2:** material functionality/usability/reliability issue; fix and reverify supported journeys before acceptance. **P3:** lower-priority quality work. Android-only distribution issues do not automatically block a web-only deployment. Review unverified release gates separately rather than counting them as demonstrated code exploits.

**Runtime** means a browser/widget/emulator or isolated service probe reproduced the condition. **Source** means the behavior follows from the inspected reached code; it is not a measured production incident.

## Highest-priority findings

| ID | Priority | Problem and evidence | Required correction and regression |
|---|---|---|---|
| BE01 | P1 | **Stale staff claims retain Firestore access.** `firebase/firestore.rules:7`, `:12`, `:15`; `api/src/services/userService.js:73`. Rules trust token role/active/team, while API revocation does not establish a rules-side current-state cutoff. Isolated old dispatcher claims read another resident's contact/exact coordinates despite disabled/demoted canonical user. | Authorize against current trusted membership/active/role/team or a tested version/revocation design. Fail closed and reconcile Auth/Firestore partial failure. Test stale claims, new reads, listeners, demotion, disable, and team reassignment. |
| BE02 | P1 | **One team receives two simultaneous assignments.** `api/src/services/assignmentService.js:18`, `:28`, `:31`; report CAS protects only one report, not the shared team. Two different reports both succeed for one free team; team pointer retains only the second. Runtime probe. | Atomic report/team transaction with conflict handling; close/free must obey the same invariant. Add different-report/same-team concurrent regression, not only same-report tests. |
| BE07 | P1 | **Two admins can remove each other concurrently and leave zero active admins.** `api/src/services/userService.js:66`. Check then independent writes races; isolated probe returned two successes and zero active admins. | Serialize the last-admin invariant and provide durable/recoverable Auth reconciliation. Test simultaneous cross-target disable/demotion and partial failure. Do not pretend external Auth writes participate in a Firestore transaction. |
| BE08 | P1 | **New staff accounts have no in-product first-password path.** `api/src/services/userService.js:29`; `web/src/features/users/UsersPage.tsx:63`; clients use password sign-in. Creation sets email/claims but no password, invitation, or supported setup/reset flow exists. Source-confirmed onboarding gap. | Secure provider-generated invitation/password setup, trusted continuation URL, delivery pending/sent/error UI and documented fallback. Never expose plaintext passwords. Test creation through first sign-in with synthetic services; do not send real invitations. |
| W01 | P1 | **Dispatcher cannot close a resolved report.** `web/src/features/reports/workflow.ts:22`; `IncidentDetails.tsx:261`. Resolved falls into “No action needed”; there is no close control anywhere in web features although `api/src/routes/reports.js:52` exposes the required transition. Browser `resolvedNext` confirms no close action. | Model Resolved → Closed explicitly in shared next-step logic and offer the authorized close action with clear consequence/feedback. Test the full lifecycle, team release, duplicate taps, conflict and failure. |
| W02 | P1 | **Admin's “all staff permissions” promise is lost in report UI.** `ReportQueue.tsx:124`, `IncidentDetails.tsx:151`: `role === 'dispatcher'` suppresses actions for admin despite route/API access. Browser confirms no admin preview verify link or incident action rail. | Use a shared staff-capability predicate consistent with server guards. Verify admin verify/reject/assign/close/classify/duplicate flows, and DMO remains read-only. |
| W05 | P1 | **Resident detail misreports read failures as missing/empty data.** `features/resident/ResidentReportDetail.tsx:17`, `:26`, `:69` discards report/history error state. History hook lacks initial loading. Source-confirmed. | Distinguish initial pending, failed, missing-after-success, and empty history. Add Retry; preserve authorized known data on recoverable refresh. Test first-read failure and successful retry. |
| M01 | P1 | **Hotline and incident categories cannot be activated through their semantic nodes.** `mobile/lib/features/report/hotline_button.dart:32`, `report_flow_page.dart:470`: outer `excludeSemantics:true` hides child action without providing `onTap`. Two failing widget checks confirm absence of `SemanticsAction.tap`. | Preserve native control semantics or correctly wire a single accessible action. Test semantic activation, then actual TalkBack/VoiceOver call/category behavior. |
| M02 | P1 | **Sensitive saved draft crosses resident accounts.** `mobile/lib/features/report/report_draft_store.dart:15`, `report_flow_page.dart:82`, `auth/auth_repository.dart:222`. Global draft key stores location/contact/description; logout/account switch has no ownership boundary. Source-confirmed. | Scope persisted and in-memory draft by authenticated UID, handle ownerless legacy drafts, and clear sensitive state on identity change. Test A saves → logout → B cannot see/restore → A retention follows policy. |
| M03 | P1 | **A successful report can be shown as not sent when draft cleanup fails.** `mobile/lib/features/report/report_flow_page.dart:179`. `reports.create` success followed by failing `drafts.clear` enters the same submission-failure catch. Source-confirmed. | Separate confirmed delivery from best-effort local cleanup. Keep the receipt/reference, prevent resubmission, test throwing cleanup after successful create. |
| M04 | P1 | **Lost response is presented as definite non-delivery, making retries unsafe.** `mobile/lib/data/api_client.dart:94`, `report_flow_page.dart:199`, `features/offline/offline_help_page.dart:45`; API report creation has no durable operation key. Source-confirmed uncertainty/idempotency gap. | Durable per-submission idempotency across client/API, explicit uncertain-outcome recovery, server reconciliation. Test commit succeeds/response lost/retry → one report and same receipt. Keep legitimate separate reports possible. |
| M05 | P1 | **Open responder details stay on a stale assignment snapshot.** `mobile/lib/features/responder/incident_detail_page.dart:14`, `:23`, `:49`; no live revalidation while a dispatcher changes assignment/status. Source-confirmed. | Observe current authorized report state, remove sensitive details on revoked access, derive actions from current state, recover conflicts. Test reassignment and terminal transition while detail is open. |
| M10 | P1, Android distribution | **Release build uses debug signing.** `mobile/android/app/build.gradle.kts:32`. | Configure external protected release signing and fail a distribution build when absent; inspect actual package signature. Never add keystore/passwords to source. Web-only release scope is separate. |

Backend reproduction details, positive security checks, and additional references are in `evidence/backend-review.md`. Native evidence and detailed source references are in `evidence/mobile-review.md`.

## Remaining confirmed backend findings

| ID | Priority | Evidence and consequence | Fix and regression |
|---|---|---|---|
| BE03 | P2 | `assignmentService.js:71`, `:76`, `:84`: status commits before update details/team release. Injected update-write failure leaves Resolved without note/count; retry returns 409. Closing can similarly strand team availability. | Atomic domain transitions plus stable operation identity/recovery. Inject failure at each prior write boundary; no lost details or duplicate updates. |
| BE04 | P2 | `services/publicIncidentService.js:18` expects top-level `lat/lng`; `reportService.js:21` stores nested `location`. Real-shaped eligible records project to `[]`; browser `/my` shows no incidents despite active fixtures. | Project the canonical validated/coarsened location. Add create → verify → public endpoint test and privacy DTO assertions. Correct top-level-only test fixtures. |
| BE05 | P2 | `routes/users.js:18`, `services/userService.js:18`, `:48`: privileged account creation/role/activation changes do not record audit events. | Durable actor/target/action/time and safe before/after access values; no passwords/tokens. Test successful/refused/partial-failure operations and read authorization. |
| BE06 | P2 | `adapters/firestoreRepo.js:46`, `:56`; `statsService.js:37`; `routes/export.js:13`; `exportService.js:27`: unbounded historical reads, per-report update queries and buffered PDFs; direct web subscriptions also download all records. Actual capacity failure threshold unmeasured. | Define supported load; bounded server queries/cursor pagination, aggregates/projections, export limits, bounded concurrency/deadlines. Test limits in isolation. Client-only pagination does not bound downloads. |

## Website UI/UX, loading, motion, and accessibility

| ID | Priority | Evidence and effect | Correction and acceptance test |
|---|---|---|---|
| W03 | P2 | `styles.css:145–148`, `ReportQueue.tsx:73`: below 1200px preview stacks after every row; row click only changes selection. At 390px, clicking Fire leaves preview **2039.8px below viewport top**, with viewport height 900px. | Use a clear single-column report-detail navigation or accessible focused detail view with Back/list-position restoration. Test selecting top/middle/bottom rows on phone and keyboard without hunting below the entire inbox. |
| W04 | P2 | `AssignTeamDialog.tsx:116–129` hides close, prevents outside dismissal, and renders no buttons on team-load failure. Injected 503 produces a dialog with **zero buttons**. | Always show accessible Cancel/Close during pending/error and Retry on error. Test never-resolving/error/empty/success requests, touch close, Escape and focus return. |
| W06 | P2 | `ResidentDashboard.tsx:35`, `useMyNotifications.ts:17`, `AnalyticsPage.tsx:89`, `IncidentMap.tsx:92`, `PublicIncidentMap.tsx:43`: blank or premature empty initial states; large content replaced by short loading text. No web skeleton implementation exists. Delayed resident map section is 189px total versus a 320px loaded map alone. | Implement the explicit skeleton/state contract below. Preserve reading regions during refresh, label stale data, and show empty only after successful empty response. Verify delayed initial/refresh/failure/retry cases and positions. |
| W07 | P2 | `components/ui/dialog.tsx:42`, `:65`: browser normal **and reduced motion** both run `enter`, duration `0.1s`, initial scale **0.95**. `button.tsx:7` adds reached `transition-all`/press translation. | Apply shared motion values, reduced-motion no-scale/slide/spin fallback, explicit transition properties and immediate keyboard feedback. Preserve focus/presence and test rapid reversal. **Selectors are valid:** imported shadcn maps `data-open` to Radix state; do not “fix” a nonexistent mismatch. |
| W08 | P2 | `ReportQueue.tsx:93–96` stores selection/filters in component state. Browser Back returns from filtered Fire/1 row to default Flood/8 rows with filters closed. | Preserve filter/selection state in a deliberate URL/router owner and restore list scroll. Test reload, Back, forward, filtered-out/missing selection, new incoming records; no involuntary selection change during a decision. |
| W09 | P2 | `features/resident/ReportForm.tsx:56–61`, `:116`: invalid submit renders a bottom banner, leaves focus on the submit button and no `aria-invalid` fields. Browser confirms all three. | Field errors linked with descriptions, invalid state, first-invalid focus and suitable summary; preserve entered values. Test keyboard and screen-reader navigation for type, location, photos, and contact pairing. |
| W10 | P2 | `ReportForm.tsx:23–30` keeps values only in local state with no leave guard. Browser types a description → My reports → report form → description is empty without warning. | Explicit unsaved-work protection and/or owner-scoped safe draft policy; state/retention privacy considered. Test route change, reload, account switch and recovery. Do not persist attachments or sensitive data without a defined policy. |
| W11 | P2 | `admin/AccountsPanel.tsx:15`, `:27–44`, `:76`: resident returned by `/users` has no matching role option, so browser displays **responder** for a resident. Changing a select immediately mutates access; creation/role changes lack pending guards. `TeamsPanel.tsx:14`, `:27` also lacks pending guards. | Render every actual permitted role truthfully, distinguish read-only/own-account cases, stage consequential access changes behind explicit confirmation/save, prevent duplicate concurrent operations, show local progress/result/errors and Retry. Test resident role display, pending repeated click, out-of-order responses and forbidden/self/last-admin errors. |
| W12 | P2 | `resident/ResidentLayout.tsx:19–39`: ordinary Links never show current page or `aria-current`; no skip link or route-title effect. Browser `/my/report` retains generic `Disaster Rescue Reporting` title. | Add route-aware active navigation, useful titles, skip/main target and deliberate route focus without stealing focus on live data updates. Test resident keyboard navigation and title changes. Menu Escape currently leaves the inline staff menu open; handle it if the agreed interaction contract requires it, without falsely imposing modal focus-trap semantics on an inline disclosure. |
| W13 | P2, design completion | Current rendered dashboard has summary outside the masthead, separate panels, no search input, pill quick views, a white selected sidebar item, and uppercase detail labels. Compare `screenshots/dashboard-1440.png` with the accepted v11 target and `COMPLETE-EXPERIENCE-REDESIGN.md`. Mobile still uses old teal theme (M11). | Complete the accepted system deliberately across routes; implement search over actual data if retained, integrated framing and hierarchy. Preserve business rules and the approved identity. Use side-by-side screenshots; do not claim exact typography from a generated image. |
| W14 | P2, performance | Production build entry **547.16kB / 165.50kB gzip**, shared Banner-named chunk **561.44kB / 168.74kB gzip**. AuditPage is eagerly imported by eagerly imported AdminPage despite a lazy declaration. | Trace the actual initial dependency graph, split role-only routes/dependencies, remove ineffective mixed imports, and set realistic budgets. Measure transfer/render on a representative connection before claiming a speed gain. Do not just raise the warning threshold. |
| W15 | P3 | `web/index.html:5–7` has generic title only; no public description, social metadata, favicon or theme-color. `web/vercel.json` defines rewrite/build but no headers. Effective production headers unverified. | Add factual public metadata and route title policy, appropriate privacy/indexing decisions for protected pages, and a verified compatible header/CSP strategy. Do not apply API Helmet assumptions to the separately hosted SPA or invent canonical domains. |
| W16 | P3 | `.quick__chip` in `styles.css:160` is **40px**, below this project's 44px target; browser confirms. Some inline back/contact links are 18–19px high. | Make primary touch controls meet the adopted target. Evaluate legitimate inline-text-link exceptions rather than treating every small link as an automatic WCAG failure. Verify focus and tap spacing on actual phones. |

### Skeleton and asynchronous-state acceptance contract

This is useful loading design, not a request to make every screen shimmer.

1. Introduce one reusable accessible skeleton treatment. Decorative shapes are hidden from assistive technology; each data region has an appropriate `aria-busy`/status message, not one announcement per skeleton block.
2. Match the expected geometry: inbox rows and preview, directory rows, admin accounts/teams, profile/report/history groups, chart region, and map frame. Staff map keeps its existing minimum 360px frame; public map reserves its 320px map area. Mobile lists/profile use native equivalents, not web CSS libraries.
3. Separate **first load**, **successful empty**, **failure**, **background refresh**, and **stale/offline content**. Do not show “No notifications” or “Report not found” until a successful read establishes it.
4. On background refresh keep prior authorized data where useful with an honest refreshing/stale state. Do not label old analytics as the new filter's result. Do not retain data after authorization is lost.
5. Keep filter/action controls and their focus stable. Loading must not erase unsaved input, move the focused control, or disable emergency calling.
6. Static skeleton under reduced motion; no perpetual shimmer without user-control consideration. No artificial minimum delay, fake percentage, count-up, or queued route entrance.
7. Pending mutation uses an immediate specific label and duplicate-request protection. Important errors/results remain near the initiating action. A skeleton never substitutes for a save result or unresolved request.
8. Test slow initial reads, cached refresh, successful empty, error, retry, tab/keyboard use, reduced motion, and phone/zoom layouts. Measure shifts before reporting a CLS number.

Motion detail is in `evidence/motion-review.md`. The earlier selector-mismatch theory was falsified by the built CSS/browser and withdrawn. Normal dialog focus return to Assign team passed in the focused check; do not report it as broken based on the earlier immediately sampled result.

## Remaining native findings

| ID | Priority | Evidence and consequence | Required correction/test |
|---|---|---|---|
| M06 | P2 | `mobile/lib/features/map/incident_map_page.dart:67` fixes map at 260dp plus filters/list; 640×320 widget viewport reports **120px bottom RenderFlex overflow**. | Adaptive available-height or landscape split layout; test portrait, landscape, enlarged type, filters and list access. |
| M07 | P2 | `features/profile/profile_page.dart:30`, `data/services.dart:406`: waiting/errors become “Not set”; repository swallows errors as null. | Explicit pending/error/empty states and Retry; stable profile skeleton, distinguish unavailable from absent fields. |
| M08 | P2 | `my_reports/my_reports_page.dart:70`, `responder/assigned_list_page.dart:91`, `notifications/notifications_page.dart:45`, `map/incident_map_page.dart:42`: terminated stream errors say try again but offer no reconnect control. | Recreate stream through Retry; preserve authorized cached data with clear stale state; test fail/recover and revocation. |
| M09 | P2 | `report_flow_page.dart:82`, `:166`, `:202`: draft saved only after failed network submission; ordinary interruption loses input and system Back does not navigate the form step. | Owner-scoped persistence/lifecycle strategy and predictable internal Back without trapping system Back. Declare photo reattachment limits. Test interruption/restoration/exit and identity changes. |
| M11 | P2, design completion | `mobile/lib/theme/app_theme.dart:5` retains teal/cream rather than accepted indigo direction. Dark scheme/adaptive/motion verification not complete. | Implement accepted mobile system via Material roles after resolving P1s; define supported devices/themes. Test actual native rendering. Absence of custom motion is not itself a reduced-motion violation. |
| M12 | P2 | `features/notifications/notifications_page.dart:23` only marks read and does nothing on an already-read tap, despite a report reference. | Navigate to authorized report details, handle missing/reassigned record, and mark read separately; unify supported push-open routing. Real push delivery remains unverified. |

## Dependency advisory result: D01

**P2 / release review required.** `npm audit --omit=dev --package-lock-only --json` reports **11 high tree entries** in the web lockfile, rooted in `@grpc/grpc-js` and `braces` advisories. API scan reports zero. These are package-tree findings, **not proof that this browser application exposes an exploitable gRPC server or user-controlled glob parser**. `shadcn` is currently in web production dependencies although much of that tree is tooling.

Trace runtime/build reachability, remove unnecessary production tooling, update supported compatible versions or document a reviewed mitigation, and rerun lockfile tests/build/advisory checks. **Do not run `npm audit fix --force` or accept the tool's suggested downgrade to Firebase 9/shadcn 1 blindly.** Review root causes rather than counting transitive entries as independent flaws. Primary advisory details: [gRPC](https://github.com/advisories/GHSA-m9gg-hp2v-232j), [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

## Guide coverage and release gates

The guides are standards to apply, not evidence that their checkboxes already pass. Optional animation/trend catalogs do not require adding every effect or installing every plugin.

| Guide/gate | What was checked | Status / remaining evidence |
|---|---|---|
| 06 UI/UX; 07 trend catalog; 11 design brief | Existing accepted direction, rendered hierarchy, route tasks, composition drift | W03/W08/W11/W13 and M11 open; no new direction selection needed |
| 08 motion; 09 motion patterns; 10 frontend | Reached motion, native conventions, loading geometry, controls/forms, focus, token usage | W04/W06/W07/W09/W12/W16 and M01/M06–M09 open; not every catalog effect applicable |
| 14 development; 15 verification | Revision, existing suites, new probes, artifacts, source protection | Local evidence attached; no exact-release CI artifact or full device/browser matrix |
| 16 security/reliability; P3/P4 | Roles, ownership/rules, uploads, public DTO, workflow atomicity, advisory checks | BE01/BE02/BE07 and M02 open; production IAM/secrets/policy not certified |
| 18 website checks; P9 | Four widths, normal/failed/pending states, motion preferences, limited zoom | No whole-page overflow in tested captures; remaining accessibility findings; Firefox/WebKit/real phones/screen readers pending |
| 20 app launch; 21 P1/P2 | Current code/tests/journeys and release identity | **NO-GO**: passing suites miss reproduced failures; real external integrations unverified |
| P5 migration/recovery compatibility | No schema migration executed by audit | Fixes introducing canonical auth state/transactions require compatible rollout and backfill/recovery plan |
| P6 backups/restore | `docs/backup-and-recovery.md` reviewed | NOT RUN records; no current isolated restore evidence for actual Firestore/Auth/photos |
| P7 monitoring/readiness | Health implementation and release docs reviewed | Provider configuration, external uptime, alert delivery, accountable operator not verified |
| P8 privacy/content | Public pending privacy text and actual sensitive-data paths reviewed | Need owner-reviewed notice, retention/deletion/attachment-access policy; no legal compliance certification |
| P10 deployment/recovery | `render.yaml`, `web/vercel.json`, `docs/deploy.md`, handoff compared | Deploy doc still claims nothing deployed at an old revision; current artifact/API/rules compatibility, rollback and named operator pending |
| P11 uploads/quotas | Count/size/content validation and rate limits present; workload access reviewed | BE06; provider budgets, cross-replica quotas, load/concurrency/deadline limits not verified |
| P12 payments | No payment/subscription feature found | N/A for inspected scope; no payment library required |
| P13 capacity | Unbounded reads and export paths inspected | No capacity/SLA baseline or authorized load test; no latency claim |
| P14 native distribution | Android signing/manifest and iOS declarations reviewed | M10; no native release package/device acceptance; store submission requirements depend on chosen distribution |
| 12 agentic UI; marketing/pets/integration skills | No corresponding product feature in audited scope | N/A; do not install/add features merely to apply a guide |

Current production headers/CSP, actual live API version, real email invitation/upload/push behavior, full TLS/session configuration, administrator policy, secret-history scan, effective service-account permissions, backup restore, alerts, and final operator runbook remain **pending**, not “passed” or “failed exploit.” Signed photo-delivery links need a reviewed expiry/revocation policy; no live attachment URL was fetched.

## Fix order and Claude handoff

1. BE01/BE02/BE07, M01/M02, then W01/W02: authorization, core invariants, accessible emergency controls, and complete staff lifecycle.
2. M03/M04 with API idempotency, BE03/BE04/BE08, W05: honest delivery/recovery, public map, onboarding, truthful report state.
3. W03/W04/W08/W09/W10/W11, M05–M09/M12: mobile workflow, error recovery, focus, state retention, admin correctness.
4. W06/W07 and native loading/motion: complete state model and scoped skeletons, then visual polish. Avoid hiding failures behind skeletons.
5. BE05/BE06, D01, W12–W16/M11: auditability, data bounds, dependency review, approved design completion, performance and metadata.
6. M10 and actual device/release evidence for native distribution; complete applicable release gates and reassess the exact candidate before any push/deploy.

Use [CLAUDE-FIX-PROMPT.md](CLAUDE-FIX-PROMPT.md). It authorizes fixes only when Airen gives that prompt to the executor. This audit has not applied fixes. A narrower web-only release may defer native-only work explicitly, but cannot waive shared backend/privacy failures or claim the whole product is ready.

## Tools, skills, and evidence integrity

Applied local Software Build Guidelines, Web Interface Guidelines (fresh primary-source rules), Impeccable/native Android guidance, motion-audit and Emil principles, and security-review references. The motion workflow explicitly supports parallel category review; backend/native findings were independently inspected against source and local evidence. Built-in browser automation used installed Playwright/Chromium. No optional plugin was installed or claimed authenticated simply because present.

The Impeccable executable launcher is not directly executable in this installation; its documented fallback uses existing project context directly. No detector output is substituted for this audit. No physical screen reader/device or production verification is claimed. Findings were revised when contrary runtime evidence appeared.

Primary web review rules: [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). Native guidance is the installed Impeccable Android reference and actual Flutter source/widgets. No generated concept image is presented as runtime evidence.
