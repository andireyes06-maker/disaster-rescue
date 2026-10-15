# User guide outline

Purpose: the outline for the user guide slides (deliverable 2 in the spec). Each section lists the screens as the code names them, what the user can do, and a screenshot placeholder for the presentation. Screen names come from `mobile/lib/features/` and `web/src/features/` at commit f7c5b96. Items marked UNVERIFIED were not run on a device or in a browser.

Roles: the spec defines four roles (resident, dispatcher, responder, dmo). The API also has an `admin` role. Admin has no screens in either app, so it is covered in section 6 as API-only.

Platforms: Flutter app (Android and iOS, resident and responder). React web app (dispatcher, DMO, responder).

Every screen that handles an emergency shows the notice "Submitting a report through this app does not automatically guarantee immediate rescue" and a hotline button.

---

## 1. Resident (Flutter app)

Signs in with email and password after self-registration. Reports emergencies and tracks them.

**Screens**
- Login and Register (`LoginPage`, `RegisterPage`). Register has a consent checkbox for the privacy notice.
- Report flow (`ReportFlowPage`), four steps: type (`_TypeTile`, five types: flood, fire, earthquake, landslide, other), location (`LocationStep`, GPS or `MapPickerPage`), details and up to 5 photos (`PhotoPickerSection`), confirm.
- Success and failure (`SubmissionSuccessPage`, `SubmissionFailurePage`). Success shows the reference ID.
- My Reports (`MyReportsPage`) with Active and History, and report detail (`ReportDetailPage`) with the status timeline (`StatusTimeline`). Cancel is offered only while the report is Submitted.
- Notifications (`NotificationsPage`).
- Profile (`ProfilePage`), with log out.
- Offline help (`OfflineHelpPage`): hotlines saved on the phone, and what to do when there is no connection. Drafts are kept on the phone (`report_draft_store`).
- Hotline button (`HotlineButton`), always visible on the report screens.

**What the resident can do**
- Report an emergency with GPS or a map pick, and attach up to 5 photos.
- See the reference ID and the status of each report.
- Cancel a report that has not been verified yet.
- Read notifications about their own reports.

**Screenshots for the presentation**
- [screenshot: resident login and register with the consent checkbox]
- [screenshot: report flow step 2, location by GPS or map pick]
- [screenshot: report confirm step with the "no guarantee of rescue" warning]
- [screenshot: success screen with reference ID]
- [screenshot: My Reports list and status timeline]
- [screenshot: offline help page with hotlines]

**Known gap**
- The incident map (`IncidentMapPage`) exists, but a resident cannot reach it from the three resident tabs. It is opened only from the responder list. UNVERIFIED on a device. Either add a link or remove this line from the guide.

---

## 2. Responder (Flutter app and web)

A rescue team member. Sees only reports assigned to their team.

**Flutter screens**
- Assigned list (`AssignedListPage`), with the incident map icon (`IncidentMapPage`).
- Incident detail (`IncidentDetailPage`): exact location, Open in maps (`url_launcher`), and the "Add operation update" action. UNVERIFIED that an acknowledge action is shown on the phone.
- Operation update (`OperationFormPage`): status (Rescue in Progress or Resolved), people rescued, note.
- Notifications (`NotificationsPage`).

**Web screen**
- Assignments (`AssignmentsPage`) with `OperationForm`, for desktop. The responder has no web map (per the build notes).

**What the responder can do**
- See assigned incidents and their exact location.
- Acknowledge an assignment (the API endpoint exists; where the button appears is UNVERIFIED).
- Move the report from Team Assigned to Rescue in Progress, then to Resolved.
- Record the number of people rescued and notes for each update.

**Screenshots for the presentation**
- [screenshot: responder assigned list on the phone]
- [screenshot: incident detail with Open in maps]
- [screenshot: operation update form]
- [screenshot: web assignments page with the operation form]

---

## 3. Dispatcher (web app)

Runs the queue. Verifies, prioritizes, classifies, assigns, and closes reports. Creates staff accounts.

