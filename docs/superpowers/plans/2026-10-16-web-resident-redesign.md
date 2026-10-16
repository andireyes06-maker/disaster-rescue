# Web resident view and staff redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a resident interface to the React web app (sign-up, dashboard, report form, report detail, public rounded-area map), add an admin screen, and redesign every staff screen in the operations-console direction, with responders limited to their own team.

**Architecture:** The Express API stays the only writer. Three new API surfaces: a public incident endpoint (rounded locations, no identities), a first-admin setup script, and admin endpoints (health, hotline/notice settings). Firestore rules tighten responder team reads to their own team. The web app gets a resident route group and a restyled staff shell; existing hooks and role checks are kept.

**Tech Stack:** Node.js, Express, Firebase Admin SDK, Firestore (emulator for tests), Vitest with supertest for the API; React, Vite, TypeScript, React Router, Vitest with Testing Library, Playwright for rendered checks; Leaflet for maps; the existing `web/src/theme/tokens.css` tokens.

**Spec:** `docs/superpowers/specs/2026-10-16-web-resident-redesign-design.md`

## Global Constraints

- Operations-console direction (approved as option A): dark navy command bar or sidebar, neutral panels, dense tables, red only for critical priority.
- Palette and tokens only from `web/src/theme/tokens.css` and `docs/design-tokens/tokens.json`. No raw hex in components.
- Public map shows rounded areas only, using the existing `STEP = 0.005` rounding in `api/src/domain/privacy.js`. No exact point, address, contact, or photo on the public endpoint.
- Phone width: no horizontal page scroll, 16 px side gutter, touch targets at least 44 px.
- Photos: up to 5 per report, JPEG, PNG, or WebP, 5 MB each, validated by file signature in the API.
- Firebase Auth passwords never appear in the repo. The setup script reads the password from the terminal or environment, never from a file in the repo.
- Testing uses the local emulators only (Auth 9099, Firestore 8180, seeded API 3101). No live project writes during build.
- Commit after each phase on `build/disaster-rescue` only when that phase's checks pass. No push, no deploy.

## Review Focus

1. A resident submits with no GPS and no map pick, so the report has no location. Expected: the form refuses to submit and says a location is needed.
2. A resident double-clicks submit. Expected: one report is created; the second click is ignored while the first is in flight.
3. A resident cancels a report just after a dispatcher verifies it. Expected: the cancel is refused with a clear message and the list refreshes.
4. The public map has no incidents in the window. Expected: an empty state, not a blank map.
5. The public endpoint is called in a loop. Expected: rate-limited, and it never returns identities.

## File Structure

API (new):
- `api/src/services/publicIncidentService.js` — builds rounded, non-identifying incident rows.
- `api/src/routes/public.js` — `GET /api/public/incidents`, rate limited.
- `api/src/routes/admin.js` — `GET /api/admin/health`, `GET /api/admin/settings`, `PUT /api/admin/settings`, all `admin` only.
- `api/scripts/create-admin.js` — first-admin setup, run once from a terminal.

API (modified):
- `api/src/server.js` — mount the new routers.
- `api/src/routes/users.js` — no change expected; reuse `POST /api/users/self`.

Firestore (modified):
- `firebase/firestore.rules` — responder reads of `teams` are removed; responders read only their own team doc (the rule uses the `team` claim).
- `firebase/rules.test.js` — add cases for the team rule.

Web (new):
- `web/src/features/resident/ResidentDashboard.tsx` — hotline notice, new-report button, My reports list, notifications panel, public map.
- `web/src/features/resident/ResidentSignUp.tsx` — sign-up form (Firebase Auth, then `POST /api/users/self`).
- `web/src/features/resident/ReportForm.tsx` — web report form.
- `web/src/features/resident/ResidentReportDetail.tsx` — status history and cancel.
- `web/src/features/resident/PublicIncidentMap.tsx` — Leaflet circles from the public endpoint.
- `web/src/features/resident/useMyReports.ts` — live listener on the resident's own reports (existing Firestore rules allow this).
- `web/src/features/admin/AdminPage.tsx`, `AccountsPanel.tsx`, `TeamsPanel.tsx`, `SettingsPanel.tsx`, `HealthPanel.tsx`, and `ExportPanel.tsx`.
- `web/src/layout/StaffShell.tsx` — operations-console shell (replaces the current `AppShell` layout for staff).

