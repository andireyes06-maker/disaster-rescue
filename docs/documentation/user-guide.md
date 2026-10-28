# User guide

Instructions for each role. Each part says where the person does the task (mobile app or website). For what each role is allowed to do, see [how-it-works.md](how-it-works.md) and `docs/role-matrix.md`.

A report does not guarantee immediate rescue. If someone is in danger, they must call their local emergency number. The app shows this message, and the hotline text is a placeholder until the local number is set (see the audit).

## Residents (mobile app only)

1. **Create an account or sign in.** On the welcome screen, choose "Create a resident account" or "Sign in". Required fields have an asterisk. Errors show an icon and text.
2. **Forgot password.** Enter your email on the sign-in screen and choose "Forgot password". The message does not reveal whether the account exists. Delivery depends on the email provider.
3. **Send a report.** Choose the type, use GPS or pick a place on the map, enter a description and contact details, optionally add photos, then review and submit.
4. **Keep the reference.** After submitting, keep the report reference. If you lose the connection, a timeout does not prove nothing was saved. Use the retry or check action shown. Storage failures show a notice.
5. **Follow your reports.** "My reports" lists active and past reports. Open one to see its status and history. You can cancel only while the report is still Submitted (before a staff member verifies it).
6. **Notifications.** The bell opens notifications. They still appear in the app if push registration fails.
7. **Profile.** The profile shows your contact details and a log out button. If it fails to load, use the retry button.

Old website resident pages (`/register`, `/my`) show a notice to use the mobile app.

## Rescuers (mobile app and website)

### On the phone

1. Sign in with the account an administrator created for you. Your assignments belong to your team.
2. Open an assignment, check the location, and acknowledge it. "Open in maps" uses the phone's map app.
3. Add an operation update: choose an allowed status, enter the number of people rescued, add a note if needed, then save.
4. A confirmed update appears in the progress history. Use "Show more" and "Load older" to see earlier entries.
5. If an update is not confirmed (for example, no signal), the app keeps it and retries with the same key. A sixth distinct unresolved update is blocked until you check the history. Discarding an unconfirmed attempt removes that protection, so only do it after checking.
6. Recently closed reports are read-only.

### On the website

1. Sign in at the website with the same account. You land on the Assignments page.
2. The page lists your team's incidents, oldest first. For each one you can see the address, the location with an "Open in maps" link, the report time, and when it was acknowledged.
3. Use "Post an update" to add a field update, the same as on the phone.
4. Use "View ... report" on a closed report of your team to read it (read-only).
5. The website only shows your team's work. Notifications link to the assignment page.

Your access is checked again whenever your team or role changes. If the page says "Access not confirmed yet", wait, or use "Retry access check". Deactivated accounts are signed out. Offline devices cannot see a revocation right away.

## Administrators (website only)

Sign in at the website. You land on the Admin page. The menu has Dashboard, Map, Monitor, Analytics, Audit, Teams, Users and Admin.

### Review and act on a report

1. **Dashboard.** The incident inbox lists reports awaiting action, Critical first, then High, Medium and Low; inside each priority level the oldest report comes first (first come, first served). Quick views show All reports, Needs verification and Active, with a count for each. Search by type, place, description or reference.
2. **Open a report** (`/incidents/:id`). Check the description and photos.
3. **Validate report.** This is a human check. The report then shows "Validated by [name] at [time]". Validating a report twice is refused.
4. **Reject or mark duplicate** with a reason, if the report is not valid or already reported.
5. **Set priority and classification.** Priority sets where the report sits in the queue: higher priority levels are listed first.
6. **Assign a team.** Choose a rescue team that is available. The team is busy from assignment until the report is closed.
7. **Close** the report after the rescuer has resolved it. Closing releases the team and writes an audit entry.

### Manage the people

- **Teams.** Create and edit rescue teams and see their availability.
- **Users.** Create staff accounts, set roles and team membership. A new staff account is created without a password. The person sets one through "Forgot password" on the sign-in page.
- **Admin.** Accounts, roles, teams, system settings and the audit log.

### Monitor and report

- **Map.** Incidents on a map. Open a report for details.
- **Monitor.** A read-only view of reported incidents.
- **Analytics.** Patterns for a chosen period, with CSV and PDF downloads. Exports include exact locations, so share them only with staff who need them.
- **Audit.** Who changed a report, what changed and when.

### Dispatchers and DMO accounts

Dispatcher and DMO accounts cannot use the website. Signing in with one signs it out and shows "This account has no website access. Ask your administrator." Their records and history are kept. Their work is done by the administrator.

## Troubleshooting

| What you see | What to do |
|---|---|
| "This account has no website access. Ask your administrator." | Expected for dispatcher and DMO accounts. Ask an administrator. |
| "Residents use the Rescue Reports mobile app" | Expected for resident accounts on the website. Use the phone app. |
| "Use the Rescue Reports mobile app" | Expected for residents on the website. Use the phone app. |
| "Access not confirmed yet" | Wait a moment, then choose "Retry access check". Your role or team may be changing. |
| Admin dashboard says "Loading incident inbox" for a long time | A database index may still be building after a deploy. Wait a few minutes, then reload. |
| A newer report is not in the phone list | Use "Load older". The phone list shows the oldest 50 assignments first, and priority does not change that window, because the responder list is strictly oldest first (see the audit). |
