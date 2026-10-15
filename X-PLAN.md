# Disaster Rescue Reporting and Monitoring System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web (React) and mobile (Flutter) disaster rescue reporting system on an Express API with Firebase, covering all 15 functional requirements and 4 roles.

**Architecture:** An Express API is the only writer of important data. It verifies Firebase ID tokens, enforces roles and the status workflow, writes audit logs, flags duplicates, sends notifications, uploads photos to Cloudinary, and builds exports. Web and Flutter read live from Firestore through role-scoped security rules and write only through the API. Pure business rules live in `api/src/domain/` with no Firebase imports, so they are fully unit-testable.

**Tech Stack:** Node 22 (ESM), Express, firebase-admin, multer, cloudinary, zod, pdfkit, helmet, express-rate-limit, vitest, supertest. React + Vite, Leaflet, Recharts. Flutter, flutter_map, firebase_auth, cloud_firestore, firebase_messaging, geolocator, image_picker.

**Spec:** `X-SPEC.md` (approved 2026-10-15). Executors read both files.

## Global Constraints

- Node 22, ESM (`"type": "module"`). API tests use vitest and supertest. No test hits real Firebase or Cloudinary; they use in-memory fakes.
- Roles, exactly: `resident`, `dispatcher`, `responder`, `dmo`.
- Statuses, exactly: `Submitted`, `Under Verification`, `Verified`, `Awaiting Assignment`, `Team Assigned`, `Rescue in Progress`, `Resolved`, `Closed`, `Rejected`, `Duplicate`, `Cancelled`.
- Priorities, exactly: `low`, `medium`, `high`, `critical`. Types: `flood`, `fire`, `earthquake`, `landslide`, `other`.
- Photos: max 5 per report, max 5 MB each, JPEG, PNG, WebP, checked by file signature.
- Duplicate radius 200 m, window 6 hours, same type, open reports only. Coarse location rounded to 0.005 degrees (about 500 m).
- Illegal status transition returns HTTP 409. Wrong role returns 403. Unknown or not-visible report returns 404.
- Palette: background `#F6F1EA`, primary teal `#0F6B66`, coral `#C83919` only for critical and the main emergency action. Status never shown by color alone. 44 px minimum touch targets, WCAG AA contrast.
- No em dashes in any user-facing text. Disclaimer text, exact: "Submitting a report through this app does not automatically guarantee immediate rescue. If you are in danger, call your local emergency hotline."
- Flutter style handoff file does NOT apply. Commit after each task. Update `HANDOFF.md` and commit at the end of each phase.
- Cannot be verified in this environment and must be reported as unchecked: Flutter on a physical phone, push on a real device, GPS accuracy.

## Review Focus

Failure modes the spec implies that no feature task would otherwise test. Each is pinned to a test in the owning task.

1. Latitude or longitude that is a string, NaN, or out of range arrives at `POST /reports`. Expected: 400, nothing saved. (Task 7)
2. A photo whose extension says `.jpg` but whose bytes are not an image, a zero-byte file, or a sixth photo. Expected: 400, nothing uploaded. (Task 4, Task 7)
3. A resident requests another resident's report by id. Expected: 404, not 403, so existence does not leak. (Task 8)
4. Two dispatchers act on the same report at once (both assign, or verify and reject). Expected: the second gets 409, not a silent overwrite. (Task 13)
5. FCM fails or a device token is stale while a report is submitted or updated. Expected: the report still succeeds, the in-app notification is still stored, the stale token is removed. (Task 14)
6. A deactivated user still holds a valid token. Expected: 403 on every API call. (Task 2)
7. Description containing HTML or script tags. Expected: stored as plain text, tags stripped. (Task 7)

---

## File Structure

```
api/
  package.json, vitest.config.js, .env.example
  src/
    server.js                 start HTTP server
    app.js                    buildApp(deps): wires middleware and routes
    config.js                 env parsing
    errors.js                 HttpError(status, code, message)
    domain/                   pure logic, no Firebase
      workflow.js             STATUS, canTransition, assertTransition
      duplicates.js           haversineMeters, findPossibleDuplicates
      privacy.js              coarsen, projectReportForRole
      validation.js           sniffImageType, validatePhotos, sanitizeText, parseReportInput
    middleware/
      auth.js                 requireAuth, requireRole
      upload.js               multer in-memory config
      errorHandler.js
    ports/                    interfaces consumed by services (documented in JSDoc)
    adapters/
      firestoreRepo.js        real repo (firebase-admin)
      cloudinaryUploader.js
      fcmSender.js
    services/
      auditService.js, reportService.js, assignmentService.js,
      notificationService.js, statsService.js, exportService.js, userService.js
    routes/
      users.js, reports.js, teams.js, notifications.js, stats.js, audit.js, export.js
  test/
    fakes/ memoryRepo.js, fakeUploader.js, fakeSender.js, testApp.js
    domain/*.test.js, routes/*.test.js
firebase/
  firestore.rules, firestore.indexes.json, rules.test.js, seed.js
web/                          React + Vite
  src/ theme/tokens.css, api/client.js, auth/, routes/, features/{reports,teams,users,map,analytics,audit,responder}/
mobile/                       Flutter
  lib/ theme/, auth/, features/{report,my_reports,map,notifications,profile,responder}/, data/
docs/
  design-tokens/tokens.json   source of truth for colors, radii, type scale
  schema.md, user-guide/, video-script.md, contributions.md, privacy-and-coordination.md
```

---

# PHASE 1: Foundation

### Task 1: Repo scaffold and design tokens

**Files:**
- Create: `api/package.json`, `api/vitest.config.js`, `api/.env.example`, `docs/design-tokens/tokens.json`, `web/src/theme/tokens.css`, `README.md`
- Modify: `.gitignore` (already has node_modules, .env)

**Interfaces:**
- Produces: `docs/design-tokens/tokens.json` with keys `color.bg`, `color.primary`, `color.critical`, `color.high`, `color.medium`, `color.low`, `radius.md`, `radius.lg`, `space.touch`. Web and Flutter copy these exact values.

- [ ] **Step 1: Create `api/package.json`**

```json
{
  "name": "disaster-rescue-api",
  "private": true,
  "type": "module",
  "scripts": { "dev": "node --watch src/server.js", "start": "node src/server.js", "test": "vitest run" },
  "dependencies": {
    "cloudinary": "^2.5.0", "cors": "^2.8.5", "express": "^4.21.0", "express-rate-limit": "^7.4.0",
    "firebase-admin": "^13.0.0", "helmet": "^8.0.0", "multer": "^1.4.5-lts.1", "pdfkit": "^0.15.0", "zod": "^3.23.0"
  },
  "devDependencies": { "supertest": "^7.0.0", "vitest": "^2.1.0" }
}
```

