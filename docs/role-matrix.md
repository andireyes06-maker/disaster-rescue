# Role matrix (professor clarification, 2026-10-23)

Source of truth: `docs/superpowers/specs/2026-10-23-professor-clarification-design.md` (approved, option A).

| Role | Platform (target) | What they do | Status in code |
|---|---|---|---|
| Administrator | Website | Validate reports by hand, verify, reject, mark duplicate, classify, set priority, assign teams, close, manage users and teams, audit log, analytics, exports, monitor, map | Validate action and the oldest-first queue are done (API and web). Admin already held every staff permission. |
| Resident | Flutter app | Submit a report, add photos and location, cancel their own report, follow status and updates | Flutter flows unchanged. Old web paths (`/register`, `/my*`) show the mobile-app notice (`MobileAppNotice`). |
| Responder (rescuer) | Flutter app | See assigned reports for their team, acknowledge, add field updates | Flutter flows unchanged. Old web path `/assignments` shows the mobile-app notice. |
| Dispatcher | None (approved option A) | Functions move to the administrator. Account and history kept, nothing deleted. | Website sign-in is refused (signed out with `website_access_disabled`). Firestore rules deny staff reads. The API refuses dispatcher tokens; admin owns the operational workflows. |
| DMO | None (approved option A) | Monitoring, analytics and exports move to the administrator. Account and history kept. | Website sign-in is refused the same way. Firestore rules deny staff reads. The API refuses DMO tokens; admin owns monitoring and exports. |

## Rules that hold now

- Queue order: awaiting-action reports are oldest first, ties broken by report id. Priority does not change the order. Closed reports follow, newest first.
- Validation: one action, `PATCH /api/reports/:id/verify`, admin only. It records `verifiedBy` (uid and name) and `verifiedAt`. A second validation returns 409 and writes no second validation entry.
- Validation is a human review. The system does not check whether a photo is authentic. Upload checks (format and size) are separate.
- No account, report, history or priority field is deleted by this change.

## Retained compatibility

- Dispatcher and DMO accounts and historical records remain. They are not automatically promoted to administrator.
- Flutter tells administrators to use the website and tells retired roles their website access is unavailable.
- Unreachable resident/responder web components remain for their retry and idempotency tests; public paths show the mobile-app notice.
