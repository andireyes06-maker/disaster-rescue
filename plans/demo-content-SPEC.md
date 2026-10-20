# Demo content: spec

Status: approved by Airen. Built; see plans/demo-content-PLAN.md for results.
Source brief: `design-plans/DEMO-CONTENT-AUDIT.md` (24 reports, 12 teams, 14-day analytics).
Checked against: `api/src/domain/workflow.js`, `validation.js`, `duplicates.js`, `api/src/services/*`, `api/src/adapters/firestoreRepo.js`, `firebase/seed.js`, `firebase/firestore.rules`, `mobile/lib/data/services.dart`.

## 1. Intent

Airen wants the product to look used when shown. A dispatcher, admin, DMO, responder, or resident should open the app and find a believable, lifecycle-complete set of fictional reports, teams, histories, notifications, photos, map points, and analytics. The data is clearly labeled as sample data everywhere it appears. It never reaches live records.

## 2. Goals

- One deterministic demo scenario, seeded into the local Firestore emulator through the same schemas the API writes.
- Every count, chart, map point, export, and summary is derived from those records. No hardcoded totals.
- Website and Flutter read the same records and the same demo indicator.
- Visible "Demo workspace · Sample data" label on web, mobile, and exports while the scenario is active.
- Loading, empty, error, offline, and retry states stay real and testable.

## 3. Non-goals

- No hosted demo environment in this task. That needs a separate Firebase project and a deploy, so it waits for approval.
- No production seeding, no production credentials, no commit, push, or deploy.
- No change to domain rules to make the fixture fit. If a fixture conflicts with a rule, the fixture changes.
- No real messages, no dialing, no hotline changes.

## 4. Anti-goals

- Fixtures that quietly paper over a broken request, so a failed read shows fictional success.
- A second, mobile-only data collection that disagrees with the web data.
- Demo labels that can be lost on a routed page or an export.
- Invented facts: no endorsements, testimonials, response-time promises, certifications, or privacy approvals.

## 5. Review findings against current code

These come from reading the code. They change the brief in the places listed.

1. **Active count has two definitions.** `statsService.js` treats Resolved as not open, so "open" = 17 (matches the brief). `workflow.js` `isOpen` treats Resolved as open, so the same set gives 19. The assignment and review guards use `isOpen`. **Decision needed (section 9, Q1).**
2. **Team busy state uses `busy` and `currentReportId`.** `firestoreRepo.js` claims and releases teams with those two fields. `firebase/seed.js` writes `status: 'available'`, which nothing reads. The demo seed uses `busy` and `currentReportId`. It does not change the existing team seed.
3. **Rescued counts are summed per update.** `buildStats` adds every update's `peopleRescued`. Demo updates must carry increments, never running totals. The sum of increments is the displayed number.
4. **Photos are Cloudinary signed URLs.** `cloudinaryUploader.js` stores photos as authenticated, signed URLs. A demo cannot use Cloudinary without credentials, and random remote images are banned by the brief. Demo evidence needs its own local path (section 7).
5. **`config/demo` does not exist yet.** Current rules allow reads only of `config/hotlines`. Adding a read rule for `config/demo` is a rules change. It lands in the emulator now and reaches production only with a later deploy approval.
6. **Hotline.** `seed.js` writes `911` as a non-editable national number and a placeholder LDRRMO number. The brief says existing verified facts stay. The demo seed does not touch `config/hotlines`. The placeholder stays non-dialable.
7. **Responder team claims.** `firestore.rules` returns a responder's team only when the user document and token claim agree. Demo responders need matching `team` values in both the user document and the custom claim.
8. **Duplicates.** `reviewService` requires `duplicateOf` to name an existing report other than itself. Report 23 can point to 15, and both are Riverbend, Flood, within the window.
9. **Verified flag.** Verified is set by the verify transition. Only Verified and later open statuses carry `verified: true`. That gives 15 verified and 9 unverified, as the brief says.
10. **Stored field names.** Report: `reference, type, description, status, verified, priority, location{lat,lng,source}, coarseLocation, reporterId, photos[], createdAt, updatedAt, addressText?, contact?, assignedTeamId?, assignedAt?, duplicateOf?`. Update: `kind ('acknowledge'|'status'), status, note, peopleRescued, byUid, at`. Notification: `recipientUid, title, body, reportId, read, createdAt`. Audit: `actorUid, action, reportId, before, after, at`.

