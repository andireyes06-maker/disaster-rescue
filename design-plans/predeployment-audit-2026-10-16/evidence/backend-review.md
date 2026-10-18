# Backend, rules, security, and release audit

Revision: e9c6426, 16 October 2026. Read-only product audit. No production login, credential use, production data writes, installs, or application source edits. Applicable instructions read: security-review (authorization/file security/JavaScript), Software Build Guidelines chapters16,20,21. API tests ran with loopback permission. All experiments used in-memory fakes or distinct emulator namespaces.

## Results

- API:254 tests/28files PASS, `/tmp/rescue-audit-api-tests.log`. Initial sandbox run could not bind127.0.0.1; rerun outside sandbox passed.
- Firebase rules:121 tests/13suites PASS, `/tmp/rescue-audit-rules-tests.log`. Existing suite copied to `/tmp/rescue-audit-rules.test.mjs` with project changed to `demo-predeploy-rules-audit`, explicit Firestore8180 and absolute rule/import paths. Assertions unchanged. This never cleared `demo-disaster-rescue`.
- Additional stale-claim regression: confirmed, `/tmp/rescue-audit-security-probes.log`, script `/tmp/rescue-audit-security-probes.mjs`, project `demo-predeploy-security-audit`. Both synthetic project datasets cleaned afterwards.
- Anonymous/public projection deliberately removes private fields; write rules deny client writes; API verifies revoked tokens; role and ownership gates, upload count/byte/content checks, CSV formula protection, CORS allowlist and Helmet present. Passing existing tests do not cover the failures below.

## Confirmed findings

### BE-01 High / P1: Old staff claims retain direct Firestore access after deactivation/demotion

Evidence: `firebase/firestore.rules:7-18,23,33,48`; `api/src/services/userService.js:73-81`; `api/src/server.js:26`.
The API checks Firebase revocation, but clients also read Firestore directly. Rules authorize from the token's role/active/team only, without authoritative user state or a revocation cutoff. Emulator test wrote users/staff `{role:'resident',active:false}` and another resident's synthetic report with contact/exact location, then read it successfully using the old `{role:'dispatcher',active:true}` claims. The newly issued disabled claims are denied. This demonstrates stale rule authorization, not that revoked live tokens were minted or tested; actual remaining exposure depends on token expiry/provider behavior.
Fix: enforce current role/active/team from canonical server-maintained user state in rules, or a tested authorization-version/revocation-time design, across all protected collections. Update Auth and canonical state coherently, fail closed on partial failure. Test old still-valid claims after demotion/deactivation/team changes, existing listeners and fresh reads. Verify queries still work without broadening permissions.

### BE-02 High operational / P1: One team can receive two concurrent assignments

Evidence: `api/src/services/assignmentService.js:18-31`; `api/src/adapters/firestoreRepo.js:68-75,98-103`.
Team availability is read before an atomic status change that protects only one report. Team busy/currentReport is saved separately. Isolated `Promise.all` of two dispatchers assigning two different Awaiting Assignment reports to one free team returned two fulfilled results, both reports Team Assigned, while team.currentReportId tracked only the second. Existing concurrency test covers two assignments of the SAME report and misses this case.
Fix: one Firestore transaction reads report and team, validates workflow and team availability, writes both consistently. Closing must similarly free only the team still attached to that incident, atomically. Add different-report/same-team concurrency and failure-injection tests.

### BE-03 Medium / P2: A failed update write irreversibly loses resolution details

Evidence: `api/src/services/assignmentService.js:71-76,84-90`; `api/src/adapters/firestoreRepo.js:68-80`.
Status transition commits before the note/rescued count update document. Injecting an addUpdate failure on Rescue in Progress -> Resolved left status Resolved with no updates, returned failure, and retry then failed409 `Report is already Resolved`. Closing likewise changes report status before freeing the team, so a failed team write can leave a closed incident occupying the team and retry cannot repair it.
Fix: atomic status/update/team transitions where invariants span documents, stable operation IDs and idempotent retry. Test failures between each previous write boundary; exactly one note/count and a recoverable client response.

### BE-04 Medium / P2: Public map drops genuine created reports

Evidence: `api/src/services/publicIncidentService.js:18-22`; `api/src/services/reportService.js:21-30`; `api/test/routes/public.test.js:9-28`.
Create stores nested `location.lat/lng` and coarseLocation; public service requires top-level `r.lat/r.lng`. Real-shaped eligible reports returned `[]` in isolated reproduction. Existing public tests seed the wrong top-level shape, so pass while production-shaped reports disappear.
Fix: project the canonical nested location or validated coarseLocation, keeping the public DTO free of IDs/contacts/photos/addresses. Add create->verify->public endpoint integration test, malformed coordinates, private statuses and coarse geometry assertions.

### BE-05 Medium / P2: Privileged account changes leave no audit trail

Evidence: `api/src/routes/users.js:18-29`; `api/src/services/userService.js:18-45,48-84`; `api/src/services/auditService.js:1-3`.
Staff/admin creation, role grants and deactivation make Auth/Firestore changes but never call record/addAudit, unlike report changes and settings updates. The audit UI cannot establish who granted access or disabled an account.
Fix: durable audit event with actor/target, action, timestamp and safe before/after role/active/team values; never passwords/tokens. Pass actor UID into createStaff. Test allowed and refused changes, failure/outbox recovery, and audit read authorization.