- [ ] **Step 2: Create `docs/design-tokens/tokens.json`**

```json
{
  "color": { "bg": "#F6F1EA", "surface": "#FFFFFF", "primary": "#0F6B66", "primarySoft": "#EEF3F2",
    "critical": "#C83919", "high": "#9E5A00", "medium": "#0F6B66", "low": "#5F6B6A", "text": "#1D2B2A", "muted": "#566665" },
  "radius": { "md": 12, "lg": 20 },
  "space": { "touch": 44 }
}
```

- [ ] **Step 3: Create `web/src/theme/tokens.css`** with the same values as CSS variables (`--color-bg: #F6F1EA;` and so on).

- [ ] **Step 4: Verify contrast.** Run the antislop contrast check (or any WCAG calculator) for text on bg, white on primary, white on critical, high on white. Fix any pair below 4.5:1 in both `tokens.json` and `tokens.css`. (`#C77700` on white is a candidate to darken.)

- [ ] **Step 5: Run `cd api && npm install && npx vitest run`.** Expected: "No test files found", exit 0 with `--passWithNoTests` added to the `test` script.

- [ ] **Step 6: Commit** `git add -A && git commit -m "chore: scaffold api and design tokens"`

### Task 2: Auth and role middleware, error type

**Files:**
- Create: `api/src/errors.js`, `api/src/middleware/auth.js`, `api/src/middleware/errorHandler.js`
- Test: `api/test/routes/auth.test.js`

**Interfaces:**
- Produces: `HttpError(status, code, message)`; `requireAuth(verifyToken)` where `verifyToken(token) => Promise<{uid, role, active}>` and sets `req.user = {uid, role, active}`; `requireRole(...roles)`; `errorHandler` returning `{error: code, message}`.

- [ ] **Step 1: Write the failing test** `api/test/routes/auth.test.js`

```js
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { requireAuth, requireRole } from '../../src/middleware/auth.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';

const tokens = {
  res: { uid: 'u1', role: 'resident', active: true },
  dis: { uid: 'u2', role: 'dispatcher', active: true },
  off: { uid: 'u3', role: 'dispatcher', active: false },
};
const verify = async (t) => { if (!tokens[t]) throw new Error('bad'); return tokens[t]; };
const app = express();
app.get('/who', requireAuth(verify), (req, res) => res.json(req.user));
app.get('/admin', requireAuth(verify), requireRole('dispatcher'), (req, res) => res.json({ ok: true }));
app.use(errorHandler);

describe('auth', () => {
  it('401 without token', async () => { expect((await request(app).get('/who')).status).toBe(401); });
  it('401 with bad token', async () => { expect((await request(app).get('/who').set('Authorization', 'Bearer nope')).status).toBe(401); });
  it('200 with good token', async () => {
    const r = await request(app).get('/who').set('Authorization', 'Bearer res');
    expect(r.status).toBe(200); expect(r.body.role).toBe('resident');
  });
  it('403 wrong role', async () => { expect((await request(app).get('/admin').set('Authorization', 'Bearer res')).status).toBe(403); });
  it('200 right role', async () => { expect((await request(app).get('/admin').set('Authorization', 'Bearer dis')).status).toBe(200); });
  it('403 for deactivated user with valid token', async () => {
    const r = await request(app).get('/admin').set('Authorization', 'Bearer off');
    expect(r.status).toBe(403); expect(r.body.error).toBe('account_disabled');
  });
});
```

- [ ] **Step 2: Run** `cd api && npx vitest run test/routes/auth.test.js`. Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`api/src/errors.js`:
```js
export class HttpError extends Error {
  constructor(status, code, message = code) { super(message); this.status = status; this.code = code; }
}
```
`api/src/middleware/auth.js`:
```js
export function requireAuth(verifyToken) {
  return async (req, res, next) => {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
    if (!m) return res.status(401).json({ error: 'missing_token' });
    let d;
    try { d = await verifyToken(m[1]); } catch { return res.status(401).json({ error: 'invalid_token' }); }
    if (d.active === false) return res.status(403).json({ error: 'account_disabled' });
    req.user = { uid: d.uid, role: d.role ?? null, active: true };
    next();
  };
}
export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : res.status(403).json({ error: 'forbidden' });
```
`api/src/middleware/errorHandler.js`:
```js
export function errorHandler(err, req, res, next) {
  if (err?.status) return res.status(err.status).json({ error: err.code, message: err.message });
  console.error(err);
  res.status(500).json({ error: 'internal_error' });
}
```
- [ ] **Step 4: Run the test.** Expected: 6 passed.
- [ ] **Step 5: Commit** `git commit -am "feat(api): auth and role middleware"`

### Task 3: Status workflow (pure domain)

**Files:**
- Create: `api/src/domain/workflow.js`
- Test: `api/test/domain/workflow.test.js`

**Interfaces:**
- Produces: `STATUS` (frozen map of the 11 status strings), `canTransition(from, to, role) => boolean`, `assertTransition(from, to, role)` throwing `HttpError(409,'illegal_transition')` when the edge does not exist for anyone, and `HttpError(403,'forbidden')` when the edge exists but not for that role. `isOpen(status)` true for every status except `Closed`, `Rejected`, `Duplicate`, `Cancelled`.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import { STATUS as S, canTransition, assertTransition, isOpen } from '../../src/domain/workflow.js';