## 6. Scenario

### 6.1 Clock and IDs

- Scenario clock `DEMO_NOW`, default `2026-10-17T08:00:00+08:00`. All timestamps are relative to it. Records span 14 days back.
- Stable document IDs: reports `demo-report-01`…`demo-report-24`; teams `demo-team-alpha`…`demo-team-lima`; updates `demo-update-<nn>-<k>`; notifications `demo-notif-<nn>-<k>`; audit `demo-audit-<nn>-<k>`; users `demo-<role-key>`.
- References: `DR-DEMO01` … `DR-DEMO24` (fits the `DR-` + six-character format).

### 6.2 Reports

All 24 rows from the brief stand, with these additions:

- Report 22 is Rejected from Submitted. Report 24 is Cancelled from Submitted by its resident.
- Report 23 is Duplicate with `duplicateOf: demo-report-15`, reached from Submitted or Under Verification.
- Verified and later statuses carry `verified: true`. Others carry `verified: false`.
- Priority: the brief's values, lowercased (`critical, high, medium, low`).

### 6.3 Ownership

- Resident A (`demo-resident-a`): 01, 05, 09, 12, 15, 18.
- Resident B: 02, 03, 04, 06, 07, 08.
- Resident C: 10, 11, 13, 14, 16, 17.
- Resident D: 19, 20, 21, 22, 23, 24.

Residents see only their own reports and notifications. Staff see all.

### 6.4 Teams and responders

- Twelve teams, Demo Alpha through Demo Lima, with IDs `demo-team-alpha`…`demo-team-lima`.
- Busy: Alpha–Hotel (report 12 through 19). `busy: true, currentReportId` set to that report.
- Available: India and Juliet (closed reports 20 and 21), Kilo and Lima. `busy: false, currentReportId: null`.
- Expected: 8 busy, 4 available.
- Four responder accounts, one per team, for Alpha, Bravo, Delta, and Foxtrot. Alpha is the default responder, `demo-responder-a`, with report 12 active.

### 6.5 Accounts

| Key | Role | Team | Email |
|---|---|---|---|
| demo-admin | admin | | demo-admin@demo.test |
| demo-dispatcher-a | dispatcher | | demo-dispatcher-a@demo.test |
| demo-dispatcher-b | dispatcher | | demo-dispatcher-b@demo.test |
| demo-dmo | dmo | | demo-dmo@demo.test |
| demo-resident-a…d | resident | | demo-resident-a@demo.test … |
| demo-responder-a | responder | demo-team-alpha | demo-responder-a@demo.test |
| demo-responder-b, -d, -f | responder | bravo, delta, foxtrot | …@demo.test |

- Names: "Demo Resident A", "Demo Dispatcher A", and so on.
- Demo accounts never reuse the live test accounts (`resident@test.dev` and the rest). The emulator seed's accounts stay as they are.
- Demo passwords come from a file used only by the emulator demo seed. They are never printed in the normal UI and never used against a real project.
- Phone numbers: `+1 (555) 010-01NN` (the reserved 555-01XX fictional range). They fit the schema regex. Outgoing calls and SMS are disabled for these numbers in the demo.

### 6.6 Histories, notifications, audit

