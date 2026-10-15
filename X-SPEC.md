# X-SPEC: Web and Mobile-Based Disaster Rescue Reporting and Monitoring System

Course: IT 305 Advance Web Development, BSIT 3J, Bulacan State University
Build window: Oct 12 to 30, 2026. Submission: Nov 2, 2026.
Status: APPROVED by Airen on 2026-10-15.

## 1. Goal and success criteria

Build one system, with a web app and a Flutter mobile app on a shared backend, that lets residents report disasters, lets dispatchers verify, prioritize, and assign reports, lets rescue teams respond and record outcomes, and lets Disaster Management Officers (DMO) monitor trends and generate reports.

Scope decision from the group: attempt full scope (all 15 functional requirements, all 4 roles, all 3 interfaces), built in vertical slices so a demoable flow exists early.

Success means:
- A report can travel the full path: Submitted to Closed, using all four roles, on web and mobile.
- Every FR-01 to FR-15 in the brief is implemented or explicitly listed as partial.
- Deliverables exist: working system, source code, database schema doc, user guide (PowerPoint), video presentation, individual contribution report.
- Grading weights drive effort: Functionality 30, Advanced Web Dev concepts 20, UI/UX 15, Database 10, Documentation 10, Presentation 10, Individual contribution 5.

## 2. Decisions already made

| Topic | Decision |
|---|---|
| Backend | Express API in front of Firebase (approach A) |
| Data and auth | Firebase Auth, Firestore, FCM via Firebase Admin SDK |
| Web frontend | React + Vite |
| Mobile | Flutter (Flutter style handoff file does NOT apply to this project) |
| Maps | Leaflet with OpenStreetMap on web, `flutter_map` with OpenStreetMap on mobile |
| Responder interface | Both web and Flutter |
| UI direction | "Calm Clarity" (section 8). Replaces the brief's sample navy and red look. |
| Photo storage | Cloudinary via the API |
| Deviation from brief | Brief suggests PostgreSQL/PostGIS or MySQL. We use Firestore. The brief allows stack choice based on team skills. Documented in the schema doc. |

## 3. Architecture

```
Flutter app (residents + responders)  --+
React web (admin, DMO, responders)    --+--> Express API --> Firebase Admin SDK
                                        |        |             +- Auth (users, custom role claims)
                                        |        |             +- Firestore (data)
                                        |        |             +- FCM (push)
                                        |        |             +- Storage or Cloudinary (photos)
                                        +--> Firestore (live reads only, via security rules)
```

- The Express API is the only place that writes important data. It verifies the Firebase ID token on every call, reads the role from a custom claim, enforces role middleware, runs the status workflow, writes audit entries, flags duplicates, sends notifications, validates files, and produces exports.
- Firestore security rules are a second layer. Clients get read-only live listeners scoped by role. Clients cannot write report data directly. `auditLogs` is append-only from the API.
- Repo layout: `api/`, `web/`, `mobile/`, `docs/`.
- Roles: `resident`, `dispatcher` (admin and dispatcher are one role), `responder`, `dmo`.
- Photo storage: Cloudinary, uploaded through the API (decided, avoids needing the Firebase Blaze plan). Only the image URL is stored in `photos[].url`.

## 4. Data model (Firestore)

- `users/{uid}`: name, role, phone, team (responders), active, createdAt. Role is also a custom claim.
- `reports/{reportId}`:
  - type (flood, fire, earthquake, landslide, other), description
  - status (see section 6), verified (bool), priority (low, medium, high, critical), classification
  - location `{lat, lng, source: gps|manual}`, coarseLocation (rounded to about 500 m), addressText
  - reporterId, contact `{name, phone}`
  - photos[] `{url, sizeBytes, mimeType}`
  - assignedTeamId, duplicateOf, possibleDuplicates[]
  - createdAt, updatedAt
- `reports/{reportId}/updates/{updateId}`: status, note, peopleRescued, byUid, at.
- `teams/{teamId}`: name, members[], status (available, busy, offline).
- `notifications/{notifId}`: recipientUid, title, body, reportId, read, createdAt.
- `auditLogs/{logId}`: actorUid, action, reportId, before, after, at. Append-only.
- `config/hotlines`: emergency numbers shown in the apps, editable by dispatcher.

Privacy: exact location is readable only by dispatcher, DMO, the assigned responder, and the reporter. Public map views use `coarseLocation`.

Composite indexes (final list written in the plan): reports by status plus createdAt, by reporterId plus createdAt, by assignedTeamId plus status, and by type plus createdAt for statistics. Map queries use a bounding box on lat and lng.

## 5. API

