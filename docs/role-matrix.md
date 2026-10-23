# Role matrix (professor clarification, 2026-10-23)

Source of truth: `docs/superpowers/specs/2026-10-23-professor-clarification-design.md` (approved, option A).

| Role | Platform (target) | What they do | Status in code |
|---|---|---|---|
| Administrator | Website | Validate reports by hand, verify, reject, mark duplicate, classify, set priority, assign teams, close, manage users and teams, audit log, analytics, exports, monitor, map | Validate action and the oldest-first queue are done (API and web). Admin already held every staff permission. |
| Resident | Flutter app | Submit a report, add photos and location, cancel their own report, follow status and updates | Flutter flows unchanged. Old web paths (`/register`, `/my*`) show the mobile-app notice (`MobileAppNotice`). |
| Responder (rescuer) | Flutter app | See assigned reports for their team, acknowledge, add field updates | Flutter flows unchanged. Old web path `/assignments` shows the mobile-app notice. |
| Dispatcher | None (decision B) | Functions move to the administrator. Account and history kept, nothing deleted. | Website sign-in is refused (signed out with `website_access_disabled`). Firestore rules deny staff reads. The API still accepts dispatcher tokens on its other staff routes (see pending decision 1). |
| DMO | None (decision B) | Monitoring, analytics and exports move to the administrator. Account and history kept. | Website sign-in is refused the same way. Firestore rules deny staff reads. The API still accepts DMO tokens on its read routes (see pending decision 1). |

## Rules that hold now

- Queue order: awaiting-action reports are oldest first, ties broken by report id. Priority does not change the order. Closed reports follow, newest first.
- Validation: one action, `PATCH /api/reports/:id/verify`, admin only. It records `verifiedBy` (uid and name) and `verifiedAt`. A second validation returns 409 and writes no second validation entry.
- Validation is a human review. The system does not check whether a photo is authentic. Upload checks (format and size) are separate.
- No account, report, history or priority field is deleted by this change.

## Pending decisions

1. **Dispatcher and DMO in the API** (decision B chosen 2026-10-23): the API still accepts their tokens on its other staff routes. Option A (block them in the API) would change about 120 HTTP test usages, so it stays a later choice if the professor asks for server-side enforcement.
2. **Mobile staff notice** (`mobile/lib/auth/role_gate.dart`): says "Use the web dashboard" to every staff role. Correct for administrators; for dispatchers and DMO it is misleading now (not changed, Flutter code is out of scope for this round).
3. **Dead resident and responder web pages**: the components under `web/src/features/resident/` and `web/src/features/responder/AssignmentsPage*` are unreachable. Kept for now; delete in a cleanup pass.
