# Professor Clarification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (Native) or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the awaiting-action queue oldest first, make admin validation a manual, audited button, and reduce the website to the administrator, with residents and responders on Flutter only.

**Architecture:** Queue ordering lives in one pure API domain function reused by the list service. Validation reuses the existing `verify` transition, now admin-only, and records who and when. Dispatcher and DMO website access is blocked in the API auth middleware and the Firestore rules, with their accounts and history left untouched. The web app keeps the admin routes, drops resident and responder web routes, and sorts the queue the same way as the API.

**Tech Stack:** Node.js + Express + Firestore emulator (API, Vitest), React + Vite + TypeScript (web, Vitest), Firestore rules tests (`firebase/rules.test.js`), Flutter (mobile, `flutter analyze`, `flutter test`).

**Spec:** `docs/superpowers/specs/2026-10-23-professor-clarification-design.md` (approved 2026-10-23, option A for dispatcher and DMO).

## Global Constraints

- Oldest first: awaiting-action reports sort by `createdAt` ascending, tie-break by document `id` ascending.
- Priority never changes queue order. No data is deleted; `priority`, history and accounts stay.
- Validation is a manual admin action. No AI or automatic photo verification. Upload checks stay separate.
- Website is admin only. Residents and responders use Flutter only. No new Flutter staff workspaces.
- No commit, push, deploy, or production migration without Airen's explicit approval. Emulator only (`firebase/firebase.demo.json`, ports 8190 and 9299).
- Do not stage or overwrite other sessions' uncommitted changes (`web/src/features/auth/LoginPage.tsx`, `LoginPage.test.tsx`, `web/src/pages/public.css`, `design-plans/*`, untracked folders).

## Review Focus

1. Two reports with the same `createdAt`: order must be the same on every load (by `id`). Test in Task 1 and Task 2.
2. A report with a missing or unreadable `createdAt` (legacy data): it sorts after dated reports and nothing throws. Test in Task 1.
3. Admin validates a report twice: second call returns 409 and writes no second validation. Test in Task 3.
4. Resident, responder, and dispatcher or DMO tokens calling validate or staff routes: 403, with `website_access_disabled` for dispatcher and DMO. Tests in Task 3 and Task 4.
5. Responder with no team: list stays empty, no error from the new sort. Test in Task 2.

## File Structure

- Create: `api/src/domain/queueOrder.js`: pure ordering helpers (one responsibility).
- Create: `api/test/domain/queueOrder.test.js`.
- Modify: `api/src/services/reviewService.js`: apply ordering in `list`, add validator fields in `verify`.
- Modify: `api/src/routes/reports.js`: `verify` route role becomes `admin`.
- Modify: `api/src/middleware/auth.js`: retired website roles.
- Modify: `firebase/firestore.rules`: staff reads become admin only.
- Modify: `firebase/rules.test.js`: dispatcher and DMO denied, admin allowed.
- Modify: `web/src/App.tsx`: remove resident and responder web routes; dispatcher and DMO routes become admin only.
- Modify: `web/src/routes/landing.ts`, `web/src/pages/Forbidden.tsx`: admin lands on `/admin`; others see a "use the Rescue Reports mobile app" message.
- Modify: `web/src/features/reports/useReports.ts`, `web/src/features/responder/useAssignedReports.ts`: ascending order.
- Modify: `web/src/features/reports/ReportQueue.tsx`: order statement shown to the admin.
- Modify: `web/src/features/reports/workflow.ts`: `canActOnReports` admin only.
- Modify: `web/src/features/reports/IncidentDetails.tsx`: "Validate report" button, validator fields.
- Modify: `web/src/pages/Landing.tsx` (copy only): no website dashboard suggestion for residents or rescuers.
- Create: `docs/role-matrix.md`: role, platform, and allowed actions.
- Modify: `docs/user-guide/outline.md`, `docs/video-script.md`: match the code.
- Modify: `HANDOFF.md`: trim to 60 lines, move older content to `docs/history.md`.

Each task's test files live next to the existing tests for that code.

---

### Task 1: Queue ordering helpers (API domain)

**Files:**
- Create: `api/src/domain/queueOrder.js`
- Test: `api/test/domain/queueOrder.test.js`

