# User guide outline

Purpose: the outline for the user guide slides (deliverable 2 in the spec). Each section lists the screens as the code names them, what the user can do, and a screenshot placeholder for the presentation. Screen names come from `mobile/lib/features/` and `web/src/features/` at commit f7c5b96. Items marked UNVERIFIED were not run on a device or in a browser.

**Updated 2026-10-23 (professor clarification): read `docs/role-matrix.md` first.** The website is for the administrator only. Residents and responders use the Flutter app only. Dispatcher and DMO functions move to the administrator. Sections 2 to 6 were rewritten for this allocation. The queue is oldest first and validation is a manual admin action.

Roles: resident, responder (Flutter), administrator (website). Dispatcher and DMO are pending a decision (see `docs/role-matrix.md`).

Platforms: Flutter app (Android and iOS, resident and responder). React web app (administrator only).

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

## 2. Responder (Flutter app only)

Rescue teams use the Flutter app. The web `/assignments` page was removed on 2026-10-23 (professor clarification). Screens to show: `AssignedListPage` (assigned reports, oldest first), `IncidentDetailPage` (details and map), `OperationFormPage` (status, people rescued, note). The team's updates are visible to the administrator on the website.

**What the responder can do**
- See reports assigned to their team, oldest first.
- Acknowledge an assignment and record progress (Rescue in Progress, Resolved).
- Open the location in maps.

**Limits to say on the slides:** responders cannot see other teams' reports. Push delivery and GPS accuracy are UNVERIFIED on a physical phone.

- [screenshot: assigned list and incident detail in the Flutter app]
- [screenshot: operation form with status and note]

---

## 3. Administrator (web app, the only website role)

The website is for the administrator. Dispatcher and DMO functions are now the administrator's (professor clarification, 2026-10-23; decision B: their website sign-in is refused and staff reads are admin-only in the rules).

Screens (as the code names them):
- Dashboard (`/dashboard`, `ReportQueue`): the report queue. The line under the title reads "Oldest first. Priority does not change the order." Queue order is oldest submission first, ties broken by report id.
- Incident details (`/incidents/:id`, `IncidentDetails`): photos, location, and history. The administrator presses **Validate report** to validate the report by hand. Below it: "Validation is a manual review. The system does not check whether a photo is authentic." After validation: "Validated by [name] on [time]". Also reject with a reason, mark duplicate, set priority, classify, assign team (`AssignTeamDialog`), close.
- Map (`/map`, `IncidentMap`) and monitor (`/monitor`, `MonitorPage`).
- Analytics (`/analytics`, `AnalyticsPage`): charts with text tables, and CSV or PDF export (`ExportButtons`).
- Audit log (`/audit`, `AuditPage`), teams (`/teams`, `TeamsPage`), users (`/users`, `UsersPage`).
- Admin (`/admin`, `AdminPage`): accounts, teams, settings, health.

**What the administrator can do**
- Validate a report by hand, once. A second validation is refused.
- Keep the queue oldest first, while priority and classification stay visible.
- Assign and close teams, manage accounts and teams, export summaries.

**Limits:** the API still accepts dispatcher and DMO tokens on its other routes (decision B; see `docs/role-matrix.md`). Say so if asked.

- [screenshot: dashboard queue with the order line]
- [screenshot: incident details with Validate report and the validated-by line]
- [screenshot: analytics with export]

---

## 4. DMO and dispatcher (no website access)

Dispatcher and DMO accounts keep their records and history. Their website sign-in shows "Website access is for administrators only. Ask your administrator about your access." Their functions are the administrator's. Do not show a DMO or dispatcher screen on the slides; show the message if asked.

---

## 5. Login and common screens (web app)

- Login (`/login`, `LoginPage`): administrators sign in here. The page says residents use the Rescue Reports mobile app.
- Residents and rescue teams who open an old web path (`/register`, `/my`, `/my/report`, `/my/reports/:id`, `/assignments`) see the notice "Use the Rescue Reports mobile app" (`MobileAppNotice`). It has no report or dashboard links.
- Forbidden (`/forbidden`, `Forbidden`) explains the role and gives no page link for residents, responders, dispatchers, and DMO.
- Landing (`/`, `Landing`): explains the mobile app for residents and rescue teams, and the administrator sign-in.

- [screenshot: admin sign-in]
- [screenshot: mobile-app notice on an old web path]

---

## 6. Administrator account and offline help

The administrator's website is described in section 3. Accounts are created and changed on `/admin` and `/users`. Offline help and hotlines are in the Flutter app (`OfflineHelpPage`) and in section 7.

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
| Resident | Flutter login, report steps 1 to 4, success, My Reports, offline help |
| Responder | assigned list, incident detail, operation form (Flutter app only) |
| Administrator | dashboard with the order line, incident details with Validate report and the validated-by line, duplicate review, assign dialog, map, monitor, analytics with export, audit, teams, users |
| Dispatcher and DMO | none (website access is for administrators only); show the sign-in message if asked |
| All | web login, navigation |

Capture on a real phone and in the browser at 1280 px width. Mark each screenshot as taken or not taken in this file before the presentation.
