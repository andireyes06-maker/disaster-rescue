# Full local product audit — October 18, 2026

Airen, the product is substantially more consistent, but **it is not finished or release-ready**. Passing suites and clean page-level axe/overflow results missed a severe mobile Users layout defect and several workflow gaps. The landing needs considerably less work than the staff/mobile completion items below.

## Audited source and boundaries

Current uncommitted integration at `/private/tmp/rescue-release-integration-2026-10-18`, branch `integration/redesign-functional-2026-10-18`, base **76e54ff**, including the creation-recovery continuation. Not the old functional branch alone and not the live production bundle.

Fresh stack: **http://localhost:5181**, API3108, Auth9799, Firestore8690, project `demo-full-audit-2026-10-18`. Fixture data only. This audit did not change product source, commit, push, merge, deploy, inspect production credentials, or stop other stacks. It created scripts/evidence and fictional records only. Runtime source hashes and recovery bundle identity were checked.

Skills applied: Code Review, Security Review, Design Critique and Animation Performance. Playwright used the existing project Chromium client and the compatible installed Firefox/WebKit client. No new plugins or packages were installed. Motion checks used normal motion; no reduced-motion audit was run.

## Prioritized findings

| ID | Priority | Finding | Evidence / location | Required repair |
|---|---|---|---|---|
| F01 | **High** | `/users` collapses staff names/emails into single-character columns at 390px. The identity column measures **0px**; Marco's row is about **816px high** with the intended Geist font. | `users-marco-geist-390.png`, `fonts-and-timing.json`; UsersPage.tsx:175–183, styles.css:481 | Stack identity and management actions at narrow widths; constrain/wrap the team selector. Assert readable identity width/row layout, not just document overflow. |
| F02 | **High** | Flutter drops the key after HTTP500 and says the report was NOT submitted. An ambiguous unchanged retry uses a **new key**, bypassing the guarantee tied to the original key. | `mobile-retry-probe.log`, observational Dart probe; mobile report_flow_page.dart:206–216 | Preserve keys across uncertain server/transport outcomes; fix receipt wording; retain minimal safe retry identity with restored drafts. Test real receipt-loss/500 semantics, not only status0. |
| F03 | **High** | Staff receive notification records but have **no bell or notification destination** in their shell. A dispatcher had four records and zero notification controls/links. | `responder-and-staff.json`; AppShell.tsx:96–101 | Add staff notification access, keyboard/motion/error states and role-correct report destinations. Do not mount the resident bell unchanged: its links currently target `/my/reports/:id`. |
| F04 | Medium | A responder can edit Notes while Posting; the earlier successful response resets the form and **erases the newer edit**. | `responder-and-staff.json`, `responder-pending-edit-loss.png`; OperationForm.tsx reset in onValid | Lock submitted fields while saving or preserve edits made after the submitted snapshot. Keep the busy action focusable and repeat activation guarded. |
| F05 | Medium | DMO audit permission differs by transport: **API403**, but direct Firestore audit query succeeds. Existing rules tests explicitly allow this. | `dmo-permissions.json`; firestore.rules:57–59, routes/audit.js:10 | Establish one permission matrix and align rules, API, navigation and tests. This is a confirmed authenticated role-policy inconsistency, not proof of unauthenticated data exposure. |
| F06 | Medium | Native operation update always offers Resolved, even when the incident is Team Assigned and the API requires Rescue in Progress first. | mobile operation_form_page.dart status segments; incident_detail_page.dart passes only ID; API workflow.js | Pass/listen to current report status and expose valid transitions; test with the actual workflow contract. Existing fake-backed UI tests accept Resolved without that constraint. |
| F07 | Medium | Native startup checks Firebase settings but has no release API/emulator guard; missing API_BASE_URL falls back to **http://10.0.2.2:8080/api**. | mobile/firebase_bootstrap.dart:6; main.dart configuration check | Add release validation for deployed HTTPS API, required configuration and forbidden emulator flags. No live cleartext transmission or physical-device exploit was tested. |
| F08 | Medium | Required markers/touch comfort are not consistent across platforms: native required entry labels have no stars; web password toggles measure **40px** high on phone and queue tabs **36px**. | `surfaces/surfaces.json`, native register/report golden sheets; PasswordInput and control CSS | Apply Airen's required-star convention to native required fields and finish the recommended 44px target pass. These measurements do not mean an axe/WCAG minimum-target violation was proven. |
| F09 | Medium | Admin navigation advertises Assignments but the default admin surface ends at “Your account is not linked… Ask a dispatcher…”, with no role-appropriate overview or action. | `surfaces/admin-assignments-390.png`; AppShell NAV, AssignmentsPage:119 | Provide an admin/team assignment overview or remove this dead-end from admin navigation. Preserve the genuine unlinked-responder recovery state. |
| F10 | Medium / UX scale | Activity lists load/render all updates oldest first. A valid render-stress fixture with 50 long updates produces **25,474px resident /28,735px staff** pages at 390px, with latest notes at the bottom. | `long-history.json`; ResidentReportDetail updates map; IncidentDetails updates map; useReport orderBy(at,asc) | Show a recent activity summary and make older/long notes expandable or paginated. No overflow/data loss was found; the measured height uses deliberately long, unbroken fixture notes, not a typical short incident. |