All endpoints are JSON under `/api`. Auth is `Authorization: Bearer <Firebase ID token>`. Residents self-register. Staff accounts are created by a dispatcher through `POST /users`.

| Area | Endpoint | Who |
|---|---|---|
| Users | `POST /users`, `GET /users`, `PATCH /users/:id` | dispatcher |
| Reports | `POST /reports` (multipart: fields + photos) | resident |
| | `GET /reports`, `GET /reports/:id` (scoped by role) | all |
| | `PATCH /reports/:id/verify`, `/priority`, `/classify`, `/reject`, `/duplicate` | dispatcher |
| | `PATCH /reports/:id/cancel` (only while Submitted) | resident |
| Assignment | `POST /reports/:id/assign` | dispatcher |
| | `POST /reports/:id/acknowledge` | responder |
| Rescue | `POST /reports/:id/updates` | responder |
| | `PATCH /reports/:id/close` | dispatcher |
| Teams | `GET/POST/PATCH /teams` | dispatcher (read: responder) |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read`, `POST /devices` | all |
| Stats and export | `GET /stats`, `GET /export/incidents.csv`, `GET /export/summary.pdf` | dispatcher, dmo |
| Audit | `GET /audit` | dispatcher, dmo |

Validation: max 5 photos, 5 MB each, JPEG/PNG/WebP checked by file signature. Description length-limited and sanitized. Rate limit on `POST /reports`. Create returns a reference ID and saved status so clients can show a clear success or failure screen.

## 6. Status workflow

```
Submitted -> Under Verification -> Verified -> Awaiting Assignment
  -> Team Assigned -> Rescue in Progress -> Resolved -> Closed
Side exits: Rejected (from Submitted or Under Verification, reason required),
            Duplicate (sets duplicateOf), Cancelled (reporter, Submitted only)
```

- The server rejects any transition not in this graph with HTTP 409.
- Dispatcher handles verification, assignment, and closing. Responder moves Team Assigned to Rescue in Progress to Resolved.
- Every transition writes an `updates` entry and an `auditLogs` entry, and notifies the relevant users (reporter, dispatcher, team).
- Duplicate detection (FR-14): on create, find open reports of the same type within about 200 m in the last few hours. Save the new report normally and attach `possibleDuplicates[]` for dispatcher review. Never block the resident.

## 7. Interfaces

**Flutter, resident mode:** splash and login/register (hotline button, "no guarantee of immediate rescue" warning), step-by-step report flow (type, location by GPS or map pick, details and up to 5 photos, confirm), incident map and list (coarse locations), My Reports (Active and History, status timeline, cancel while Submitted), notifications, profile. Offline: show hotlines and alternative reporting instructions, keep drafts locally.

**Flutter, responder mode (shown by role):** assigned incidents, incident detail with exact location and open-in-maps, acknowledge, update status, record operation (people rescued, notes, photos), completion report.

**React web:**
- Dispatcher: dashboard (summary cards, incidents by type, recent reports, live map), report queue and incident details (verify, reject with reason, priority, classify, mark duplicate with flagged duplicates side by side, assign team, history), teams and users management, reports and analytics (filters, charts, CSV and PDF export), audit log viewer.
- DMO: read-only monitoring, trends, and report generation. No verify or assign rights.
- Responder view: same actions as the mobile responder mode, laid out for desktop.

Realtime: both clients use Firestore listeners for live updates. The API does all writing.

## 8. UI/UX direction: Calm Clarity

- Palette: background `#F6F1EA`, white cards, primary deep teal `#0F6B66`, coral `#C83919` only for critical priority and the main emergency action. Priority colors: critical coral, high amber, medium teal, low gray. Status is never shown by color alone (label and icon too).
- Type and shape: friendly sans-serif, large headings, 12 to 20 px rounded corners, soft shadows.
- Resident flow: one question per step, large tap targets, hotline always visible, warning shown plainly on the confirm step.
- Web admin and responder: same palette, denser layout, map and queue as focus.
- Accessibility: WCAG AA contrast, 44 px minimum touch targets, reduced-motion setting.
- Shared design tokens in `docs/design-tokens` feed web CSS variables and Flutter `ThemeData`.

## 9. Security and safety requirements (from the brief, section 7)

| Requirement | How it is met |
|---|---|
| Authentication for admin and responder functions | Firebase Auth, API token check, staff accounts created only by dispatcher |
| Role-based access, HTTPS | API role middleware and Firestore rules. HTTPS from the hosting platform |
| Protect victim information, restrict precise locations | Coarse location in public views, exact location by role only |
| Validate uploaded files | Size, type, and signature checks in the API |
| Backups and disaster recovery | Scheduled Firestore export and a written recovery note. No real recovery drill |
| Log priority, assignment, status changes | `auditLogs` written by the API |
| Clear submission feedback | Success screen with reference ID, clear failure message |
| Alternative reporting when offline | Offline screen with hotlines and instructions |
| "No guarantee of rescue" warning | Shown on welcome and confirm steps |
| Coordinate with official hotlines and LDRRMO | Editable hotline config, documentation section |
| Data Privacy Act of 2012 | Consent notice at registration and a privacy section in the docs. Prototype only, no formal legal review |