describe('workflow', () => {
  it('allows the happy path with the right roles', () => {
    expect(canTransition(S.SUBMITTED, S.UNDER_VERIFICATION, 'dispatcher')).toBe(true);
    expect(canTransition(S.UNDER_VERIFICATION, S.VERIFIED, 'dispatcher')).toBe(true);
    expect(canTransition(S.VERIFIED, S.AWAITING_ASSIGNMENT, 'dispatcher')).toBe(true);
    expect(canTransition(S.AWAITING_ASSIGNMENT, S.TEAM_ASSIGNED, 'dispatcher')).toBe(true);
    expect(canTransition(S.TEAM_ASSIGNED, S.IN_PROGRESS, 'responder')).toBe(true);
    expect(canTransition(S.IN_PROGRESS, S.RESOLVED, 'responder')).toBe(true);
    expect(canTransition(S.RESOLVED, S.CLOSED, 'dispatcher')).toBe(true);
  });
  it('lets a resident cancel only from Submitted', () => {
    expect(canTransition(S.SUBMITTED, S.CANCELLED, 'resident')).toBe(true);
    expect(canTransition(S.VERIFIED, S.CANCELLED, 'resident')).toBe(false);
  });
  it('rejects only from Submitted or Under Verification', () => {
    expect(canTransition(S.SUBMITTED, S.REJECTED, 'dispatcher')).toBe(true);
    expect(canTransition(S.UNDER_VERIFICATION, S.REJECTED, 'dispatcher')).toBe(true);
    expect(canTransition(S.VERIFIED, S.REJECTED, 'dispatcher')).toBe(false);
  });
  it('409 on skipped steps', () => {
    expect(() => assertTransition(S.SUBMITTED, S.RESOLVED, 'dispatcher')).toThrow(expect.objectContaining({ status: 409 }));
  });
  it('403 when edge exists but role is wrong', () => {
    expect(() => assertTransition(S.TEAM_ASSIGNED, S.IN_PROGRESS, 'resident')).toThrow(expect.objectContaining({ status: 403 }));
  });
  it('dmo can never transition', () => {
    for (const to of Object.values(S)) expect(canTransition(S.SUBMITTED, to, 'dmo')).toBe(false);
  });
  it('terminal states have no exits', () => {
    for (const from of [S.CLOSED, S.REJECTED, S.DUPLICATE, S.CANCELLED])
      for (const to of Object.values(S)) expect(canTransition(from, to, 'dispatcher')).toBe(false);
  });
  it('isOpen', () => { expect(isOpen(S.VERIFIED)).toBe(true); expect(isOpen(S.CLOSED)).toBe(false); });
});
```

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement `api/src/domain/workflow.js`**

```js
import { HttpError } from '../errors.js';

export const STATUS = Object.freeze({
  SUBMITTED: 'Submitted', UNDER_VERIFICATION: 'Under Verification', VERIFIED: 'Verified',
  AWAITING_ASSIGNMENT: 'Awaiting Assignment', TEAM_ASSIGNED: 'Team Assigned',
  IN_PROGRESS: 'Rescue in Progress', RESOLVED: 'Resolved', CLOSED: 'Closed',
  REJECTED: 'Rejected', DUPLICATE: 'Duplicate', CANCELLED: 'Cancelled',
});
const S = STATUS;
const EDGES = [
  [S.SUBMITTED, S.UNDER_VERIFICATION, ['dispatcher']],
  [S.SUBMITTED, S.REJECTED, ['dispatcher']],
  [S.SUBMITTED, S.DUPLICATE, ['dispatcher']],
  [S.SUBMITTED, S.CANCELLED, ['resident']],
  [S.UNDER_VERIFICATION, S.VERIFIED, ['dispatcher']],
  [S.UNDER_VERIFICATION, S.REJECTED, ['dispatcher']],
  [S.UNDER_VERIFICATION, S.DUPLICATE, ['dispatcher']],
  [S.VERIFIED, S.AWAITING_ASSIGNMENT, ['dispatcher']],
  [S.AWAITING_ASSIGNMENT, S.TEAM_ASSIGNED, ['dispatcher']],
  [S.TEAM_ASSIGNED, S.IN_PROGRESS, ['responder']],
  [S.IN_PROGRESS, S.RESOLVED, ['responder']],
  [S.RESOLVED, S.CLOSED, ['dispatcher']],
];
const find = (from, to) => EDGES.find(([f, t]) => f === from && t === to);
export const canTransition = (from, to, role) => !!find(from, to)?.[2].includes(role);
export function assertTransition(from, to, role) {
  const e = find(from, to);
  if (!e) throw new HttpError(409, 'illegal_transition', `Cannot move from ${from} to ${to}`);
  if (!e[2].includes(role)) throw new HttpError(403, 'forbidden', `Role ${role} cannot make this change`);
}
const CLOSED_SET = new Set([S.CLOSED, S.REJECTED, S.DUPLICATE, S.CANCELLED]);
export const isOpen = (status) => !CLOSED_SET.has(status);
```

- [ ] **Step 4: Run, expect all pass.**
- [ ] **Step 5: Commit** `git commit -am "feat(api): status workflow"`

### Task 4: Privacy, duplicates, validation (pure domain)

**Files:**
- Create: `api/src/domain/privacy.js`, `api/src/domain/duplicates.js`, `api/src/domain/validation.js`
- Test: `api/test/domain/privacy.test.js`, `duplicates.test.js`, `validation.test.js`

**Interfaces:**
- Produces:
  - `coarsen(lat, lng) => {lat, lng}` rounded to nearest 0.005.
  - `projectReportForRole(report, role, uid) => object | null`: dispatcher and dmo get everything; responder gets everything only if `report.assignedTeamId === user team` (caller passes `teamId` as 4th arg); reporter gets own report fully; anyone else gets `{id, type, status, priority, coarseLocation, createdAt}` or `null` for non-public statuses (`Submitted`, `Under Verification`, `Rejected`, `Cancelled`, `Duplicate`). Contact info and exact `location` are removed in the public projection.
  - `haversineMeters(a, b)`; `findPossibleDuplicates(report, openReports, {radiusM=200, windowHours=6}) => string[]` of ids.
  - `sniffImageType(buffer) => 'image/jpeg'|'image/png'|'image/webp'|null`; `validatePhotos(files) => void` throws `HttpError(400, ...)` for count over 5, empty, over 5 MB, or unknown signature; `sanitizeText(s, max) => string` strips tags and control chars and trims; `parseReportInput(body) => {type, description, lat, lng, source, addressText, contact}` using zod, throws `HttpError(400, 'invalid_input')`.

- [ ] **Step 1: Write failing tests (key cases; each file small)**

```js
// validation.test.js
import { describe, it, expect } from 'vitest';
import { sniffImageType, validatePhotos, sanitizeText, parseReportInput } from '../../src/domain/validation.js';
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP')]);
const f = (buffer) => ({ buffer, size: buffer.length, originalname: 'a.jpg' });