F02 proof uses an injected500 in a widget test and verifies the changed keys; it did not reproduce a duplicate against a physical device and live transport. F04 uses a delayed successful response. F01/F03/F05 are direct rendered/read-only observations against the local stack. F06/F07 are source/contract findings. Keep those evidence distinctions in follow-up reports.

## Dependency and security review

The API production-dependency advisory scan returned **0 findings**. The web production-dependency scan returned **11 high-severity package entries**, propagated through two advisory families. This is not 11 independently demonstrated application exploits.

- The [gRPC certificate-context advisory](https://github.com/grpc/grpc-node/security/advisories/GHSA-m9gg-hp2v-232j) affects the installed `@grpc/grpc-js`1.9.16 in the dependency tree. Its described condition concerns gRPC server authentication configuration; that server path was not found in the browser application.
- The [braces recursion advisory](https://github.com/micromatch/braces/issues/70) is reported for installed braces3.0.3 through shadcn/registry/glob tooling. The maintainer disputes its practical security significance in that issue, noting the supported length limit and risks of accepting untrusted patterns. No user-supplied glob-processing path was found in the browser bundle. This remains dependency triage, not an established app exploit.

Triage compatible updates and the placement of build tooling in production dependencies. Do not blindly apply npm's suggested major-version downgrades. Raw scan output: api-dependencies.json and web-dependencies.json. No confirmed unauthenticated high-confidence exploit was established by this review; that is a scoped result, not security certification.

Reviewed authentication/canonical-role enforcement, resident ownership, responder team scope, Firestore write denial, public projection, upload constraints, text rendering, exports, idempotency and recovery. Public incidents omitted IDs/contact/photos/precise location fields in the direct check. Runtime source scan found no private-key markers; environment/service-account files were not read. DMO inconsistency F05 remains open despite route tests passing.

## Fresh verification

| Area | Result / limitation |
|---|---|
| Web suite | **436 pass**,64 files; typecheck clean |
| API suite | **351 pass,18 skipped**; skipped emulator-only cases are not silently counted as passed |
| Firestore adapter suites | **17/17** real emulator transaction/identity/recovery checks |
| Firestore rules | **129/129**, including server-only recovery jobs |
| Flutter | Analysis clean; **128/128** tests, including tracked legacy goldens |
| Native500 observational probe | Confirms changed retry key; this is defect evidence, not a desired-behavior pass |
| Production bundle | Ordinary build passes |
| Release preflight | **Blocked as expected**: this worktree lacks deployed VITE_* configuration; no production values were read |
| Responsive pages | **82** fresh cases across 18 routes / six role contexts, with zero stable axe violations, document overflow, missing visible web required marks, unsettled skeletons or Chromium page errors |
| Expanded Admin | **16** cases: four sections ×390/768/1024/1440; zero axe/overflow or sampled visible text below13px |
| Role guards | **65/65** allowed/denied route cases and five signed-in login redirects |
| Main browser workflows | Raw20/21; remaining responder step was retried correctly after the prior save finished, and real resolution plus dispatcher close passed. The pending-edit defect is independently recorded F04 |
| Extra retry/offline workflows | Corrected **5/5**: real lost-reply retry, retained429 fields, team audit display, resident reconnect, dispatcher/responder reconnect |
| Remaining API cases | **5/5**: cross-resident cancellation denial, reject, duplicate, creation audit, public privacy |
| Critical probes | **5/5**: role/stat access, filtered CSV/PDF totals, immediate/delayed demotion and concurrent last-admin protection |
| Staff first activation | Browser reset request, emulator OOB consumption, first dispatcher sign-in pass; not real email delivery |
| Firefox/WebKit critical set | Initial11/12; one WebKit coordinate disclosure failed once. Three focused fast-click/settled-click/keyboard WebKit rechecks passed. Retain this as an intermittent observation, not an unconditional12/12 |
| Firefox lost reply/reload | **4/4** against the current-code audit stack, real acceptance/read-back plus injected response loss |
| Unsaved navigation | **6/6** Back, Forward, header navigation, accepted leave, offline feedback and notification motion |
| Page boundary | No fallback appeared in82 normal surface checks; controlled failed API states rendered recovery UI |

Fresh functional checks include registration, wrong-password handling, interrupted profile provisioning, session restore, report submit/cancel, queue/filter recovery, priority/classification/verify/assign, responder progress/resolve, closing, notification read persistence, team create/rename, exports and invalid ranges, email search, team audit display and real external updates after reconnect. Not every historical UI permutation or browser/workflow combination was rerun.

## Visual / motion conclusion

The full landing composition is coherent: the dark header now has visual weight, resident action leads, workflow and audience sections support it, and the footer closes the page. Access, resident, map, Teams and most Admin compositions follow the same system. A wholesale redesign of those pages is not warranted by this audit. F01 is a real broken layout, and F09/F10 still feel unfinished in role/volume edge states.

Screenshot contact sheets cover all 18 web surfaces in desktop and phone previews; expanded Admin and selected full pages were inspected separately. Native sheets cover 15 legacy golden surfaces, which passed current golden comparison; they do not constitute new device captures or approval of a new mobile redesign.

Normal-motion evidence:

- Arrivals recorded on all 82 route cases. No source scroll/rAF render loop, transition:all or permanent will-change pattern was found.
- Bell panel300ms enter /160ms exit,35ms row stagger, trigger origin, Escape/reopen interruption and focus return checked.
- Error icon feedback220ms and transform-only skeleton sweeps observed.
- Landing autoplay, pause/resume, actual chapter seeking, offscreen pause and failed-video illustrated fallback checked.
- Keyboard skip link reaches main after the route is ready; raw initial timing failure and the successful settled recheck are retained.
- 4× CPU-throttled headless Chromium sample: median16.7ms, p95~16.8ms, one frame over34ms. This is not physical-phone/GPU/120Hz certification.

Known environment observations: the symlinked dev server rejects Geist WOFF2 requests outside its root. A controlled fixture served the exact installed font bytes; the Users defect persisted with Geist loaded. Production output bundles the fonts. Do not confuse dev fallback-font screenshots with a fully verified deployed font load. WebKit still emits local Firestore Listen errors around full navigation; hosted behavior remains unverified.

## Remaining release work beyond the findings

1. Abandoned-photo cleanup is still only a design: reserve/provider-reconcile assets and protect winner photos before claiming crash cleanup. Real non-production Cloudinary upload/lifecycle verification is also missing.
2. Durable creation effects are implemented/tested; other incident/account/team transitions still have best-effort audit/notification work. Push remains at-least-once. Claims/recovery records have no approved expiry/retention policy.
3. Non-production email/push delivery and hosted Firebase/WebKit need actual configured targets. Emulator OOB codes are not delivery proof.
4. Physical-device GPS/camera/permission behavior and current mobile motion/appearance need a phone/simulator run. Native tests and old goldens cannot replace this.
5. Owner-approved emergency hotline, resident/privacy wording and retention decisions remain unconfigured. No number or policy was invented.
6. A reviewed release commit/scope and deployment configuration are still required. No deployment is authorized by this audit.

## Harness corrections and honesty

Raw runs remain available. The extended retry script initially expected automatic redirect and ignored the new explicit replay choice; it was corrected. Its dependent assignment initially failed because the earlier responder run had not closed/released the team; the valid sequential workflow and corrected reconnect passed. The first missing-report assertion expected the wrong wording. The first DMO browser probe loaded a duplicate SDK module; a minimal same-SDK Node client established the actual permission discrepancy. The initial Teams empty-state axe run sampled during arrival opacity; the settled recheck was clean. The first skip-link check ran before route readiness. The single WebKit coordinate failure is not yet attributed, and was not erased.

Source was unchanged throughout; source-manifest.json, source-verification.json and exact logs identify this audit snapshot. Start PAGE-LEDGER.md for per-page work and CLAUDE-PROMPT.md for continuation.