Web (modified): every staff screen under `web/src/features/*` (restyle and layout only, keeping hooks and behavior), `web/src/App.tsx` (routes), `web/src/routes/RoleRoute.tsx` (resident and admin), `web/src/routes/landing.ts` (landing per role), `web/src/theme/tokens.css` (operations-console tokens only if a token is missing).

Docs (modified): `X-SPEC.md` (admin role amendment, resident web interface), `HANDOFF.md`, `CLAUDE-HANDOFF.md`.

---

## Phase 1: API public endpoint and admin surfaces

### Task 1: Public incident endpoint

**Files:**
- Create: `api/src/services/publicIncidentService.js`, `api/src/routes/public.js`
- Modify: `api/src/server.js`
- Test: `api/test/routes/public.test.js`

**Interfaces:**
- Consumes: `repo.listReports(filter)` and `roundLocation` from `api/src/domain/privacy.js`.
- Produces: `GET /api/public/incidents` returns `{ incidents: Array<{ type: string; statusCategory: 'open'|'responding'|'resolved'; center: { lat: number; lng: number }; radiusMeters: 500 }> }`. No `id`, `reporterId`, `contact`, `photos`, `addressText`.

- [ ] **Step 1: Write the failing test**

Assert: a request with no token returns 200; the body has no key among `id`, `reporterId`, `contact`, `photos`, `addressText`; `center.lat` equals the rounded value from `roundLocation` for a known input; a report with status `Closed` is excluded; the route is rate limited (the 61st call in a minute returns 429 `rate_limited`).

- [ ] **Step 2: Run it to see it fail**

Run: `cd api && npx vitest run test/routes/public.test.js`
Expected: FAIL, route not found.

- [ ] **Step 3: Implement the service and route**

Status category mapping: `Submitted`, `Under Verification`, `Verified`, `Awaiting Assignment` → `open`; `Team Assigned`, `Rescue in Progress` → `responding`; `Resolved`, `Closed` → `resolved`. Exclude `Rejected`, `Duplicate`, `Cancelled`. Mount with `app.use('/api/public', publicRouter(deps))`.

- [ ] **Step 4: Run it to see it pass**

Run: `cd api && npx vitest run test/routes/public.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/services/publicIncidentService.js api/src/routes/public.js api/src/server.js api/test/routes/public.test.js
git commit -m "feat(api): public rounded incident endpoint"
```

### Task 2: Admin health and settings endpoints

**Files:**
- Create: `api/src/routes/admin.js`, `api/src/services/adminService.js`
- Modify: `api/src/server.js`
- Test: `api/test/routes/admin.test.js`

**Interfaces:**
- Consumes: `requireRole` from `api/src/middleware/auth.js`; `repo` for the hotline doc at `config/hotlines`.
- Produces: `GET /api/admin/health` → `{ api: 'ok', firestore: 'ok'|'error', checkedAt: string }`; `GET /api/admin/settings` → `{ hotline: string; residentNotice: string }`; `PUT /api/admin/settings` takes the same shape, validates lengths (hotline max 40, notice max 500), returns the saved object and writes an audit entry.

- [ ] **Step 1: Write the failing test**

Assert: dispatcher gets 403 on all three; admin gets 200; `PUT` with a 501-character notice returns 400 `validation_failed`; a successful `PUT` writes one audit entry with action `settings.update`.

- [ ] **Step 2: Run it to see it fail**

Run: `cd api && npx vitest run test/routes/admin.test.js`
Expected: FAIL, 404.

- [ ] **Step 3: Implement the routes**

Use `requireRole('admin')` on every route. `GET /health` pings Firestore with a read of `config/hotlines` and reports `error` on failure without throwing.