### BE-06 Medium / P2: Unbounded reads and buffered exports undermine bounded release behavior

Evidence: `api/src/adapters/firestoreRepo.js:46-60,82-83`; `api/src/services/statsService.js:37-39`; `api/src/routes/export.js:13-26`; `api/src/services/exportService.js:27-30,33-38`; `api/src/services/publicIncidentService.js:16`; `api/src/app.js:34`.
Reports/public map/exports can load all historical reports; stats additionally Promise.all-fetches every report's updates. PDF is buffered in memory. Existing rate limits restrict frequency, not query size, total concurrency or cross-replica usage. Public endpoint scans all private report documents before projection on each request. No load test performed; actual failure threshold/cost unmeasured.
Fix: stable cursor pagination; bounded date ranges and export row limits; appropriate aggregate/public projection reads; bounded concurrency/deadlines; shared limiter/quota if replicas are used; define accepted workload and verify in isolation. Avoid replacing a live all-report table with client-only pagination that still downloads all rows.

## Release evidence gaps, not demonstrated exploits

- `docs/deploy.md` is stale PLAN ONLY at old revision despite `render.yaml` and `web/vercel.json` now existing. `docs/backup-and-recovery.md` marks all provider export/restore procedures NOT RUN. Need owner, target environment/revision, verified backups of Firestore/Auth/photos, isolated restore drill and measured recovery targets.
- Current production Auth policy, administrator MFA, session configuration, provider billing caps/alerts, secret rotation/history, effective deployed rules/indexes, runtime service-account privileges, monitoring/alert delivery and final proxy/origin configuration were not accessed or certified. No sensitive environment values printed. Only safe example env files are git tracked.
- `render.yaml` uses free service plan and `/api/health` merely returns `{ok:true}`; verify cold-start/availability requirements and deeper dependency readiness separately before emergency-response use. No current provider SLA/pricing claim is made.
- `web/vercel.json` does not define security headers. API Helmet does not protect the separately served SPA. Parent web audit should evaluate actual deployed static-origin headers and compatible CSP.
- Report creation has no durable request idempotency key (`reportService.js:19,47` creates new reference/doc each call). Assess client timeout/retry UX; server permits similar reports deliberately, so do not ban legitimate duplicates. Implement per-operation retry identity if retry-safe submission is intended.
- Cloudinary authenticated URLs are signed delivery links retained on reports, not a fresh server authorization check per image fetch. No live URL accessed. Confirm retention/revocation requirements and URL lifetime; do not claim signed URL equals role-enforced access after sharing.

## Suggested fix sequence
1. Rules stale authorization and atomic report/team assignment.
2. Atomic terminal workflows, public projection contract, privilege audit events.
3. Bounded data access/idempotent recovery and actual release evidence.
4. Repeat existing tests plus regressions; do not equate green tests with production readiness.

## Additional confirmed account lifecycle findings

### BE-07 High operational / P1: Last-active-admin guard loses under concurrent changes

Evidence: `api/src/services/userService.js:66-81`.
The check lists other active admins, then separately updates Auth/claims/user state. With exactly two active admins A/B, concurrent A-deactivates-B and B-deactivates-A both pass the check; isolated createMemoryRepo/createFakeAuth reproduction returned two fulfilled promises and zero active admins. Self-edit protection does not prevent this cross-target race. A loss of the final administrator requires manual privileged recovery.
Fix: serialize this invariant with a Firestore transaction/coordination record (and a recoverable Auth reconciliation strategy); avoid a check followed by unrelated writes. Test cross-target simultaneous deactivation/demotion, mixed combinations, failure mid-reconciliation, and guaranteed recovery ownership. API identity must also remain valid through the coordinated mutation as designed.

### BE-08 High operational / P1: Staff creation reports success without a usable initial sign-in path

Evidence: `api/src/services/userService.js:29-39`; `web/src/features/users/UsersPage.tsx:63-72`; `web/src/auth/AuthProvider.tsx:73-74`; `mobile/lib/auth/auth_backend.dart:59-61`.
createStaff creates a new Firebase Auth user with email/displayName only, then sets roles and returns success. It never supplies a password or generates/sends an invitation/reset link. Both clients support email/password sign-in. Repository search found no sendPasswordResetEmail, generatePasswordResetLink, password reset/invitation implementation or documented supported staff password setup workflow. Seed/initial-admin scripts with explicit passwords do not cover accounts subsequently created through the product. New staff cannot sign in through the product after the success message; self-sign-up collides with the existing email.
Fix: define a secure invitation/first-password flow with verified authorized email delivery and useful pending/sent/error UI. Use provider-generated single-use setup/reset links with trusted continuation URLs; avoid exposing passwords to staff administrators or logging setup tokens. Document manual operational fallback if delivery requires configuration, and verify a newly created staff account can complete setup and sign in using a synthetic Auth emulator flow. Do not send live invitations during implementation tests.