**Interfaces:**
- Produces:
  - `export const AWAITING_ACTION`: a `Set` of status strings: `Submitted`, `Under Verification`, `Verified`, `Awaiting Assignment`, `Team Assigned`, `Rescue in Progress`.
  - `export function toMillis(value): number`: accepts a Date, a number (ms), an ISO string, or an object with `toMillis()` (Firestore Timestamp). Returns `Number.POSITIVE_INFINITY` for anything else.
  - `export function compareOldestFirst(a, b): number`: compares `toMillis(a.createdAt)` then `String(a.id)` vs `String(b.id)`. Returns a negative, zero, or positive number.

- [ ] **Step 1: Write the failing test**

```js
import { describe, expect, test } from 'vitest';
import { AWAITING_ACTION, compareOldestFirst, toMillis } from '../../src/domain/queueOrder.js';

describe('toMillis', () => {
  test('reads Date, number, ISO string and Timestamp-like values', () => {
    expect(toMillis(new Date('2026-10-01T00:00:00Z'))).toBe(Date.parse('2026-10-01T00:00:00Z'));
    expect(toMillis(5)).toBe(5);
    expect(toMillis('2026-10-01T00:00:00Z')).toBe(Date.parse('2026-10-01T00:00:00Z'));
    expect(toMillis({ toMillis: () => 9 })).toBe(9);
  });
  test('invalid or missing values sort last', () => {
    expect(toMillis(undefined)).toBe(Number.POSITIVE_INFINITY);
    expect(toMillis('not a date')).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('compareOldestFirst', () => {
  test('earlier createdAt first', () => {
    const a = { id: 'b', createdAt: new Date('2026-10-02') };
    const b = { id: 'a', createdAt: new Date('2026-10-01') };
    expect([a, b].sort(compareOldestFirst).map((r) => r.id)).toEqual(['a', 'b']);
  });
  test('equal createdAt breaks ties by id', () => {
    const t = new Date('2026-10-01');
    const rows = [{ id: 'r2', createdAt: t }, { id: 'r1', createdAt: t }];
    expect(rows.sort(compareOldestFirst).map((r) => r.id)).toEqual(['r1', 'r2']);
  });
  test('missing createdAt sorts after dated reports', () => {
    const rows = [{ id: 'x' }, { id: 'y', createdAt: new Date('2026-10-01') }];
    expect(rows.sort(compareOldestFirst).map((r) => r.id)).toEqual(['y', 'x']);
  });
  test('AWAITING_ACTION excludes closed states', () => {
    expect(AWAITING_ACTION.has('Submitted')).toBe(true);
    expect(AWAITING_ACTION.has('Closed')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd api && npx vitest run test/domain/queueOrder.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `api/src/domain/queueOrder.js`**

Export the three names in the Interfaces block. `toMillis` must not throw on `null`. Use `Number.isFinite` before returning a numeric time, and `String(id ?? '')` for the tie-break.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd api && npx vitest run test/domain/queueOrder.test.js`
Expected: PASS, all cases.