describe('sniffImageType', () => {
  it('detects real types', () => {
    expect(sniffImageType(JPEG)).toBe('image/jpeg');
    expect(sniffImageType(PNG)).toBe('image/png');
    expect(sniffImageType(WEBP)).toBe('image/webp');
  });
  it('rejects fakes', () => { expect(sniffImageType(Buffer.from('MZ\x90\x00exe'))).toBeNull(); });
});
describe('validatePhotos', () => {
  it('accepts up to 5 valid photos', () => { expect(() => validatePhotos([f(JPEG), f(PNG)])).not.toThrow(); });
  it('rejects a sixth photo', () => { expect(() => validatePhotos(Array(6).fill(f(JPEG)))).toThrow(expect.objectContaining({ status: 400 })); });
  it('rejects zero-byte file', () => { expect(() => validatePhotos([f(Buffer.alloc(0))])).toThrow(); });
  it('rejects fake .jpg', () => { expect(() => validatePhotos([f(Buffer.from('MZ\x90\x00'))])).toThrow(); });
  it('rejects over 5 MB', () => {
    const big = { buffer: JPEG, size: 5 * 1024 * 1024 + 1, originalname: 'a.jpg' };
    expect(() => validatePhotos([big])).toThrow();
  });
});
describe('sanitizeText', () => {
  it('strips tags', () => { expect(sanitizeText('<script>x()</script>Help <b>now</b>', 500)).toBe('x()Help now'); });
  it('limits length', () => { expect(sanitizeText('a'.repeat(900), 500)).toHaveLength(500); });
});
describe('parseReportInput', () => {
  const ok = { type: 'flood', description: 'Water rising', lat: '14.85', lng: '120.81', source: 'gps', contact: { name: 'Ana', phone: '09171234567' } };
  it('parses numeric strings from multipart', () => { expect(parseReportInput(ok).lat).toBeCloseTo(14.85); });
  it.each([['abc', '120'], ['NaN', '120'], ['91', '120'], ['14', '181'], ['', '120']])('rejects lat=%s lng=%s', (lat, lng) => {
    expect(() => parseReportInput({ ...ok, lat, lng })).toThrow(expect.objectContaining({ status: 400 }));
  });
  it('rejects unknown type', () => { expect(() => parseReportInput({ ...ok, type: 'zombie' })).toThrow(); });
});
```
```js
// duplicates.test.js
import { describe, it, expect } from 'vitest';
import { haversineMeters, findPossibleDuplicates } from '../../src/domain/duplicates.js';
const now = new Date('2026-10-20T10:00:00Z');
const mk = (id, over = {}) => ({ id, type: 'flood', location: { lat: 14.85, lng: 120.81 }, createdAt: new Date('2026-10-20T08:00:00Z'), status: 'Submitted', ...over });
describe('duplicates', () => {
  it('distance sanity: 0.001 deg lat is about 111 m', () => {
    expect(haversineMeters({ lat: 14, lng: 120 }, { lat: 14.001, lng: 120 })).toBeGreaterThan(105);
    expect(haversineMeters({ lat: 14, lng: 120 }, { lat: 14.001, lng: 120 })).toBeLessThan(118);
  });
  it('flags same type, near, recent, open', () => {
    expect(findPossibleDuplicates(mk('new', { createdAt: now }), [mk('a')])).toEqual(['a']);
  });
  it('ignores other type, far, old, closed, and itself', () => {
    const n = mk('new', { createdAt: now });
    const others = [mk('t', { type: 'fire' }), mk('far', { location: { lat: 14.86, lng: 120.81 } }),
      mk('old', { createdAt: new Date('2026-10-19T00:00:00Z') }), mk('c', { status: 'Closed' }), mk('new')];
    expect(findPossibleDuplicates(n, others)).toEqual([]);
  });
});
```
```js
// privacy.test.js
import { describe, it, expect } from 'vitest';
import { coarsen, projectReportForRole } from '../../src/domain/privacy.js';
const r = { id: 'r1', type: 'flood', status: 'Verified', priority: 'high', reporterId: 'u1', assignedTeamId: 't1',
  location: { lat: 14.8527, lng: 120.8163 }, coarseLocation: { lat: 14.855, lng: 120.815 },
  contact: { name: 'Ana', phone: '0917' }, createdAt: 1 };