**Screens** (routes in `web/src/App.tsx`)
- Dashboard (`/dashboard`): summary cards (`SummaryCards`) and the report queue (`ReportQueue`).
- Incident details (`/incidents/:id`, `IncidentDetails`): verify, reject with a reason, priority, classify, mark duplicate, assign team (`AssignTeamDialog`), history. Badges: `StatusBadge`, `PriorityBadge`, `VerifiedBadge`.
- Map (`/map`, `IncidentMap`): Leaflet with OpenStreetMap and filters.
- Analytics (`/analytics`, `AnalyticsPage`): charts (`ChartCard`), a text table for each chart, filters, CSV and PDF export (`ExportButtons`).
- Audit log (`/audit`, `AuditPage`): before and after values as plain text.
- Teams (`/teams`, `TeamsPage`).
- Users (`/users`, `UsersPage`): create staff accounts, change role and active state.

**What the dispatcher can do**
- Verify a report, reject it with a reason, mark it as a duplicate.
- Set priority (low, medium, high, critical) and classification.
- Assign a team to a report. A team already on a rescue cannot be assigned again.
- Close a resolved report.
- Export incidents and summaries. Exports contain no contact details.
- Read the audit log.

**Screenshots for the presentation**
- [screenshot: dispatcher dashboard with summary cards and report queue]
- [screenshot: incident details with the verify and priority controls]
- [screenshot: duplicate review with both reports side by side]
- [screenshot: assign team dialog]
- [screenshot: map with filters]
- [screenshot: analytics chart with its text table]
- [screenshot: audit log viewer]
- [screenshot: teams and users pages]

**Gap**
- The spec puts a live map on the dashboard. The dashboard shows cards and the queue, and the map is a separate page. Use the separate map in the guide, or note the difference.

---

## 4. DMO (Disaster Management Officer, web app)

Read-only monitoring, trends, and reports. No verify or assign rights.

**Screens**
- Monitor (`/monitor`, `MonitorPage`): read-only map (`IncidentMap`) with no action buttons.
- Analytics (`/analytics`, `AnalyticsPage`): same charts as the dispatcher. Exports (`ExportButtons`) are allowed for the DMO role by the API (`/api/export`). UNVERIFIED that the buttons appear for the DMO in the browser.
- Incident details (`/incidents/:id`): read-only view of a report.

**What the DMO can do**
- Watch incidents on the map.
- Read trends and counts by type and status.
- Export CSV and PDF summaries.

**Screenshots for the presentation**
- [screenshot: DMO monitor page, read-only map]
- [screenshot: DMO analytics with the export buttons]

---

## 5. Login and common screens (web app)

- Login (`LoginPage`). Shows the same "no guarantee of rescue" notice and the hotline line.
- Forbidden (`/forbidden`): shown when a signed-in account has no web role.
- Application shell (`AppShell`): navigation by role. Dispatcher sees Dashboard, Map, Analytics, Audit, Teams, Users. DMO sees Monitor and Analytics. Responder sees Assignments.

**Screenshots for the presentation**
- [screenshot: web login page]
- [screenshot: app shell navigation for the dispatcher]

---

## 6. Admin (API only)

The API has an `admin` role. It can read users (`GET /api/users`), teams (`GET /api/teams`), the audit log (`GET /api/audit`), and stats (`GET /api/stats`). There is no admin screen in either app, and Firestore rules do not grant admin any read access. The spec does not list admin as a role, so the guide should say: "Admin is API-only and is not part of the user guide screens." Decide with the team before the presentation (see `docs/schema.md` section 8).

---

## 7. Hotlines and privacy notice (all roles)

- Hotlines are read from `config/hotlines`. The seed data uses a placeholder number, which must be replaced with the local LDRRMO number before any demo. UNVERIFIED that the placeholder has been replaced.
- The privacy notice text is in `docs/privacy-and-coordination.md`. The project has had no legal review.

**Screenshots for the presentation**
- [screenshot: hotline list on the offline help page]

---

## Screenshot checklist (for the slides)

| Role | Screens to capture |
|---|---|
| Resident | login, report steps 1 to 4, success, My Reports, offline help |
| Responder | assigned list, incident detail, operation form, web assignments |
| Dispatcher | dashboard, incident details, duplicate review, assign dialog, map, analytics, audit, teams, users |
| DMO | monitor, analytics |
| All | web login, navigation |

Capture on a real phone and in the browser at 1280 px width. Mark each screenshot as taken or not taken in this file before the presentation.
