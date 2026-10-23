# Video script

Purpose: script for the video presentation (spec deliverable 4). It covers the four required items: technologies, major feature demo, database and architecture, and challenges and solutions. Timings are suggestions for a total of about 8 minutes. Adjust after a dry run.

Before recording: the demo needs a running API, the web app, and the Flutter app on a phone or emulator, all pointed at one Firebase project with the seed accounts. Real Firebase and Cloudinary are not used by this document. The steps below assume they are set up by the team. UNVERIFIED: none of the demo steps were run for this document.

Speakers: [fill in names and who speaks each part]. One narrator is acceptable. If any narration is synthetic, say so on the first slide and in the script (professor clarification, 2026-10-23).

UNRESOLVED: the professor did not confirm whether a separate live presentation is required. Ask before planning a live slot. This script is for the recorded video.

---

## Part 1. Technologies (about 1 minute)

Say: one system with a shared backend, two front ends.

| Layer | Technology | Where in the repo |
|---|---|---|
| Mobile app | Flutter, Provider, flutter_map with OpenStreetMap, geolocator, image_picker, firebase_messaging | `mobile/` |
| Web app | React, Vite, TypeScript, Tailwind CSS v4, shadcn/ui, React Hook Form with Zod, Leaflet with OpenStreetMap, Recharts | `web/` |
| API | Node.js, Express, Zod validation, helmet, express-rate-limit, multer, pdfkit, Cloudinary SDK | `api/` |
| Data and auth | Firebase Auth (email and password, role custom claims), Cloud Firestore, Firebase Cloud Messaging through Firebase Admin SDK | `firebase/`, `api/` |
| Photos | Cloudinary, uploaded through the API | `api/src/adapters/cloudinaryUploader.js` |
| Tests | Vitest (API and web), Firebase emulator with rules tests, Playwright (web end-to-end), `flutter test` | `api/test`, `firebase/rules.test.js`, `web/e2e`, `mobile/test` |

Key point to say: the spec chose Firestore over the PostgreSQL suggestion in the brief. Say the reason exactly as the team agrees it (see `docs/schema.md` section 8, where the reason is still marked to confirm).

---

## Part 2. Major features demo (about 3 minutes)

Show the report-to-closed path with all four roles. Run the steps in this order. Each step names the screen to show.

1. **Resident signs in** (Flutter, `LoginPage`). Show the "no guarantee of immediate rescue" notice and the hotline button.
2. **Resident reports a flood** (Flutter, `ReportFlowPage`). Step 1 type, step 2 location with GPS or `MapPickerPage`, step 3 description and up to 5 photos (`PhotoPickerSection`), step 4 confirm with the warning. Submit.
3. **Success screen** (`SubmissionSuccessPage`). Read out the reference ID. Point out the status "Submitted".
4. **Resident sees the status** (`MyReportsPage`, `ReportDetailPage`, `StatusTimeline`). Show the timeline.
5. **Administrator validates the report** (web, `/dashboard`, `ReportQueue`, then `/incidents/:id`, `IncidentDetails`). Point out the queue line: "Oldest first. Priority does not change the order." Open the report, show the photos and the note that validation is a manual review, press **Validate report**, and show "Validated by [name] on [time]". Set priority to high and classify, and say the queue order does not change.
6. **Duplicate check** (web, `IncidentDetails`). If the demo data has a nearby report, show `possibleDuplicates` side by side. If not, say the feature is on and skip the step.
7. **Administrator assigns a team** (`AssignTeamDialog`). Show that the team is marked busy.
8. **Responder works the rescue** (Flutter only, `AssignedListPage`, `IncidentDetailPage`, `OperationFormPage`). Open in maps. Set status to Rescue in Progress, then Resolved, with people rescued and a note. Residents and responders do not use the website.
9. **Administrator closes** (web, `IncidentDetails`). Show the audit entry on `/audit` (`AuditPage`).
10. **Resident is notified** (Flutter, `NotificationsPage`). Show the in-app notification. Say push delivery is not verified on a real phone.
11. **Map and monitoring** (web, `/map` `IncidentMap`, then `/monitor` `MonitorPage`, both as administrator). The DMO role's website access is turned off; its monitoring is part of the administrator's page.
12. **Analytics and export** (web, `/analytics` `AnalyticsPage`, as administrator). Show a chart and its text table, then export a CSV.
13. **Offline help** (Flutter, `OfflineHelpPage`). Show the hotlines and the instructions.