- [ ] **Step 4: Run it to see it pass**

Run: `cd api && npx vitest run test/routes/admin.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/routes/admin.js api/src/services/adminService.js api/src/server.js api/test/routes/admin.test.js
git commit -m "feat(api): admin health and settings endpoints"
```

### Task 3: First-admin setup script

**Files:**
- Create: `api/scripts/create-admin.js`
- Test: `api/test/scripts/create-admin.test.js`

**Interfaces:**
- Consumes: `GOOGLE_APPLICATION_CREDENTIALS` and `FIREBASE_PROJECT_ID` from `api/.env`.
- Produces: CLI `node scripts/create-admin.js --email <email>` that prompts for a password with no echo, creates the Auth user with `emailVerified: true`, sets custom claims `{ role: 'admin', active: true }`, and writes `users/{uid}` with `role: 'admin'`. Exits 1 with a message if the email already exists.

- [ ] **Step 1: Write the failing test**

Against the emulator: running with no `--email` exits 1 and prints usage; running twice with the same email exits 1 on the second run; the created user has claim `role: 'admin'`.

- [ ] **Step 2: Run it to see it fail**

Run: `cd api && npx vitest run test/scripts/create-admin.test.js`
Expected: FAIL, script not found.

- [ ] **Step 3: Implement the script**

Read the password with `readline` and muted output. Refuse a password under 12 characters. Refuse to run when `FIRESTORE_EMULATOR_HOST` is unset and `--confirm-live` is not passed, so a stray run cannot touch the live project.

- [ ] **Step 4: Run it to see it pass**

Run: `cd api && npx vitest run test/scripts/create-admin.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/scripts/create-admin.js api/test/scripts/create-admin.test.js
git commit -m "feat(api): first-admin setup script"
```

### Task 4: Responder team rule

**Files:**
- Modify: `firebase/firestore.rules` (the `teams` match block)
- Test: `firebase/rules.test.js`

**Interfaces:**
- Consumes: the `team` custom claim (already used by `canSeeReport`).
- Produces: `teams/{id}` read allowed for dispatcher and dmo always; for responder only when `id == request.auth.token.team`.

- [ ] **Step 1: Write the failing test**

A responder with claim `team: 'team-alpha'` can read `teams/team-alpha` and is denied `teams/team-bravo`. A dispatcher can read both.

- [ ] **Step 2: Run it to see it fail**