describe('privacy', () => {
  it('coarsen rounds to 0.005', () => { expect(coarsen(14.8527, 120.8163)).toEqual({ lat: 14.855, lng: 120.815 }); });
  it('dispatcher and dmo see everything', () => {
    expect(projectReportForRole(r, 'dispatcher', 'd1')).toEqual(r);
    expect(projectReportForRole(r, 'dmo', 'm1')).toEqual(r);
  });
  it('reporter sees own report fully', () => { expect(projectReportForRole(r, 'resident', 'u1')).toEqual(r); });
  it('assigned responder sees it, other team does not', () => {
    expect(projectReportForRole(r, 'responder', 'x', 't1')).toEqual(r);
    expect(projectReportForRole(r, 'responder', 'x', 't2')).toBeNull();
  });
  it('other resident gets public projection without contact or exact location', () => {
    const p = projectReportForRole(r, 'resident', 'u2');
    expect(p).toEqual({ id: 'r1', type: 'flood', status: 'Verified', priority: 'high', coarseLocation: r.coarseLocation, createdAt: 1 });
    expect(p.contact).toBeUndefined(); expect(p.location).toBeUndefined();
  });
  it('other resident gets null for unverified reports', () => {
    expect(projectReportForRole({ ...r, status: 'Submitted' }, 'resident', 'u2')).toBeNull();
  });
});
```

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement the three modules** to satisfy the interfaces above. Required details: zod schema for `parseReportInput` coerces `lat`/`lng` with `z.coerce.number().finite()` after rejecting empty strings, bounds lat -90..90 and lng -180..180, `type` enum, `source` enum `gps|manual`, `description` via `sanitizeText(…, 1000)` min 3, `contact.name` max 100, `contact.phone` regex `^[0-9+()\-\s]{7,20}$`. `sniffImageType` checks magic bytes (`FF D8 FF`, `89 50 4E 47 0D 0A 1A 0A`, `RIFF....WEBP`). `sanitizeText` removes `<[^>]*>` and `[\u0000-\u0008\u000B\u000C\u000E-\u001F]`. Public statuses for non-owners: `Verified`, `Awaiting Assignment`, `Team Assigned`, `Rescue in Progress`, `Resolved`.
- [ ] **Step 4: Run all domain tests, expect pass.**
- [ ] **Step 5: Commit** `git commit -am "feat(api): privacy, duplicate detection, validation"`

### Task 5: Repository port, in-memory fake, audit service

**Files:**
- Create: `api/test/fakes/memoryRepo.js`, `fakeUploader.js`, `fakeSender.js`, `api/src/services/auditService.js`, `api/src/adapters/firestoreRepo.js`
- Test: `api/test/services/audit.test.js`

**Interfaces:**
- Produces: repo port (same methods on fake and Firestore adapter):
  - `getReport(id)`, `listReports(filter)` where filter is `{reporterId?, assignedTeamId?, status?, type?, from?, to?}`, `listOpenReports()`, `createReport(data) => id`
  - `updateReportIf(id, expectedStatus, patch) => boolean` (atomic compare-and-set on `status`; Firestore adapter uses a transaction). Returns false if the current status is not `expectedStatus`.
  - `addUpdate(reportId, update)`, `listUpdates(reportId)`
  - `getUser(uid)`, `createUser(uid, data)`, `updateUser(uid, patch)`, `listUsers()`
  - `getTeam(id)`, `listTeams()`, `saveTeam(id|null, data) => id`
  - `addNotification(n)`, `listNotifications(uid)`, `markRead(id, uid)`
  - `addDevice(uid, token)`, `listDevices(uid)`, `removeDevice(token)`
  - `addAudit(entry)`, `listAudit(filter)`
  - `getHotlines()`
- `auditService.record(repo, {actorUid, action, reportId, before, after}) => Promise<void>` adds `at: new Date()`.
- `fakeUploader.upload(files) => [{url, sizeBytes, mimeType}]`; `fakeSender.send(tokens, payload) => {failedTokens: string[]}` with a configurable failure list.

- [ ] **Step 1: Write the failing test** that `record` stores an entry with the actor, action, before and after, and a Date `at`, and that `updateReportIf` returns false when the status differs and true (and applies the patch) when it matches.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** the fake repo with Maps, `auditService`, and `firestoreRepo.js` using firebase-admin (`runTransaction` for `updateReportIf`; collections as in spec section 4; Firestore Timestamps converted to JS Dates on read).
- [ ] **Step 4: Run, expect pass.** The Firestore adapter is verified later by the emulator test in Task 6 and by the manual walkthrough.
- [ ] **Step 5: Commit** `git commit -am "feat(api): repo port, fakes, audit service"`

### Task 6: Firebase project, security rules, seed script

**Files:**
- Create: `firebase/firestore.rules`, `firebase/firestore.indexes.json`, `firebase/rules.test.js`, `firebase/seed.js`, `firebase.json`, `docs/firebase-setup.md`

**Interfaces:**
- Consumes: role custom claim `role` and `active` on the ID token.
- Produces: seeded accounts `resident@test.dev`, `dispatcher@test.dev`, `responder@test.dev`, `dmo@test.dev` (password documented in `docs/firebase-setup.md`, test only), a team `Team Alpha` with the responder, and `config/hotlines`.

- [ ] **Step 1: Manual (Airen):** create a Firebase project on the Spark plan, enable Email/Password auth, create a Firestore database, download a service account key to `api/serviceAccount.json` (gitignored; add to `.gitignore`), create a free Cloudinary account and put the three keys in `api/.env`. Record the steps in `docs/firebase-setup.md`.
- [ ] **Step 2: Write failing rules tests** with `@firebase/rules-unit-testing` against the emulator: a resident can read own report and cannot read another's; no client can write `reports` or `auditLogs`; responder reads only reports where `assignedTeamId` equals their `team` claim; dispatcher and dmo read all; a user with `active == false` reads nothing.
- [ ] **Step 3: Write `firestore.rules`** implementing those rules (helper functions `role()`, `isActive()`, `signedIn()`; `allow write: if false` on reports, updates, notifications, teams, auditLogs; `users/{uid}` readable by self and dispatcher; `notifications` readable only by `recipientUid`).
- [ ] **Step 4: Run** `npx firebase emulators:exec --only firestore "node --test firebase/rules.test.js"`. Expected: all pass.
- [ ] **Step 5: Write `seed.js`** (creates auth users with claims, a team, hotlines such as 911 and a placeholder LDRRMO number marked as editable) and run it once against the real project.
- [ ] **Step 6: Commit** `git commit -m "feat(firebase): rules, indexes, seed"`

**Phase 1 end:** update `HANDOFF.md`, commit.

---

# PHASE 2: Core report flow

### Task 7: `POST /reports`

**Files:**
- Create: `api/src/app.js`, `api/src/middleware/upload.js`, `api/src/services/reportService.js`, `api/src/routes/reports.js`, `api/test/fakes/testApp.js`
- Test: `api/test/routes/reports.create.test.js`

**Interfaces:**
- Consumes: `parseReportInput`, `validatePhotos`, `coarsen`, `findPossibleDuplicates`, `STATUS`, `auditService.record`, repo port, uploader port, notification service (`notifyRole(role, payload)` from Task 14; until then a no-op injected in `testApp`).
- Produces: `buildApp({repo, uploader, sender, verifyToken})` returning an Express app; `reportService.create(deps, user, input, files) => {id, status, reference}` where `reference` is `DR-` plus a 6-char uppercase base36 string; route `POST /api/reports` (resident only, multipart fields `type, description, lat, lng, source, addressText, contactName, contactPhone`, files `photos`).
- `testApp.js` exports `makeTestApp()` returning `{app, repo, uploader, sender, as(role, uid?)}` where `as()` yields an `Authorization` header value.

- [ ] **Step 1: Write failing tests** covering: 201 with `{id, status: 'Submitted', reference}` and a stored report with `coarseLocation`, `verified: false`, `priority: 'medium'`; uploaded photo URLs saved; `possibleDuplicates` populated when a near same-type open report exists and the response is still 201; 400 and zero repo writes and zero uploads for lat `'abc'`, lat `'95'`, a fake-JPEG photo, and 6 photos (Review Focus 1 and 2); description `<script>alert(1)</script>Flood` stored as `alert(1)Flood` (Review Focus 7); 403 for a dispatcher posting; 401 without token; an audit entry `report.create` exists.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.** `create` order matters: parse input, validate photos (both before any side effect), upload, build the report, find duplicates against `repo.listOpenReports()`, `repo.createReport`, record audit, then notify dispatchers inside a try/catch that logs and never throws. The route uses `multer({storage: memoryStorage(), limits: {fileSize: 5*1024*1024, files: 5}})`; map multer limit errors to 400.
- [ ] **Step 4: Run, expect pass.**
- [ ] **Step 5: Commit** `git commit -am "feat(api): create report with photos and duplicate flag"`

### Task 8: Read and review endpoints

**Files:**
- Modify: `api/src/routes/reports.js`, `api/src/services/reportService.js`
- Test: `api/test/routes/reports.review.test.js`

**Interfaces:**
- Produces (all under `/api/reports`): `GET /` (scoped list via `projectReportForRole`, filters `status,type,priority,verified` on query), `GET /:id` (404 when the projection is null), `PATCH /:id/verify` (from Submitted or Under Verification: records Under Verification if needed, then Verified, then Awaiting Assignment; each step audited; sets `verified: true`), `PATCH /:id/priority` `{priority}`, `PATCH /:id/classify` `{classification}`, `PATCH /:id/reject` `{reason}` (reason required, 400 if blank), `PATCH /:id/duplicate` `{duplicateOf}` (must exist, not self), `PATCH /:id/cancel` (resident owner, Submitted only). All writes use `repo.updateReportIf` and respond 409 when it returns false.

- [ ] **Step 1: Write failing tests:** resident A gets 404 (not 403) for resident B's Submitted report (Review Focus 3); public projection for verified reports hides contact and exact location; verify from Submitted ends at `Awaiting Assignment` with `verified: true` and three audit entries (`status.change` twice plus `report.verify`); reject without reason is 400; duplicate of itself is 400; priority change audited with before and after; resident cancel works only while Submitted and only for own report; dmo gets 403 on every PATCH.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** with `assertTransition` from the workflow module on every status change and a notification to the reporter on verify, reject, duplicate, and cancel (non-throwing).
- [ ] **Step 4: Run all API tests, expect pass.**
- [ ] **Step 5: Commit** `git commit -am "feat(api): report review endpoints"`

### Task 9: Web foundation

**Files:**
- Create: `web/` (Vite React app), `web/src/api/client.js`, `web/src/auth/AuthProvider.jsx`, `web/src/routes/RoleRoute.jsx`, `web/src/features/auth/LoginPage.jsx`, `web/src/layout/AppShell.jsx`
- Test: `web/src/api/client.test.js`, `web/src/routes/RoleRoute.test.jsx` (vitest and Testing Library)

**Interfaces:**
- Produces: `api(path, {method, body})` attaches the Firebase ID token and throws `{status, code}` on non-2xx; `useAuth() => {user, role, loading, login, logout}` (role read from token claims); `<RoleRoute allow={['dispatcher']}>` redirects to `/login` when signed out and to `/forbidden` when the role is not allowed. Landing route by role: dispatcher to `/dashboard`, dmo to `/monitor`, responder to `/assignments`; residents see a message pointing to the mobile app.
- [ ] **Step 1: Write failing tests** for `api()` (adds Bearer header, throws on 409 with code) and `RoleRoute` (redirect cases).
- [ ] **Step 2: Run, expect FAIL.** `cd web && npx vitest run`
- [ ] **Step 3: Implement** the above, plus the app shell using tokens.css (sidebar, top bar, disclaimer text in the footer of the login page).
- [ ] **Step 4: Run tests and `npm run build`.** Expected: pass, build succeeds.
- [ ] **Step 5: Manual smoke:** `npm run dev`, log in as `dispatcher@test.dev`, land on the dashboard shell.
- [ ] **Step 6: Commit** `git commit -am "feat(web): auth, role routing, shell"`

### Task 10: Web dispatcher queue and incident details

**Files:**
- Create: `web/src/features/reports/ReportQueue.jsx`, `IncidentDetails.jsx`, `StatusBadge.jsx`, `PriorityBadge.jsx`, `useReports.js` (Firestore `onSnapshot`)
- Test: `web/src/features/reports/StatusBadge.test.jsx`, `IncidentDetails.test.jsx`

**Interfaces:**
- Consumes: `api()`, Firestore listeners, endpoints from Task 8.
- Produces: queue with filters (status, type, priority, verified), a Verified/Pending badge (FR-15), possible-duplicate banner with side-by-side compare and a "Mark duplicate" button (FR-14), and incident details actions: Verify, Reject (reason dialog), Set priority, Classify. `StatusBadge` renders label plus icon, never color alone.
- [ ] **Step 1: Write failing tests:** `StatusBadge` shows the status text for all 11 statuses; `IncidentDetails` shows Verify only when status is Submitted or Under Verification, shows no actions for dmo, shows the duplicate banner when `possibleDuplicates` is non-empty, and the Reject button stays disabled until a reason is typed.
- [ ] **Step 2: Run, expect FAIL. Step 3: Implement. Step 4: Run, expect pass.**
- [ ] **Step 5: Manual:** with the API and seed data, submit a report with curl, see it appear live, verify it, see the status update without refresh.
- [ ] **Step 6: Commit** `git commit -am "feat(web): report queue and incident details"`

### Task 11: Flutter foundation

**Files:**
- Create: `mobile/` via `flutter create`, `lib/theme/app_theme.dart`, `lib/data/api_client.dart`, `lib/auth/auth_repository.dart`, `lib/auth/role_gate.dart`, `lib/features/auth/login_page.dart`, `register_page.dart`, `lib/main.dart`
- Test: `mobile/test/theme_test.dart`, `api_client_test.dart`, `role_gate_test.dart`

**Interfaces:**
- Produces: `AppTheme.light` built from `tokens.json` values; `ApiClient.send(method, path, {body, files})` adds the ID token and throws `ApiException(status, code)`; `AuthRepository` (`login`, `register`, `logout`, `currentRole` from token claims); `RoleGate` routes `resident` to `ResidentHome`, `responder` to `ResponderHome`, any other role to a "use the web dashboard" screen. Registration calls the API to set the `resident` role (see Task 13's `POST /api/users/self`; added there). Registration screen shows the consent notice and the disclaimer text.
- [ ] **Step 1: Write failing tests** (theme primary equals `0xFF0F6B66`; `ApiClient` adds the header and maps 409 to `ApiException`; `RoleGate` picks the right home).
- [ ] **Step 2: Run** `cd mobile && flutter test`, expect FAIL. **Step 3: Implement. Step 4: Run** `flutter analyze && flutter test`, expect clean.
- [ ] **Step 5: Commit** `git commit -am "feat(mobile): theme, auth, role gate"`

### Task 12: Flutter resident flow

**Files:**
- Create under `mobile/lib/features/`: `report/report_flow_page.dart` (4 steps), `report/location_picker.dart`, `report/photo_picker.dart`, `report/report_draft_store.dart`, `report/submission_result_page.dart`, `my_reports/my_reports_page.dart`, `my_reports/status_timeline.dart`, `offline/offline_help_page.dart`, `profile/profile_page.dart`
- Test: `mobile/test/report_flow_test.dart`, `draft_store_test.dart`, `status_timeline_test.dart`

**Interfaces:**
- Consumes: `ApiClient`, `geolocator`, `image_picker`, Firestore listener on `reports` where `reporterId == uid`.
- Produces: step flow (type, location by GPS or tap on map, details with up to 5 photos, confirm with the disclaimer text). `ReportDraftStore.save(draft)` and `load()` using `shared_preferences`; on a network error the flow keeps the draft and opens `OfflineHelpPage` showing hotlines from `config/hotlines` (cached) and instructions to call or text. Success page shows the reference ID; failure page says plainly the report was NOT submitted. My Reports has Active and History tabs, a status timeline for the eight workflow statuses, and a Cancel button only while Submitted.
- [ ] **Step 1: Write failing widget tests:** cannot advance step 2 without a location; sixth photo is blocked with a message; confirm step shows the exact disclaimer text; a thrown `ApiException` leads to the failure page; a `SocketException` saves a draft and opens the offline page; timeline marks the current status; Cancel is hidden after Submitted.
- [ ] **Step 2: Run, expect FAIL. Step 3: Implement. Step 4:** `flutter analyze && flutter test`, expect clean.
- [ ] **Step 5: Report as unchecked:** GPS capture and image picking on a real device.
- [ ] **Step 6: Commit** `git commit -am "feat(mobile): resident report flow"`

**Phase 2 end:** manual walkthrough (mobile submit, web verify), update `HANDOFF.md`, commit.

---

# PHASE 3: Dispatch and field

### Task 13: Teams, assignment, rescue updates, close, users

**Files:**
- Create: `api/src/services/assignmentService.js`, `userService.js`, `api/src/routes/teams.js`, `users.js`
- Modify: `api/src/routes/reports.js`
- Test: `api/test/routes/assignment.test.js`, `users.test.js`

**Interfaces:**
- Produces: `GET/POST/PATCH /api/teams`; `POST /api/reports/:id/assign {teamId}` (dispatcher; from Awaiting Assignment; sets team busy; notifies reporter, team members); `POST /api/reports/:id/acknowledge` (responder of the assigned team; no status change, writes an `updates` entry and audit); `POST /api/reports/:id/updates {status, note, peopleRescued}` (responder of the assigned team; status must be `Rescue in Progress` or `Resolved`; `peopleRescued` integer 0..10000); `PATCH /api/reports/:id/close` (dispatcher, from Resolved; frees the team); `POST /api/users` (dispatcher creates staff with role and optional team, sets custom claims `role`, `active`, `team`); `GET /api/users`; `PATCH /api/users/:id {role?, active?}` (deactivating also disables the Firebase account); `POST /api/users/self` (any signed-in new account becomes `resident`, refused if the user already has a role).
- [ ] **Step 1: Write failing tests,** including Review Focus 4: two concurrent `assign` calls on the same report (use `Promise.all`), exactly one 200 and one 409, one audit `report.assign`; a responder of another team gets 404 on updates; `peopleRescued: -1` and `'many'` are 400; a resident cannot call `POST /users`; a dispatcher cannot create a user with role `admin` (400); `close` from `Rescue in Progress` is 409.
- [ ] **Step 2: Run, expect FAIL. Step 3: Implement** (every write via `updateReportIf`). **Step 4: Run all API tests, expect pass.**
- [ ] **Step 5: Commit** `git commit -am "feat(api): teams, assignment, rescue records, users"`

### Task 14: Notifications (in-app plus FCM)

**Files:**
- Create: `api/src/services/notificationService.js`, `api/src/adapters/fcmSender.js`, `api/src/routes/notifications.js`
- Test: `api/test/services/notification.test.js`, `api/test/routes/notifications.test.js`

**Interfaces:**
- Produces: `notifyUsers(deps, uids, {title, body, reportId})` stores one `notifications` doc per uid first, then sends FCM to each device token; tokens reported failed by the sender are removed with `repo.removeDevice`; any sender exception is caught and logged. `notifyRole(deps, role, payload)`. Routes: `GET /api/notifications`, `PATCH /api/notifications/:id/read` (owner only), `POST /api/devices {token}`.
- [ ] **Step 1: Write failing tests,** including Review Focus 5: when `fakeSender.send` throws, the in-app notification is still stored and the calling report operation still returns success; failed tokens are deleted; a user cannot mark someone else's notification read (404).
- [ ] **Step 2-4:** run to fail, implement, run to pass. Replace the no-op notifier injected in earlier tasks with the real service in `app.js`.
- [ ] **Step 5: Commit** `git commit -am "feat(api): notifications"`

### Task 15: Web teams, users, responder view

**Files:**
- Create: `web/src/features/teams/TeamsPage.jsx`, `users/UsersPage.jsx`, `reports/AssignTeamDialog.jsx`, `responder/AssignmentsPage.jsx`, `responder/OperationForm.jsx`
- Test: `web/src/features/responder/OperationForm.test.jsx`, `AssignTeamDialog.test.jsx`

**Interfaces:**
- Produces: dispatcher can create and edit teams, create staff accounts, activate or deactivate users, and assign a team from incident details (only available teams selectable). Responder web view lists assigned incidents (Firestore listener filtered by the team claim), shows exact location with an "Open in maps" link, Acknowledge, and an operation form (status, people rescued, notes). The form blocks negative or non-integer people counts client-side as well.
- [ ] **Step 1-4:** failing tests, implement, pass, `npm run build`. **Step 5: Commit** `git commit -am "feat(web): teams, users, responder view"`

### Task 16: Flutter responder mode and notifications

**Files:**
- Create under `mobile/lib/features/`: `responder/assigned_list_page.dart`, `incident_detail_page.dart`, `operation_form_page.dart`, `notifications/notifications_page.dart`, `notifications/push_registration.dart`
- Test: `mobile/test/operation_form_test.dart`, `notifications_page_test.dart`

**Interfaces:**
- Produces: assigned incidents list, detail with exact location and `url_launcher` link to the maps app, Acknowledge, status update, operation record (people rescued, notes, optional photos), completion submit; notifications list reading Firestore `notifications` for the uid with unread styling, tap marks read via API; `PushRegistration.init()` requests permission, posts the FCM token to `/api/devices`, refreshes on token change.
- [ ] **Step 1-4:** failing widget tests, implement, `flutter analyze && flutter test`. **Step 5: Report as unchecked:** push delivery on a real device. **Step 6: Commit** `git commit -am "feat(mobile): responder mode and notifications"`

**Phase 3 end:** run the full flow across all roles, update `HANDOFF.md`, commit.

---

# PHASE 4: Map and monitoring

### Task 17: Incident maps and DMO view

**Files:**
- Create: `web/src/features/map/IncidentMap.jsx`, `markerStyle.js`, `web/src/features/dmo/MonitorPage.jsx`, `mobile/lib/features/map/incident_map_page.dart`
- Test: `web/src/features/map/markerStyle.test.js`, `mobile/test/incident_map_page_test.dart`

**Interfaces:**
- Produces: `markerStyle(report) => {color, shape, label}` maps priority to color and a distinct shape and label (never color alone). Web map shows exact locations to dispatcher, dmo, and assigned responder only, with type, priority, and status filters and click-through to details. DMO `MonitorPage` is read-only: no action buttons render for role `dmo`. Flutter map uses `coarseLocation` for everyone except the reporter and assigned responder, and has type filter chips with a list view beneath.
- [ ] **Step 1-4:** failing tests, implement, run `npm test`, `npm run build`, `flutter analyze && flutter test`.
- [ ] **Step 5: Commit** `git commit -am "feat: incident maps and DMO monitor"`

**Phase 4 end:** update `HANDOFF.md`, commit.

---

# PHASE 5: Analytics and extras

### Task 18: Stats, exports, audit endpoint

**Files:**
- Create: `api/src/services/statsService.js`, `exportService.js`, `api/src/routes/stats.js`, `export.js`, `audit.js`
- Test: `api/test/services/stats.test.js`, `api/test/routes/export.test.js`

**Interfaces:**
- Produces: `buildStats(reports, {from, to}) => {total, open, resolved, byType, byStatus, byPriority, perDay[], avgResponseMinutes, peopleRescued}` where `avgResponseMinutes` is mean minutes from `createdAt` to the first `Team Assigned` update, `null` when none; `toCsv(reports)` with a header row and RFC 4180 quoting (commas, quotes, newlines in descriptions; cells starting with `=`, `+`, `-`, `@` prefixed with `'` to prevent spreadsheet formula injection); `toPdf(stats, reports) => Buffer` via pdfkit. Routes `GET /api/stats`, `/api/export/incidents.csv`, `/api/export/summary.pdf` (dispatcher and dmo), `GET /api/audit` (filters `reportId`, `actorUid`, `action`, `from`, `to`).
- [ ] **Step 1: Write failing tests:** stats on an empty set returns zeros and `avgResponseMinutes: null`; CSV round trip of a description `He said "help", now\n=cmd` stays one row and neutralizes the formula; PDF buffer starts with `%PDF`; resident gets 403 on all four routes.
- [ ] **Step 2-4:** run, implement, pass. **Step 5: Commit** `git commit -am "feat(api): stats, csv and pdf export, audit endpoint"`

