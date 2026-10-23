# Professor clarification: Rescue Reports design (2026-10-23)

**Status:** draft for Airen's approval. No product code written yet.
**Size:** big (Airen approved the big-task path: spec, review, plan, then build).

## Intent

The professor clarified three things that change the product:

1. Reports awaiting action are handled first come, first served (oldest submission first).
2. The administrator validates received reports by hand, with a button.
3. Only the administrator uses the website. Residents and rescuers (responders) use the Flutter mobile app.

The professor's message takes precedence over older specs where they conflict.

## Current state (checked in code, 2026-10-23)

- **Queue order is newest first.** `api/src/adapters/firestoreRepo.js:52` and `:59` order by `createdAt desc`. `web/src/features/reports/useReports.ts:34` and `:40` do the same. `web/src/features/responder/useAssignedReports.ts:35` sorts newest first too. Priority is a manual field (`setPriority` in `api/src/services/reviewService.js`) and does not reorder anything today.
- **Server timestamp.** `createdAt` is set in `api/src/services/reportService.js:47` from `now`. The plan must confirm `now` is the server clock, not a client value.
- **Verification already exists.** `reviewService.verify` moves a report Submitted, then Under Verification, then Verified, then Awaiting Assignment, and sets `verified: true`. It is routed as a dispatcher action (`api/src/routes/reports.js:46`). Admin passes because `grants()` (`api/src/middleware/auth.js:14`) gives admin every non-resident role. The report stores no `verifiedBy` or `verifiedAt`; only the audit log records the actor.
- **Web routes** (`web/src/App.tsx:38-51`): resident pages under `/my`, responder page `/assignments`, and staff pages for dispatcher and DMO. Admin has `/admin`.
- **Roles:** resident, responder, dispatcher, dmo, admin. Admin holds every staff permission (decision recorded in `HANDOFF.md`, Oct 16).
- **Flutter** (`mobile/lib/features`) has resident and responder workflows (`report`, `my_reports`, `responder`, `map`, `notifications`, `offline`). It has no dispatcher or DMO workspace.

## Requirement 1: chronological queue

**Decisions (mine, to be checked by you):**

- The awaiting-action queue sorts by `createdAt` ascending, with `id` ascending as the tie-breaker. Ties are deterministic.
- "Awaiting action" means Submitted, Under Verification, Verified, Awaiting Assignment (the dispatcher/admin queue), and the responder's assigned list.
- Resident "my reports" and closed or history lists keep newest first. They are not queues.
- Priority stays a visible, manually set field. It does not reorder the queue. The screen says: "Oldest first. Priority does not change the order."
- No data is deleted. The priority field and history stay.
- Audit every read path listed above (API repo and web hooks) so no second sort overrides the first.

## Requirement 2: manual validation

**Decisions (mine):**

- The "Validate report" button calls the existing verify transition. No new status and no competing state.
- Add `verifiedBy` (uid and name) and `verifiedAt` (server time) to the report when validation happens. Show both in the admin report view. The audit log keeps the full trail.
- Server guard: validation is admin-only. Dispatcher access depends on the mapping in Requirement 3.
- Repeat validation: the transition from Verified back to Verified is already refused (409). The button is disabled once validated, and a 409 refreshes the view instead of showing a fake success.
- The admin sees the report details and the attached resident photos in the existing photo viewer. The copy says validation is a human review of the report. The system does not claim a photo is authentic.
- Technical upload checks (supported formats, file-size limits) stay as they are. They are separate from validation.
- No AI image verification.

## Requirement 3: platform allocation

**Target allocation (from the professor):**

| Role | Platform | Notes |
|---|---|---|
| Administrator | Website | Queue, validation, assignment, teams, users, analytics, exports, audit, monitor, map |
| Resident | Flutter app | Web resident routes removed or redirected to a "use the mobile app" page |
| Responder (rescuer) | Flutter app | Web `/assignments` removed. Flutter responder flow kept online |
| Dispatcher | **Open (see question 1)** | Currently web-only staff |
| DMO | **Open (see question 1)** | Currently web-only staff |

- The public landing page may stay. Its copy must not tell residents or rescuers to use a website dashboard.
- Role guards are checked on both the web routes and the API. Nothing is widened to compensate.
- No Flutter native workspaces are added for staff.
- Account and permission migrations are not made until the mapping is approved.

## Requirement 4: presentation

- Update `docs/user-guide/outline.md`, `docs/video-script.md` and the submission folder so they agree with the code: purpose and users, stack and architecture, database, resident submission, chronological admin queue and manual validation, assignment and responder updates, tracking and completion, testing, challenges and solutions.
- One narrator is acceptable. If any narration is synthetic, the slides and script say so.
- **Unresolved, not invented:** whether a separate live presentation is required. The professor did not confirm it. Ask the professor. Keep any participation requirement from the original brief unless it is explicitly superseded.

## Non-goals

- No AI verification of photos.
- No deletion of accounts, reports, history or priority fields.
- No broad privilege grants.
- No production deployment or destructive migration without your approval of the exact tested change.
- No commit or push without your approval.

## Acceptance checks (planned, to run in the plan phase)

- API: oldest-first order holds; equal timestamps order by id; changing priority does not change order.
- API: validate is admin-only (other roles get 403); repeat validate returns 409; `verifiedBy` and `verifiedAt` are written; audit entry exists.
- Web: admin queue is oldest first; validate button shows the saved state; resident and responder web routes are gone or redirect.
- Flutter: `flutter analyze`, and `flutter test` (a `test/` folder exists). Resident and responder flows unchanged; no APK rebuild unless mobile code changes.
- Web: `npm test`, typecheck, build. API: `npm test`.
- Evidence: emulator demo only (`firebase/firebase.demo.json`, ports 8190 and 9299). Nothing is claimed about the live site until it is checked online.

## Builder check (what a builder would still need to ask)

- **Answered by the professor or the code:** queue direction, validation is manual, website for admin only, Flutter for residents and responders, presentation topics.
- **My calls (listed above):** tie-breaker, which lists count as awaiting action, reuse of verify, new `verifiedBy`/`verifiedAt` fields, redirect copy for removed web routes.
- **Yours (blocking):** question 1 below.

## Open questions

1. **Dispatcher and DMO.** The professor says only the administrator needs the website, but dispatchers and DMO currently work on the website. Options:
   - **A (recommended):** Keep their accounts and history. Turn off their website sign-in and move their functions to admin. No roles are deleted or changed. Any dispatcher or DMO who needs a workspace later gets a separate decision.
   - **B:** Convert existing dispatcher and DMO accounts to admin. This is fast, but it gives broad privileges and the professor did not ask for it.
   - **C:** Keep dispatcher and DMO on the website. This goes against the clarification.
2. **Live presentation.** Not decided. This needs the professor, not a guess.