Run: `cd firebase && npx vitest run rules.test.js` (or the project's rules test command)
Expected: FAIL on the `team-bravo` denial.

- [ ] **Step 3: Change the rule**

```
match /teams/{id} {
  allow read: if isActive() && (role() == 'dispatcher' || role() == 'dmo' || (role() == 'responder' && team() == id));
  allow write: if false;
}
```

- [ ] **Step 4: Run it to see it pass, then the full rules suite**

Run: the same command. Expected: PASS, and all previously passing rules cases still pass (117 of 117 before, plus the new cases).

- [ ] **Step 5: Commit**

```bash
git add firebase/firestore.rules firebase/rules.test.js
git commit -m "fix(firebase): responders read only their own team"
```

---

## Phase 2: Resident sign-in and routing

### Task 5: Resident sign-up

**Files:**
- Create: `web/src/features/resident/ResidentSignUp.tsx`
- Modify: `web/src/App.tsx` (route `/register`), `web/src/features/auth/LoginPage.tsx` (link to register)
- Test: `web/src/features/resident/ResidentSignUp.test.tsx`

**Interfaces:**
- Consumes: Firebase Auth `createUserWithEmailAndPassword` from `web/src/firebase.ts`; `api.post('/users/self', ...)` from `web/src/api/client.ts`.
- Produces: form fields `name`, `email`, `password`, `confirmPassword`, `phone`; validated with zod in `web/src/lib/schemas.ts` (`residentSignUpSchema`). Password minimum 8 characters, passwords must match, phone is a Philippine mobile number. On success: navigate to `/my`. On failure: show the error and the hotline notice.

- [ ] **Step 1: Write the failing test**

Assert: mismatched passwords show "Passwords do not match" and do not call Firebase; a valid submit calls `createUserWithEmailAndPassword` then `POST /users/self` with `{ name, phone }`; a Firebase error shows the message and the hotline text.

- [ ] **Step 2: Run it to see it fail**

Run: `cd web && npx vitest run src/features/resident/ResidentSignUp.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement the form with react-hook-form and the zod schema**

Use the same field style and error component as `LoginPage.tsx`. Disable submit while in flight (review focus item 2).

- [ ] **Step 4: Run it to see it pass**

Run: the same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/features/resident web/src/lib/schemas.ts web/src/App.tsx web/src/features/auth/LoginPage.tsx
git commit -m "feat(web): resident sign-up"
```

### Task 6: Resident route group and role landing

**Files:**
- Modify: `web/src/routes/RoleRoute.tsx`, `web/src/routes/landing.ts`, `web/src/App.tsx`, `web/src/pages/Forbidden.tsx`
- Test: `web/src/routes/RoleRoute.test.tsx` (extend), `web/src/routes/landing.test.ts`

**Interfaces:**
- Consumes: `useAuth()` returns `{ role }` from `web/src/auth/AuthProvider.tsx`.
- Produces: `/my` and `/my/reports/:id` allowed for `resident`; `/admin/*` allowed for `admin`; `landingFor('resident')` returns `/my`; `landingFor('admin')` returns `/admin`. Staff roles get the Forbidden page on `/my`, and residents keep the existing "Use the mobile app" text only on staff routes.

- [ ] **Step 1: Write the failing test**

Assert `landingFor('resident') === '/my'`, `landingFor('admin') === '/admin'`; a resident visiting `/dashboard` is redirected to `/forbidden`; a dispatcher visiting `/my` sees the staff-forbidden text.

- [ ] **Step 2: Run it to see it fail**

Run: `cd web && npx vitest run src/routes`
Expected: FAIL.

- [ ] **Step 3: Implement the mapping and route guards**

- [ ] **Step 4: Run it to see it pass**

Run: `cd web && npx vitest run src/routes`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/routes web/src/App.tsx web/src/pages/Forbidden.tsx
git commit -m "feat(web): resident and admin route groups"
```

---

## Phase 3: Resident dashboard and reporting

### Task 7: My reports live list

**Files:**
- Create: `web/src/features/resident/useMyReports.ts`
- Test: `web/src/features/resident/useMyReports.test.ts`

**Interfaces:**
- Consumes: Firestore `onSnapshot` on `reports` with `where('reporterId', '==', uid)`, which the existing rules allow.
- Produces: `useMyReports(uid: string) → { reports: Report[]; loading: boolean; error: string | null; retry: () => void }`. Sorted by `createdAt` descending.

- [ ] **Step 1: Write the failing test**

Mock `onSnapshot`; assert the query is scoped to the uid, the list is sorted newest first, and an error sets `error` and `retry` re-subscribes.

- [ ] **Step 2: Run it to see it fail**

Run: `cd web && npx vitest run src/features/resident/useMyReports.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the hook following the pattern in `web/src/features/reports/useReports.ts`** (attempt counter for retry).

- [ ] **Step 4: Run it to see it pass**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/features/resident/useMyReports.ts web/src/features/resident/useMyReports.test.ts
git commit -m "feat(web): live list of a resident's own reports"
```

### Task 8: Resident dashboard

**Files:**
- Create: `web/src/features/resident/ResidentDashboard.tsx`, `web/src/features/resident/SafetyNotice.tsx`
- Test: `web/src/features/resident/ResidentDashboard.test.tsx`

**Interfaces:**
- Consumes: `useMyReports`, `GET /api/public/incidents` (Task 1), `GET /api/admin/settings` is NOT used here; the notice text comes from `config/hotlines` through the existing Firestore read.
- Produces: page order: safety notice and hotline, "Report an emergency" button (to `/my/report`), "My reports" list (each row links to `/my/reports/:id`), notifications panel (reads `notifications` where `recipientUid == uid`, using the existing rule), public map (Task 10 component).

- [ ] **Step 1: Write the failing test**

Assert the hotline text is visible without scrolling in the first region; the "Report an emergency" button links to `/my/report`; an empty list shows "You have no reports yet" with the report button; each row shows type and status.

- [ ] **Step 2: Run it to see it fail**

Expected: FAIL.

- [ ] **Step 3: Implement the page using the operations-console tokens and the shared components in `web/src/components/calm/` (Card, Badge, Banner, EmptyState)**

- [ ] **Step 4: Run it to see it pass**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/features/resident
git commit -m "feat(web): resident dashboard"
```

### Task 9: Resident report form

**Files:**
- Create: `web/src/features/resident/ReportForm.tsx`
- Modify: `web/src/lib/schemas.ts` (`webReportSchema`)
- Test: `web/src/features/resident/ReportForm.test.tsx`

**Interfaces:**
- Consumes: `POST /api/reports` as `multipart/form-data` with fields `type`, `description`, `lat`, `lng`, `source` (`gps` or `map`), `addressText`, `contactName`, `contactPhone`, and `photos` (up to 5 files).
- Produces: on success, navigate to `/my/reports/:id` with a success banner showing the reference ID and saved status. On failure, a banner with the error and the hotline.

- [ ] **Step 1: Write the failing test**

Assert: no location → the form does not submit and shows "Pick a location or use GPS" (review focus item 1); 6 photos → refused with "At most 5 photos"; a double click sends one request (review focus item 2); a 5 MB+ photo → refused with the size message.

- [ ] **Step 2: Run it to see it fail**

Expected: FAIL.

- [ ] **Step 3: Implement with react-hook-form and zod. Location: browser geolocation, or a Leaflet map pick.**

- [ ] **Step 4: Run it to see it pass**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/features/resident web/src/lib/schemas.ts
git commit -m "feat(web): resident report form"
```

### Task 10: Resident report detail and cancel

**Files:**
- Create: `web/src/features/resident/ResidentReportDetail.tsx`
- Test: `web/src/features/resident/ResidentReportDetail.test.tsx`

**Interfaces:**
- Consumes: the report from `useMyReports`, `PATCH /api/reports/:id/cancel` (exists; resident role; allowed only while Submitted).
- Produces: status history with timestamps, report details, a Cancel action shown only when `status === 'Submitted'`. A cancel refused by the API (`409`) shows "This report has already been verified, so it can no longer be cancelled" and refreshes the list (review focus item 3).

- [ ] **Step 1: Write the failing test**

Assert Cancel is hidden for Verified; for Submitted, a 409 response shows the message and calls `retry`.

- [ ] **Step 2: Run it to see it fail**

Expected: FAIL.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run it to see it pass**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/features/resident
git commit -m "feat(web): resident report detail and cancel"
```

---

## Phase 4: Public map

### Task 11: Public rounded-area map

**Files:**
- Create: `web/src/features/resident/PublicIncidentMap.tsx`
- Test: `web/src/features/resident/PublicIncidentMap.test.tsx`

**Interfaces:**
- Consumes: `GET /api/public/incidents` (Task 1).
- Produces: a Leaflet map with one `L.circle` per incident, `radius: radiusMeters`, colored by `statusCategory`. Empty state text: "No open incidents in this area right now." Circles have no click-through to a report.

- [ ] **Step 1: Write the failing test**

Mock the API; assert one circle per incident with radius 500; an empty response shows the empty-state text (review focus item 4); a 429 response shows "The map is busy. Try again in a minute" with a retry button (review focus item 5).

- [ ] **Step 2: Run it to see it fail**

Expected: FAIL.

- [ ] **Step 3: Implement with Leaflet and OpenStreetMap tiles**

- [ ] **Step 4: Run it to see it pass**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/features/resident
git commit -m "feat(web): public rounded-area incident map"
```

---

## Phase 5: Admin screen

### Task 12: Admin shell and panels

**Files:**
- Create: `web/src/features/admin/AdminPage.tsx`, `AccountsPanel.tsx`, `TeamsPanel.tsx`, `SettingsPanel.tsx`, `HealthPanel.tsx`, `ExportPanel.tsx`
- Test: `web/src/features/admin/AdminPage.test.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/health`, `GET|PUT /api/admin/settings` (Task 2); `GET /api/users`, `PATCH /api/users/:id` (existing, admin allowed where the API allows it); `GET|POST /api/teams` (existing); `GET /api/export/...` (existing, see `api/src/routes/export.js`).
- Produces: `/admin` with four sections: Accounts and roles, Teams, System health and settings, Audit and exports. Accounts can create staff and residents, deactivate, change role. Admin can create admins (the API allows it for admin only).

- [ ] **Step 1: Write the failing test**

Assert the four sections are reachable; the Accounts panel shows the dispatcher-cannot-see-admin rule as a note; PUT settings with a 501-character notice shows the length error from the API.

- [ ] **Step 2: Run it to see it fail**

Expected: FAIL.

- [ ] **Step 3: Implement the panels, each calling only API endpoints (no Firestore writes)**

- [ ] **Step 4: Run it to see it pass**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/features/admin
git commit -m "feat(web): admin screen"
```

---

## Phase 6: Staff operations-console redesign

Each task restyles one screen group in the new layout. The rule for every task: the existing tests for that screen still pass unchanged, except for selectors that a layout change must update, and each changed selector is listed in the commit message.

### Task 13: Staff shell

**Files:**
- Create: `web/src/layout/StaffShell.tsx`
- Modify: `web/src/layout/AppShell.tsx` (delegate to StaffShell or remove after all screens move), `web/src/styles.css`
- Test: `web/src/layout/StaffShell.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` for role and email.
- Produces: a navy command bar with the product name, role label, sign-out, and a left nav listing only the routes allowed for the role (same mapping as `RoleRoute`). Mobile width: nav becomes a menu button with `aria-expanded`.

- [ ] **Step 1: Write the failing test**

Assert: dispatcher sees Dashboard, Map, Teams, Users, Audit, Analytics; DMO sees Monitor and Analytics only; responder sees Assignments only; the menu button toggles `aria-expanded`.

- [ ] **Step 2: Run it to see it fail**, then implement, then run to pass.

- [ ] **Step 3: Commit**

```bash
git add web/src/layout web/src/styles.css
git commit -m "feat(web): operations-console staff shell"
```

### Task 14: Dispatcher queue and incident details

**Files:**
- Modify: `web/src/features/reports/ReportQueue.tsx`, `web/src/features/reports/IncidentDetails.tsx`, `web/src/features/reports/StatusBadge.tsx`, `web/src/features/reports/PriorityBadge.tsx`, `web/src/features/reports/VerifiedBadge.tsx`
- Test: existing `ReportQueue.test.tsx`, `IncidentDetails.test.tsx` (must still pass)

**Interfaces:**
- Consumes: unchanged hooks (`useReports`, `useReport`, `useReportUpdates`).
- Produces: queue with a command area (counts by status and filters above the table); incident details in two columns with a sticky action rail (Verify, Priority, Classify, Reject, Duplicate, Assign). Behavior is unchanged.

- [ ] **Step 1: Run the existing tests first; they must pass before any change.**

- [ ] **Step 2: Restyle and re-lay out; run the tests after each sub-change.**

- [ ] **Step 3: Commit**

```bash
git add web/src/features/reports
git commit -m "style(web): operations-console queue and incident details"
```

### Task 15: Dispatcher map and dashboard

**Files:**
- Modify: `web/src/features/map/IncidentMap.tsx`, `web/src/features/dashboard/` (the dashboard that used `SummaryCards`, now removed; use the queue command area)
- Test: `IncidentMap.test.tsx` (must still pass)

**Interfaces:**
- Consumes: unchanged `useReports`.
- Produces: map at full width with a side list of incidents; the summary counts move into the queue command area (Task 14).

- [ ] **Step 1: Run existing tests; restyle; run again.**

- [ ] **Step 2: Commit**

```bash
git add web/src/features/map web/src/features/dashboard
git commit -m "style(web): operations-console map"
```

### Task 16: Responder assignments

**Files:**
- Modify: `web/src/features/responder/AssignmentsPage.tsx`
- Test: `AssignmentsPage.test.tsx` (create if missing)

**Interfaces:**
- Consumes: unchanged `useAssignedReports`.
- Produces: assignments as cards (type, priority, location, status, and one primary action). Responders see only their own team's assignments (already enforced by the API and, after Task 4, by the teams rule).

- [ ] **Step 1: Write a test that a responder never sees another team's assignment in the rendered list.**

- [ ] **Step 2: Restyle as cards; run tests.**

- [ ] **Step 3: Commit**

```bash
git add web/src/features/responder
git commit -m "style(web): responder assignment cards"
```

### Task 17: DMO monitor and analytics

**Files:**
- Modify: `web/src/features/dmo/MonitorPage.tsx`, `web/src/features/analytics/AnalyticsPage.tsx`, `ChartCard.tsx`
- Test: existing tests must still pass.

**Interfaces:** unchanged data hooks. Produces: read-only monitor layout in the command style; chart cards with the same data.

- [ ] **Step 1: Restyle; run tests.**

- [ ] **Step 2: Commit**

```bash
git add web/src/features/dmo web/src/features/analytics
git commit -m "style(web): operations-console monitor and analytics"
```

### Task 18: Teams, users, and audit

**Files:**
- Modify: `web/src/features/teams/TeamsPage.tsx`, `web/src/features/users/UsersPage.tsx`, `web/src/features/audit/AuditPage.tsx`
- Test: existing tests must still pass.

**Interfaces:** unchanged. Produces: dense tables in the command style; the audit scroll cue and retry controls carried over.

- [ ] **Step 1: Restyle; run tests.**

- [ ] **Step 2: Commit**

```bash
git add web/src/features/teams web/src/features/users web/src/features/audit
git commit -m "style(web): operations-console teams, users, and audit"
```

---

## Phase 7: Verification and docs

### Task 19: Full verification

**Files:**
- Modify: `HANDOFF.md`, `CLAUDE-HANDOFF.md`, `X-SPEC.md` (admin role amendment; resident web interface)

**Interfaces:** none.

- [ ] **Step 1: Run the API suite**

Run: `cd api && npm test`
Expected: all tests pass, including the new public, admin, and script tests.

- [ ] **Step 2: Run the rules suite**

Run: `cd firebase && npx vitest run rules.test.js`
Expected: all cases pass, including the team rule.

- [ ] **Step 3: Run the web suite and build**

Run: `cd web && npm test && npm run build -- --outDir /tmp/rescue-final-build`
Expected: all tests pass, typecheck clean, build succeeds.

- [ ] **Step 4: Run the Impeccable detector on changed UI files**

Run: the detector command from `CLAUDE-HANDOFF.md`, over the changed `web/src` files.
Expected: 0 findings, or each finding is listed in the handoff with a reason.

- [ ] **Step 5: Rendered check on the local emulator**

Run the capture helper at widths 1440, 768, 390, and 320 for: resident sign-up, resident dashboard, report form, report detail, public map, admin, and each staff screen group.
Expected: no horizontal page scroll at any width; no console errors; each screen has a captured image under `design-plans/redesign-2026-10-16/screenshots/`.

- [ ] **Step 6: Update docs and commit**

```bash
git add HANDOFF.md CLAUDE-HANDOFF.md X-SPEC.md design-plans/redesign-2026-10-16
git commit -m "docs: resident web view and staff redesign verified"
```

## Verification not covered by this plan

- Physical phones, screen readers, Firefox, and WebKit are not tested here.
- The live project (`flutter-5094e`) is not changed. A deploy needs a separate approval.
- The Flutter apps are not changed.