### Task 19: Web analytics and audit viewer

**Files:**
- Create: `web/src/features/analytics/AnalyticsPage.jsx`, `ChartCard.jsx`, `ExportButtons.jsx`, `web/src/features/audit/AuditPage.jsx`
- Test: `web/src/features/analytics/AnalyticsPage.test.jsx`

**Interfaces:**
- Produces: filters by date range, type, and status; Recharts cards for incidents by type, by status, and per day, each with an accessible text table alternative; export buttons that download CSV and PDF with the current filters; audit table with filters and before/after diff view. Dashboard summary cards on `/dashboard` (total reports, ongoing, resolved, rescue teams) reuse `GET /api/stats`.
- [ ] **Step 1-4:** failing tests (empty data shows an empty-state message, filters change the query string), implement, build. **Step 5: Commit** `git commit -am "feat(web): analytics, exports, audit viewer"`

**Phase 5 end:** update `HANDOFF.md`, commit. Cut order if behind: PDF export, then duplicate banner polish, then DMO charts.

---

# PHASE 6: Hardening and polish

### Task 20: Hardening

**Files:**
- Modify: `api/src/app.js`, `api/src/config.js`, `firebase/firestore.rules`
- Create: `api/test/routes/hardening.test.js`, `docs/privacy-and-coordination.md`, `docs/backup-and-recovery.md`