- Creation spread across the 14 days. Verification, assignment, and updates follow in time order. `assignedAt` follows `createdAt`. No timestamp is in the future relative to `DEMO_NOW`.
- Updates use the real `kind` values. Progress notes use the brief's sample wording, marked as sample.
- Rescue counts: increments only, totaling 18 across the scenario (the number the tests assert).
- Notifications: report received (every report, to its resident); verified (verified reports); team assigned (to the resident and to the team's responder); response update; resolved. Read and unread mixed, with recent items unread. External delivery is off.
- Audit entries use demo actor UIDs with before/after values matching the lifecycle. Demo seeding writes no account-security events.

### 6.7 Photos

- Zero photos: 04, 08, 09, 11, 17, 22, 24.
- Three photos: 01, 15.
- Two photos: 07, 12, 13, 14.
- One photo: the rest.
- Photo record shape stays `{url, sizeBytes, mimeType}`. For demo records, `url` is a stable local key, `demo-evidence/<file>`. Both clients resolve that key to a bundled file. Neither client requests Cloudinary for a demo photo.
- Sample images are generated from one source folder `demo-data/evidence/`. Each image is labeled "Sample evidence" in its own pixels. A sync step copies them to `web/public/demo-evidence/` and `mobile/assets/demo-evidence/`.

### 6.8 Map

- Synthetic coordinates around the existing test-map region, one stable offset per demo zone. Canonical nested `location`. Coarse coordinates from `coarsen()`.
- Public views keep their privacy rules: coarse location, no contacts, no photos, no exact coordinates.

### 6.9 Analytics

- Derived by `buildStats` and the existing export services. Expected defaults from the brief: 24 total, 17 active (see Q1), 6 active critical, 15 verified, 6 needs-verification, Flood 9, Fire 4, Earthquake 3, Landslide 3, Other 5.
- Daily counts spread across the 14 days. Average response time derived from `assignedAt - createdAt`.

### 6.10 Demo indicator and exports

- Demo state lives in `config/demo`: `{ active: true, scenario: 'default', label: 'Demo workspace · Sample data', scenarioNow }`.
- Web and Flutter both show the label when `active` is true. The label is shown on routed pages, on the dashboard header, and on mobile.
- Exports: CSV and PDF filenames get the prefix `demo-sample-`. The PDF header carries the label.

## 7. Demo infrastructure

- Command: `npm run seed:demo` in `api/`, run through `firebase emulators:exec`. Idempotent: stable IDs with full-document writes. Reruns create no duplicates.
- `--reset` deletes only documents whose IDs start with `demo-` in the demo project. It never touches any other document.
- Refuses to run unless both emulator hosts are set. Refuses any project ID not in the emulator or demo allowlist. Refuses to run from the normal startup path.
- `--scenario qa` is the opt-in QA set: long text, missing photos, empty filters. It is separate from the default and not shown in the normal product.
- Shared contract: one manifest, `demo-data/default.json`, read by the seed script. Flutter and web read the same Firestore records, the `config/demo` document, and the same photo keys listed in the manifest.

## 8. Testing

- Seed twice, compare counts and IDs: no duplicates.
- Derived-count assertions against `buildStats`.
- Permission checks for each role: resident sees only own, responder sees only team, dispatcher and DMO see all, admin sees all.
- Assignment invariant: one active report per team; close frees the team.
- Histories and notifications link to real report IDs.
- Photo keys resolve in both clients.
- Analytics filters return coherent distributions for the 14-day window.
- Empty, error, offline, and retry states still show when a read fails or returns nothing.
- Screenshots of populated dispatcher, admin, DMO, responder, and resident views with the label visible.

## 9. Decisions

### Need Airen's answer

- **Q1. Which "active" count does the demo show?** Option A (recommended): 17, the count the brief and `statsService` use. Option B: 19, the count `isOpen` implies. I recommend A for the demo and logging the mismatch as a finding for the audit. Changing the domain rule is out of scope for this task.
- **Q2. Which environment?** Option A (recommended): local emulators only. Option B: a hosted demo project. B needs a separate Firebase project and a deploy, which I will not do without a yes.
- **Q3. Rules change for `config/demo`.** It only reaches production with a deploy. Approve the rule change now and keep the deploy separate, or hold it until the deploy is approved?

### My calls (approve or redirect)

- Four responder accounts (Alpha, Bravo, Delta, Foxtrot), not twelve.
- Resident split 6/6/6/6 as in section 6.3.
- Phone numbers in the 555-01XX range, outgoing contact disabled.
- Demo evidence through bundled local files, not Cloudinary.
- CSV and PDF filename prefix `demo-sample-`.
- `config/hotlines` is not touched by the demo seed.
- Scenario clock default `2026-10-17T08:00:00+08:00`.

## 10. Risks

- The rules change touches security. It needs the rules test suite to stay green.
- Flutter emulator wiring is not checked yet. The plan has a step to confirm it.
- Generated sample images must read as clearly fictional. I will check them by eye.
- Browser and device checks cannot run from here without the browser tools. The plan marks each one.
