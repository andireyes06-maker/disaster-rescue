# Functional audit — 18 October 2026

Scope: current React website, Express API and Firebase authorization. Local writes run on dedicated project demo-functional-audit: web 5177, API 3104, Auth 9499, Firestore 8390. Existing QA, clean presentation and production are untouched. No deployment or external notifications.

## Coverage

- Full web/component/typecheck and API suites; Firestore rules in isolated emulator.
- Access: registration, duplicates, wrong password, session restore, five-role route and API boundaries, disabled/changed claims.
- Resident: valid submit, required fields, contact validation, GPS denial, invalid files, ownership, cancellation, retry/idempotency, unsaved navigation.
- Dispatch: search/filter/details, verify/priority/classification/reject/duplicate, assign, competing assignments, closure/team release.
- Responder: assigned-team isolation, acknowledge, progress/resolved updates and persistence.
- Management: create/rename teams, create/role/deactivate/reactivate users, self/last-admin guard, settings validation and audit records. No invented hotline.
- Read-only: map/monitor/analytics/audit filtering, exports content/permissions/download filenames, public privacy.
- Realtime: resident/dispatcher/responder updates, offline/reconnect, API-down requests.
- Negative states: mocked browser request failures distinguished from real service writes; no Cloudinary/live service use.

Deliver findings by severity with reproducible triggers and evidence. Audit only: no product fixes unless separately requested. Historical evidence does not count as a fresh pass. Limitations remain explicit.