**Interfaces:**
- Produces: `helmet`, strict CORS from an allowlist env var, `express-rate-limit` on `POST /api/reports` (10 per 15 minutes per user) and on login-adjacent routes, JSON body limit 100 kb, consistent 404 for unknown routes, no stack traces in responses. Docs: privacy notice text and Data Privacy Act and LDRRMO coordination notes (prototype, no legal review), and a backup note covering a scheduled Firestore export and the recovery steps.
- [ ] **Step 1: Write failing tests:** 11th report in the window gets 429; disallowed origin gets no CORS header; unknown route returns JSON 404; thrown internal error returns `{error: 'internal_error'}` with no stack.
- [ ] **Step 2-4:** run, implement, pass. **Step 5:** run `/design-review` on the web and mobile screens and `/qa` on the full report-to-closed flow, fix the findings, and re-run. **Step 6: Commit** `git commit -am "chore: hardening, privacy and backup docs"`

**Phase 6 end:** update `HANDOFF.md`, commit.

---

# PHASE 7: Deliverables

### Task 21: Deploy and documents

**Files:**
- Create: `docs/schema.md`, `docs/user-guide/outline.md`, `docs/video-script.md`, `docs/contributions.md`, `docs/deploy.md`

- [ ] **Step 1: Deploy.** API to a free Node host (Render or Railway) with env vars set; web to Firebase Hosting (Spark plan allows it) or Vercel; Flutter release APK built with `flutter build apk`. Record URLs and steps in `docs/deploy.md`. Verify HTTPS on both.
- [ ] **Step 2: `docs/schema.md`:** every collection, field, type, index, and security rule from spec section 4, plus an ER-style diagram (use the `/diagram` skill if wanted) and a short note explaining the Firestore choice against the brief's PostgreSQL/MySQL suggestion.
- [ ] **Step 3: User guide outline** for the PowerPoint (one section per role, screenshots taken from the running app) and the video script covering the four required items: technologies, major features demo, database and architecture, challenges and solutions.
- [ ] **Step 4: `docs/contributions.md`:** table template of member, assigned role, tasks, and actual contributions, to be filled with the group.
- [ ] **Step 5: Final verification before saying done:** `cd api && npx vitest run`, `cd firebase && emulator rules tests`, `cd web && npm test && npm run build`, `cd mobile && flutter analyze && flutter test`. State plainly what was not checked (real device GPS, push, camera).
- [ ] **Step 6: Commit** `git commit -am "docs: schema, user guide outline, video script, deploy"`

