# Web resident view and full web redesign

Date: October 16, 2026. Status: DRAFT, awaiting Airen's approval. No code yet.
Owner: Airen. Size: big (new interface plus redesign of every web screen).

## 1. Intent and why

The project PDF says residents can report "via a mobile application or website," and that users can "monitor the status of their rescue requests." Our current spec limits residents to the Flutter app. This design adds a resident interface to the website, and redesigns the whole web app in one operations-console look so the resident and staff sides read as one system.

## 2. Goals

- A resident can sign up on the website, report an emergency (location, description, up to 5 photos, contact details), and track their reports.
- The resident dashboard shows their reports first, with each report's status, and the hotline and safety notice always visible.
- Residents see a public incident map with rounded areas only.
- Residents get notifications about status changes on their reports.
- Staff screens (dispatcher, DMO, responder) get the operations-console layout: dense, scannable, with a clear command area.
- Known gaps in the staff side are fixed (see section 7).

## 3. Non-goals

- No change to the Flutter apps in this design.
- No new report workflow statuses. The PDF's statuses stay as they are.
- No public access to report details. Residents see only their own reports in full.

## 4. Anti-goals (would be a failure even if it works)

- A resident seeing another person's report, contact details, or exact location.
- The public map showing an exact pin or address.
- A web report that is accepted without a clear success or failure message.
- Losing any current staff feature in the redesign.

## 5. Resident web experience

**Sign-up and sign-in.** Self sign-up on the web with email and password, the same account system as the mobile app. Sign-in lands the resident on their dashboard.

**Dashboard (first screen).** Top to bottom:
1. Safety notice and hotline (always visible). Text: a report does not guarantee immediate rescue.
2. "Report an emergency" button.
3. "My reports" list: each row shows type, status, last update, and opens the report detail.
4. Notifications panel: recent status changes on their reports.
5. Public incident map, rounded areas only.

**Report form (web).** Same fields as the mobile app: type, location (GPS or map pick), description, up to 5 photos (JPEG, PNG, WebP, 5 MB each), contact details. Success screen shows the reference ID and saved status. Failure shows what to do next, including the hotline.

**Report detail (resident).** Status history with timestamps, the report's own details, and a Cancel action only while the report is Submitted (matches the API rule).

**Public incident map.** Each incident is a circle of about 500 m, never the exact point or address. Shows type and status category only, no contact or photos.

## 6. Staff web experience

Roles and access stay as they are today:

- Dispatcher: queue, incident details, map, assignments, teams, users, audit log, analytics.
- DMO: monitor and analytics, read-only, no verify or assign.
- Responder: assignments and rescue updates.

**Layout direction (approved as option A, operations console).** Dark navy command bar or sidebar, neutral panels, dense tables, red only for critical priority. Command area at the top of each queue with counts and filters. Incident details in two columns with a sticky action rail. Responder assignments as cards.

**Audit log on phone.** Visible "Swipe sideways to see every column" cue under 720 px (already applied before this design; carries over).

**Incident photos.** Thumbnails open a viewer with Previous and Next (already applied; carries over).

## 7. Staff fixes (the "layout plus fixes" choice)

Listed in the handoff as known gaps. Each needs a decision before the plan:

1. **Admin screen (decided by Airen):** a new admin area in the web app with four parts:
   - Accounts and roles: create, deactivate, and change roles for staff and residents; reassign a responder's team.
   - Teams: create and edit rescue teams and their members.
   - System health and settings: API and Firestore status, the hotline number, and the notice text residents see.
   - Audit and exports: full audit log search, and CSV or PDF export of reports and statistics (the API already has `export.js`).
   Admin is a separate role from dispatcher in the web app. The spec's "admin and dispatcher are one role" line is superseded for the web by this decision. **Needs a short spec amendment** to X-SPEC.md before the plan.
2. **Team visibility (decided by Airen):** responders see only their own team, in both the Firestore rules and the API.
3. **Other staff fixes:** none named by Airen. The list stays at these two plus the admin screen.

## 8. Constraints

- Role checks stay on the API. The Firestore rules remain a second layer, and clients never write report data directly.
- Accounts are Firebase Auth. Passwords are never stored in the repo.
- Local emulator for all testing (Auth 9099, Firestore 8180, seeded API 3101). The live project is changed only after Airen approves a deploy.
- Palette and tokens stay in `web/src/theme/tokens.css` and `docs/design-tokens/tokens.json`.
- Phone width: no horizontal page scroll, 16 px side gutter, touch targets at least 44 px.
- Impeccable detector and the test suite run after each phase.

## 9. Open items (for the builder, with my default)

- Resident notifications: in-app panel only, no email or push in this design. (My call; push already exists for mobile.)
- Resident photo upload on the web: same Cloudinary path through the API. (My call.)
- Resident sign-up email verification: follow the current Firebase setting. (My call.)
- Dashboard map: uses the same public data as the resident map, not staff data. (My call.)

## 9a. Builder check (October 16, done inline against the code)

Facts found in the code, which the design now relies on:
- Firestore rules let a resident read only their own reports (`firebase/firestore.rules`, `canSeeReport`). The public map therefore cannot read `reports` directly. It needs an API endpoint.
- The API already rounds locations to about 500 m (`api/src/domain/privacy.js`, `STEP = 0.005`). The public endpoint reuses that rounding.
- The API already has an `admin` role on the audit and teams routes. Dispatchers cannot create or change admins (`api/src/services/userService.js`). So the first admin must be created some other way.
- Firestore `isStaff()` does not include `admin`. An admin screen that reads through Firestore listeners would be blocked. The admin screen should read through the API.
- The API has a self-registration route (`POST /api/users/self`), so resident sign-up on the web can reuse it.

**Asked of Airen (changes what gets built):**
- How the first admin account is created. **Answer:** a setup script, run once locally with the service account. You enter the admin email and password when you run it. Admins are created from the admin screen after that.

**My calls (marked, not asked):**
- Public map: a new read-only API endpoint returning type, status category, rounded location, and report count. No contact details, photos, or exact locations. (My call.)
- Resident sign-up: Firebase Auth client sign-up, then `POST /api/users/self`. (My call.)
- Admin in Firestore rules: admin reads go through the API; `isStaff()` stays as it is. (My call.)
- Admin screen data: API only. (My call.)

## 10. Phases (for the plan, not yet written)

1. Resident sign-up, sign-in, and role routing.
2. Resident dashboard, notifications, and hotline notice.
3. Resident report form on the web.
4. Resident report detail and cancel.
5. Public rounded-area map.
6. Staff layout in the operations-console direction, one screen group at a time.
7. Staff fixes from section 7.
8. Full test run, Impeccable detector, rendered check on the local emulator at 1440, 768, 390, and 320 px.

Each phase is committed on `build/disaster-rescue` after its checks pass. Nothing is pushed or deployed without approval.

## 11. Approval

Approve this design. The decisions in section 7 are recorded. I will write the plan (`writing-plans`) after your approval, and the builder check runs first. No code before the plan is approved.