## 10. Functional requirement coverage

| FR | Requirement | Where it lives |
|---|---|---|
| 01 | Authentication | Firebase Auth, role claims, `POST /users` |
| 02 | Disaster reporting | `POST /reports`, resident report flow |
| 03 | Location tracking | GPS capture plus map pick, stored in `location` |
| 04 | Image upload | Multipart upload, validation, `photos[]` |
| 05 | Report management | verify, reject, classify, update endpoints, queue UI |
| 06 | Prioritization | `priority` field and endpoint |
| 07 | Rescue assignment | `POST /reports/:id/assign`, teams |
| 08 | Status monitoring | My Reports, queue, timeline |
| 09 | Notifications | FCM plus `notifications` collection |
| 10 | Incident mapping | Leaflet and `flutter_map` |
| 11 | Rescue records | `updates` subcollection, operation form |
| 12 | Report generation | `/stats`, CSV, PDF |
| 13 | Audit trail | `auditLogs` and viewer |
| 14 | Duplicate detection | `possibleDuplicates[]` flag and review UI |
| 15 | Report verification | `verified` field, Verified filter and badge |

## 11. Build order and deadline plan

1. Foundation: repo layout, Firebase project, Express skeleton, auth with role claims, design tokens, security rules, seed data and test accounts.
2. Core report flow: `POST /reports` with GPS and photos, resident create and track, dispatcher queue, verify, priority, status workflow, audit logging.
3. Dispatch and field: teams, assignment, responder mode on Flutter and web, rescue records, notifications.
4. Map and monitoring: live incident map on web and Flutter, DMO view.
5. Analytics and extras: stats, charts, CSV and PDF export, duplicate detection, audit viewer.
6. Hardening and polish: validation, rate limits, offline hotline screen, privacy notice, `/design-review` and `/qa` passes, backup note.
7. Deliverables: user guide slides, video script and recording, contribution report, real-device test, buffer.

Each phase ends with a commit and a HANDOFF.md update. Cut order if time runs short: PDF export, then duplicate detection, then DMO charts.

## 12. Testing and verification

- API: automated tests for status transitions, role permissions, and file validation.
- Firestore rules: tests on the Firebase emulator.
- Mobile: `flutter analyze` and `flutter test`. Web: lint and build. Manual walkthrough of the full report-to-closed flow with all four roles.
- Not verifiable in this environment, reported plainly each time: Flutter on a physical phone, push notifications on a real device, GPS accuracy.

## 13. Out of scope

Anything not in the brief, SMS gateway integration, real LDRRMO integration, formal legal review of data protection, load testing at production scale.

## 14. Open items

- Firebase Storage: per Firebase's Sept 2024 FAQ, Cloud Storage for Firebase needs the Blaze (billing-enabled) plan even for default buckets, with free-tier usage still at no cost. Decided: photos go through the API to Cloudinary, so Blaze is not needed. FCM itself is free and the Admin SDK can send from our Express server, so Cloud Functions are not needed.
- Hosting targets for the API and web app (to decide in the plan).
- Whether Firebase Cloud Messaging setup works smoothly with the chosen Flutter version (check early in phase 3).
- Project leader and member roles for the contribution report (needed later, not for the build).

---

## Amendment (Oct 15, 2026): web stack, option B

Airen chose option B from the Software Build Guidelines review. Web keeps React + Vite and moves to:
- **TypeScript**, incremental: `allowJs` during migration, `strict` on for converted files, `tsc --noEmit` in the test script. The API stays JavaScript for now (recorded as a deliberate deviation; the guideline allows a documented reason).
- **Tailwind CSS** (v4, `@tailwindcss/vite`). Calm Clarity tokens from `web/src/theme/tokens.css` map to Tailwind theme variables. No raw hex in components.
- **shadcn/ui** for primitives (button, dialog, input, label, select, table). Components are pulled from the official registry or CLI, not hand-written copies.
- **React Hook Form + Zod** for forms (team, user, assignment, operation forms). The API still validates independently.
- **Playwright** for end-to-end flows (after the migration).

Unchanged: Express API (JavaScript), Firebase, Flutter, Calm Clarity colors and the coral-for-critical rule. Migration is tested at each phase; no behavior changes are intended.