If time runs short, cut in this order: step 6 (duplicate), step 12 (PDF export only, keep CSV), step 11 (monitor page). Cut order matches the spec.

---

## Part 3. Database and architecture (about 2 minutes)

Show the architecture diagram from `X-SPEC.md` section 3, then the ER diagram from `docs/schema.md` section 3.

Key points to say:
- The Express API is the only writer. It checks the Firebase ID token on every call and reads the role from a custom claim.
- Firestore security rules are the second layer. Clients have read-only listeners scoped by role, and clients cannot write report data.
- `auditLogs` is append-only from the API.
- Exact location is shared with the administrator, the reporter, and the assigned team. Public views use a coarse location, about 500 m. (The API still accepts dispatcher and DMO tokens; say so if asked. See `docs/role-matrix.md`.)
- The status workflow lives in one place in the API. Any transition not in the graph returns HTTP 409.
- Website scope: residents and rescue teams use the Flutter app only. The website is for administrators. Staff reads (reports, teams, users, audit log) are admin-only in the rules. Dispatcher and DMO website access is turned off; their accounts and history are kept.
- Queue order: awaiting-action reports are oldest first, by the server-recorded submission time, with the report id as the tie-breaker. Priority does not change the order.
- Validation: one admin action records who validated and when. It is a human review; the system does not check photos for authenticity.

Show one line of the rules file (`firebase/firestore.rules`) to show the role checks.

---

## Part 4. Challenges and solutions (about 2 minutes)

Pick three or four. Each has a problem, what the team did, and the result. Use only facts from the build notes.

| Challenge | What we did | Result |
|---|---|---|
| Firebase Storage needs the Blaze (paid) plan, even for the free tier | Photos go through the API to Cloudinary. The app does not need Storage or Cloud Functions | Free plan kept. Photos are validated by the API (size, type, file signature) |
| Brief suggested PostgreSQL or MySQL | Chose Firestore and documented the decision | `docs/schema.md` section 8 |
| Residents must not see exact locations of others | Coarse location for public views, exact location by role, enforced in both the API and the rules | Tests in the API suite and rules suite (not run for this document) |
| A shared phone could be bound to the wrong account after sign-out | Device tokens are owned by one account. A second account gets 409 `device_claimed`. The owner can delete the token | Known gap: sign-out call not yet wired in the apps. Say so if asked |
| Web stack migration to TypeScript and Tailwind mid-build | Done in phases (option B in the spec amendment) with tests kept passing | Typecheck and build passed, and 129 web tests passed, at the Task 19 run recorded in `HANDOFF.md` (re-run before recording) |
| Duplicate reports should never block a resident | Save the report, attach `possibleDuplicates` for the administrator | Resident is never blocked |
| A newest-first queue put the oldest reports at the bottom | Oldest-first order on the server and the web, with a tie-breaker and a stated rule for missing times | API and web tests (see `HANDOFF.md`) |
| Web app scope: residents and rescuers should not need a website | Mobile-app notice on the old web paths, admin-only web routes, and admin-only rules | Rules suite and web tests (see `HANDOFF.md`); not checked on a phone |
| Rate limits behind a proxy | `TRUST_PROXY` setting so the limit sees the real client IP | Needs the hosting proxy set (see `docs/deploy.md`) |

Say plainly what was not checked: Flutter on a physical phone, push notifications on a real device, GPS accuracy, and the real hosting setup.

---

## Closing (about 30 seconds)

Say what works end to end, what is partial (see the spec's partial items and `HANDOFF.md`), and what the team would do next: real device test, legal review of the privacy notice, and the hotline numbers from the local LDRRMO.

---

## Recording checklist

- [ ] Screen recordings done for steps 1 to 13
- [ ] Each step has the screen name on screen or in the caption
- [ ] No real personal data in any screen (use seed accounts)
- [ ] Hotline number shown is the real local number, not the placeholder, or the placeholder is called out
- [ ] Total time under the limit set by the course (UNVERIFIED: limit not in the spec)