- [ ] **Step 5: Commit (only with Airen's approval)**

```bash
git add api/src/domain/queueOrder.js api/test/domain/queueOrder.test.js
git commit -m "feat(api): oldest-first queue ordering helpers"
```

---

### Task 2: Apply oldest-first ordering in the report list

**Files:**
- Modify: `api/src/services/reviewService.js` (function `list`, currently lines 37-54)
- Test: `api/test/routes/reports.review.test.js`

**Interfaces:**
- Consumes: `AWAITING_ACTION`, `compareOldestFirst` from Task 1.
- Produces: `list({ repo }, user, query)` unchanged signature. Ordering rule:
  - `admin` and `responder`: rows whose status is in `AWAITING_ACTION` come first, sorted by `compareOldestFirst`; the remaining rows follow, newest first.
  - `resident`: unchanged (newest first).

- [ ] **Step 1: Write the failing test** (add to `reports.review.test.js`, using the existing test app helpers in `api/test/fakes/testApp.js`)

```js
test('admin queue lists awaiting-action reports oldest first, ties by id', async () => {
  // seed three reports: 'r-b' and 'r-a' both Submitted at 2026-10-01, 'r-c' Submitted at 2026-10-03
  const res = await request(app).get('/api/reports').set(auth('admin'));
  expect(res.body.map((r) => r.id)).toEqual(['r-a', 'r-b', 'r-c']);
});
test('priority does not change queue order', async () => {
  // seed 'r-old' priority 'low' 2026-10-01 and 'r-new' priority 'critical' 2026-10-02
  const res = await request(app).get('/api/reports').set(auth('admin'));
  expect(res.body[0].id).toBe('r-old');
});
test('responder with no team gets an empty list without error', async () => {
  const res = await request(app).get('/api/reports').set(auth('responder-no-team'));
  expect(res.status).toBe(200);
  expect(res.body).toEqual([]);
});
test('resident list stays newest first', async () => {
  // seed two of the resident's reports 2026-10-01 and 2026-10-02
  const res = await request(app).get('/api/reports').set(auth('resident'));
  expect(res.body.map((r) => r.id)).toEqual(['r-new', 'r-old']);
});
test('report with missing createdAt sorts last in admin queue, no error', async () => {
  // seed 'r-undated' with no createdAt and status Submitted, alongside a dated Submitted report
  const res = await request(app).get('/api/reports').set(auth('admin'));
  expect(res.status).toBe(200);
  expect(res.body.at(-1).id).toBe('r-undated');
});
```

Use the file's existing seeding helpers and the `auth(role)` helper it already defines. If names differ, match the file.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd api && npx vitest run test/routes/reports.review.test.js`
Expected: the new admin-order and undated tests FAIL.

- [ ] **Step 3: Implement the ordering in `list`**

After the existing filters and before the `projectReportForRole` map, sort `rows`: for `admin` and `responder`, split into open-queue rows (`AWAITING_ACTION.has(r.status)`) sorted by `compareOldestFirst`, followed by the rest sorted by `toMillis(b.createdAt) - toMillis(a.createdAt)`. For `resident`, keep the existing repository order. Do not change `repo` calls.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd api && npx vitest run test/routes/reports.review.test.js`
Expected: PASS.

- [ ] **Step 5: Commit (only with approval)**

```bash
git add api/src/services/reviewService.js api/test/routes/reports.review.test.js
git commit -m "feat(api): admin and responder queues list oldest awaiting-action reports first"
```

---

### Task 3: Manual validation (admin only, recorded, not repeatable)

**Files:**
- Modify: `api/src/routes/reports.js` (line 46: `patch('verify', 'dispatcher', review.verify)` becomes `patch('verify', 'admin', review.verify)`)
- Modify: `api/src/services/reviewService.js` (function `verify`, currently lines 90-100)
- Test: `api/test/routes/reports.review.test.js`

**Interfaces:**
- Produces: `verify(deps, user, id) -> { id, status, verified: true, verifiedBy: { uid: string, name: string | null }, verifiedAt: Date }`.
- The report document gains `verifiedBy` and `verifiedAt`, written in the same guarded transition that sets `verified: true`.

- [ ] **Step 1: Write the failing tests**

```js
test('admin validates a submitted report and the validator is recorded', async () => {
  const res = await request(app).patch('/api/reports/r-1/verify').set(auth('admin'));
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ verified: true, status: 'Awaiting Assignment' });
  expect(res.body.verifiedBy.uid).toBe('admin-uid');
  expect(res.body.verifiedAt).toBeTruthy();
});
test('validating twice returns 409 and writes one validation audit entry', async () => {
  await request(app).patch('/api/reports/r-1/verify').set(auth('admin'));
  const again = await request(app).patch('/api/reports/r-1/verify').set(auth('admin'));
  expect(again.status).toBe(409);
  // audit entries with action 'report.verify' for r-1 count === 1
});
test.each(['resident', 'responder'])('%s cannot validate', async (role) => {
  const res = await request(app).patch('/api/reports/r-1/verify').set(auth(role));
  expect(res.status).toBe(403);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd api && npx vitest run test/routes/reports.review.test.js`
Expected: FAIL on `verifiedBy` and on the role change.

- [ ] **Step 3: Implement**

Change the route role to `'admin'`. In `verify`, resolve the validator name with `(await repo.getUser(user.uid))?.name ?? null`, and pass `verifiedBy` and `verifiedAt` (the same `now` value the transition uses) in the patch for the `VERIFIED` transition. Include both in the audit `after` and in the response.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd api && npx vitest run test/routes/reports.review.test.js`
Expected: PASS.

- [ ] **Step 5: Commit (only with approval)**

```bash
git add api/src/routes/reports.js api/src/services/reviewService.js api/test/routes/reports.review.test.js
git commit -m "feat(api): admin-only manual validation records validator and time"
```

---

### Task 4: Dispatcher and DMO website access disabled (API)

**Files:**
- Modify: `api/src/middleware/auth.js` (`requireAuth`)
- Test: `api/test/routes/auth.test.js`

**Interfaces:**
- Produces: `export const WEBSITE_RETIRED_ROLES = Object.freeze(['dispatcher', 'dmo']);`
- `requireAuth` returns `403 { error: 'website_access_disabled' }` when `d.role` is in `WEBSITE_RETIRED_ROLES`, after the existing `active` check and before setting `req.user`.

- [ ] **Step 1: Write the failing test**

```js
test.each(['dispatcher', 'dmo'])('%s token gets website_access_disabled on any route', async (role) => {
  const res = await request(app).get('/api/reports').set(authFor(role));
  expect(res.status).toBe(403);
  expect(res.body.error).toBe('website_access_disabled');
});
test('admin and residents are unaffected', async () => {
  expect((await request(app).get('/api/reports').set(authFor('admin'))).status).toBe(200);
  expect((await request(app).get('/api/reports').set(authFor('resident'))).status).toBe(200);
});
```

Use the file's existing token helpers.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd api && npx vitest run test/routes/auth.test.js`
Expected: FAIL, dispatcher currently gets 200.

- [ ] **Step 3: Implement**

Add the constant and the check in `requireAuth`. Do not delete users or change any role claim.

- [ ] **Step 4: Run the full API suite**

Run: `cd api && npm test`
Expected: PASS. Any existing test that expects a dispatcher or DMO token to succeed is updated to expect `website_access_disabled`, and the change is noted in the commit message.

- [ ] **Step 5: Commit (only with approval)**

```bash
git add api/src/middleware/auth.js api/test/routes/auth.test.js
git commit -m "feat(api): disable website access for dispatcher and dmo accounts"
```

---

### Task 5: Firestore rules match the admin-only website

**Files:**
- Modify: `firebase/firestore.rules` (line 22 `isStaff`, and lines 43 and 53 where dispatcher and dmo read reports and teams)
- Test: `firebase/rules.test.js` (lines 33-34 and the `dispatcher reads all` and `dmo reads all` cases around line 88-94)

**Interfaces:**
- Produces: `isStaff()` and the report and team read rules allow `admin` only. Responder team reads are unchanged. Resident and responder reads are unchanged.

- [ ] **Step 1: Update the rules tests**

Change `dispatcher reads all` and `dmo reads all` to `assertFails`, and add `admin reads all` with `assertSucceeds`. Keep responder and resident cases as they are.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd firebase && npm test` (or the rules test script in `firebase/package.json`, against the emulator on port 8180 or the demo emulator)
Expected: the dispatcher and DMO read cases FAIL against the current rules.

- [ ] **Step 3: Update `firebase/firestore.rules`**

Replace `role() == 'dispatcher' || role() == 'dmo' || role() == 'admin'` with `role() == 'admin'` in `isStaff`. At line 43 and line 53, remove `dispatcher` and `dmo`. Do not deploy.

- [ ] **Step 4: Run rules tests to verify they pass**

Run the same command as Step 2. Expected: PASS.

- [ ] **Step 5: Commit (only with approval)**

```bash
git add firebase/firestore.rules firebase/rules.test.js
git commit -m "fix(rules): restrict staff reads to admin; dispatcher and dmo website access disabled"
```

---

### Task 6: Web routes and landing for the administrator-only website

**Files:**
- Modify: `web/src/App.tsx` (lines 38-40 resident routes, line 51 `/assignments`, lines 43-50 staff routes)
- Modify: `web/src/routes/landing.ts`, `web/src/pages/Forbidden.tsx`
- Test: `web/src/routes/RoleRoute.test.tsx`, `web/src/routes/landing.test.ts`, `web/src/pages/Forbidden.test.tsx`

**Interfaces:**
- Produces: `landingFor(role: Role | null): string` returns `/admin` for `admin` and `/forbidden` for every other role.
- Routes: `/admin`, `/dashboard`, `/analytics`, `/audit`, `/monitor`, `/map`, `/incidents/:id`, `/teams`, `/users` allow `['admin']` only. `/my`, `/my/report`, `/my/reports/:id`, `/assignments` are removed.
- `Forbidden` page copy for residents and responders: "Residents and rescuers use the Rescue Reports mobile app. The website is for administrators." It must not link to a dashboard.

- [ ] **Step 1: Write failing tests** in `landing.test.ts` (`landingFor('admin') === '/admin'`, `landingFor('resident') === '/forbidden'`, `landingFor('responder') === '/forbidden'`, `landingFor('dispatcher') === '/forbidden'`, `landingFor('dmo') === '/forbidden'`), and in `Forbidden.test.tsx` (the mobile-app message is shown for resident and responder, no dashboard link).

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npx vitest run src/routes src/pages/Forbidden.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement** the route changes in `App.tsx`, `landingFor` in `landing.ts`, and the copy in `Forbidden.tsx`. Remove the resident and responder page imports that become unused.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run src/routes src/pages/Forbidden.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit (only with approval)**

```bash
git add web/src/App.tsx web/src/routes web/src/pages/Forbidden.tsx web/src/pages/Forbidden.test.tsx
git commit -m "feat(web): website is administrator only; residents and rescuers use the mobile app"
```

---

### Task 7: Web queue ordering and the order statement

**Files:**
- Modify: `web/src/features/reports/useReports.ts` (line 34 `orderBy('createdAt', 'desc')` becomes `'asc'`; line 40 sort becomes oldest first with `id` tie-break)
- Modify: `web/src/features/responder/useAssignedReports.ts` (line 35)
- Modify: `web/src/features/reports/ReportQueue.tsx` (add the order statement)
- Test: `web/src/features/reports/useReports.test.ts`, `web/src/features/reports/ReportQueue.test.tsx`

**Interfaces:**
- Produces: `useReports()` returns reports sorted by `createdAt` ascending, then `id` ascending. Missing `createdAt` sorts last.
- The queue shows the text: "Oldest first. Priority does not change the order."

- [ ] **Step 1: Write failing tests**: sorted output for two reports with equal and unequal `createdAt`; a missing `createdAt` report sorts last; the queue text is present.

- [ ] **Step 2: Run to verify failure**

Run: `cd web && npx vitest run src/features/reports src/features/responder`
Expected: FAIL.

- [ ] **Step 3: Implement** the ascending order in both hooks and the statement in `ReportQueue.tsx`. Keep the same tie-break rule as the API (`id`).

- [ ] **Step 4: Run to verify pass**

Run the same command. Expected: PASS.

- [ ] **Step 5: Commit (only with approval)**

```bash
git add web/src/features/reports web/src/features/responder
git commit -m "feat(web): oldest-first queue and order statement"
```

---

### Task 8: Web validate action for administrators

**Files:**
- Modify: `web/src/features/reports/workflow.ts` (`canActOnReports` becomes `role === 'admin'`)
- Modify: `web/src/features/reports/IncidentDetails.tsx`
- Test: `web/src/features/reports/IncidentDetails.test.tsx`, `web/src/features/reports/workflow.test.ts`

**Interfaces:**
- Consumes: `PATCH /api/reports/:id/verify` returning `{ verified, status, verifiedBy: { uid, name }, verifiedAt }` (Task 3).
- The admin sees a button labeled exactly "Validate report" while the report is `Submitted`, `Under Verification`, or not yet validated. The button is disabled while the request is in flight and after success.
- After success, show "Validated by {name} on {date}". On 409, reload the report and show the saved state instead of a success message.
- Photos: the existing photo viewer stays on the page next to the button. The copy below the button reads: "Validation is a manual review. The system does not check whether a photo is authentic."

- [ ] **Step 1: Write failing tests**: button visible to admin only; hidden for dispatcher, responder, resident; a click calls the verify endpoint once; a second click while busy is blocked; 409 response reloads; validated state shows the name and date.

- [ ] **Step 2: Run to verify failure**

Run: `cd web && npx vitest run src/features/reports`
Expected: FAIL.

- [ ] **Step 3: Implement** the button and the state. Use the existing API client module already used by `IncidentDetails.tsx` for the other actions. Do not add new dependencies.

- [ ] **Step 4: Run to verify pass**

Run the same command. Expected: PASS.

- [ ] **Step 5: Commit (only with approval)**

```bash
git add web/src/features/reports
git commit -m "feat(web): admin validate report action with recorded validator"
```

---

### Task 9: Landing copy and Flutter check

**Files:**
- Modify: `web/src/pages/Landing.tsx` (copy only, where it points residents or rescuers at a website dashboard). Do not touch the uncommitted `public.css` or the login files.
- Test: `web/src/pages/Landing.test.tsx`
- Flutter: no source change expected. Check `mobile/lib` for any text that points residents or responders to the website.

- [ ] **Step 1: Write a failing test**: the landing page text does not contain "dashboard" in resident or rescuer calls to action (assert the specific phrases found by grep in Step 2).

- [ ] **Step 2: Find the copy**

Run: `cd web && grep -n -i "dashboard\|sign in" src/pages/Landing.tsx src/pages/landing.css 2>/dev/null | head -20`
Expected: a list of lines to adjust.

- [ ] **Step 3: Adjust the copy** to say residents and rescuers use the mobile app, and the website is for administrators.

- [ ] **Step 4: Run web tests and Flutter checks**

Run: `cd web && npx vitest run src/pages` and `cd mobile && flutter analyze && flutter test`
Expected: PASS. If `flutter` is not installed, say so in the report; do not claim a Flutter pass.

- [ ] **Step 5: Commit (only with approval)**

```bash
git add web/src/pages/Landing.tsx web/src/pages/Landing.test.tsx
git commit -m "copy: residents and rescuers use the mobile app"
```

---

### Task 10: Documentation matches the code

**Files:**
- Create: `docs/role-matrix.md` (role, platform, allowed actions, and the dispatcher and DMO status)
- Modify: `docs/user-guide/outline.md`, `docs/video-script.md`
- Modify: `HANDOFF.md`: keep under 60 lines; move the older items to `docs/history.md`.

**Interfaces:** none. This task has no code tests; its check is the grep in Step 2.

- [ ] **Step 1: Write the role matrix** from the spec table and the actual code (`requireRole`, `RoleRoute`), including the dispatcher and DMO rows: accounts kept, website access disabled, functions moved to admin.

- [ ] **Step 2: Check for leftovers**

Run: `grep -rn -i "dispatcher\|dmo\|resident dashboard\|/assignments" docs/user-guide docs/video-script.md HANDOFF.md`
Expected: remaining mentions are historical or explicitly marked as retired. Fix the rest.

- [ ] **Step 3: Update the slide outline and script** to cover: purpose and users; stack and architecture; database structure; resident submission (mobile); chronological admin queue and manual validation; assignment and responder updates; tracking and completion; testing, challenges and solutions. Mark any synthetic narration. Leave "live presentation required?" marked unresolved.

- [ ] **Step 4: Trim `HANDOFF.md`** to 60 lines or fewer, with a "Start here" section for this change. Move the older content to `docs/history.md`.

Run: `wc -l HANDOFF.md`
Expected: 60 or fewer.

- [ ] **Step 5: Commit (only with approval)**

```bash
git add docs HANDOFF.md
git commit -m "docs: role matrix, slide outline and handoff for professor clarification"
```

---

### Task 11: Full verification

**Files:** none changed.

- [ ] **Step 1: API tests**

Run: `cd api && npm test`
Expected: all pass. Report the exact counts.

- [ ] **Step 2: Web tests, typecheck, build**

Run: `cd web && npm test && npx tsc --noEmit && npm run build`
Expected: all pass. Report the exact counts.

- [ ] **Step 3: Rules tests** (emulator): `cd firebase && npm test`
Expected: PASS.

- [ ] **Step 4: Flutter** (if available): `cd mobile && flutter analyze && flutter test`
Expected: PASS. If not run, say so.

- [ ] **Step 5: Emulator browser check** on the demo emulator (`firebase/firebase.demo.json`, ports 8190 and 9299): admin sees the oldest-first queue and can validate once; a dispatcher or DMO demo account is refused; resident and responder web routes show the mobile-app message.
Expected: observed results recorded. Do not claim anything about the live site.

- [ ] **Step 6: Report** what passed, what was not run (APK, live Render and Vercel, device), and the open question about the live presentation. Stop before any commit, push, or deploy and ask Airen to approve.

---

## Execution

Native execution is recommended: the tasks share files and interfaces (Task 1 feeds Task 2, Task 3 feeds Task 8), there are eleven tasks, and a mistake in the role changes would reach production if deployed. Subagents add cost without much independent review value at this size. Airen to confirm before implementation starts.