---

## Self-Review

**Spec coverage:** FR-01 Tasks 2, 6, 11, 13. FR-02 Tasks 7, 12. FR-03 Tasks 4, 7, 12. FR-04 Tasks 4, 7, 12. FR-05 Tasks 8, 10. FR-06 Tasks 8, 10. FR-07 Tasks 13, 15. FR-08 Tasks 10, 12. FR-09 Tasks 14, 16. FR-10 Task 17. FR-11 Tasks 13, 15, 16. FR-12 Tasks 18, 19. FR-13 Tasks 5, 18, 19. FR-14 Tasks 4, 7, 10. FR-15 Tasks 8, 10. Security items: rules Task 6, validation Task 4, rate limit and privacy docs Task 20, disclaimer and offline help Tasks 11 and 12, backups Task 20, hotlines Tasks 6 and 12. Status workflow Task 3. UI direction Tasks 1, 9, 11.

**Review against code:** the repo has no application code yet, so there was nothing to review the spec against. The one external fact checked was the Firebase Storage billing requirement, which led to the Cloudinary decision.

**Known gaps and risks:** no automated tests for Leaflet and `flutter_map` rendering itself, only for the logic around them. Flutter widget tests do not prove behavior on a real device. The Firestore adapter is covered by the emulator rules test and the manual walkthrough rather than a dedicated adapter test suite.

**Open items:** hosting is proposed in Task 21 (Render or Railway for the API, Firebase Hosting or Vercel for web), to be confirmed with Airen. Group roles are needed only for Task 21 Step 4.
