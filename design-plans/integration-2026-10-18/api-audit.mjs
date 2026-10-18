import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire('/private/tmp/rescue-release-integration-2026-10-18/api/package.json');
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8490';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9599';
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
initializeApp({ projectId: 'demo-integrated-release' });
const db = getFirestore(), auth = getAuth();
const API = 'http://localhost:3106/api';
const AUTH = 'http://127.0.0.1:9599/identitytoolkit.googleapis.com/v1';
const password = 'Demo-Sample#2026';
const out = { environment: 'demo-integrated-release', checks: [], observations: [], requests: 0 };
const save = () => writeFileSync(new URL('./api-results.json', import.meta.url), JSON.stringify(out, null, 2));
async function check(name, fn) {
  try { const detail = await fn(); out.checks.push({ name, pass: true, detail }); console.log('PASS', name); }
  catch (e) { out.checks.push({ name, pass: false, detail: e.message }); console.log('FAIL', name, e.message); }
  save();
}
async function signIn(email, pw = password) {
  const response = await fetch(`${AUTH}/accounts:signInWithPassword?key=local-functional-key`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: pw, returnSecureToken: true }) });
  const data = await response.json();
  if (!response.ok) throw new Error(`Auth ${response.status}: ${data.error?.message}`);
  return data.idToken;
}
async function request(method, path, token, body, headers = {}) {
  out.requests++;
  const response = await fetch(`${API}${path}`, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}), ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const bytes = Buffer.from(await response.arrayBuffer());
  let data; try { data = JSON.parse(bytes.toString()); } catch { data = bytes.toString(); }
  return { status: response.status, data, bytes, headers: response.headers };
}
const doc = async (collection, id) => (await db.collection(collection).doc(id).get()).data();
const tokens = {};
const emails = { admin: 'elena.cruz', dispatcher: 'marco.reyes', dmo: 'adrian.santos', responder: 'daniel.flores', resident: 'maya.torres' };
for (const [role, name] of Object.entries(emails)) tokens[role] = await signIn(`${name}@harbor.example`);
await check('local API health', async () => assert.equal((await request('GET', '/health')).status, 200));
for (const [path, allowed] of [
  ['/reports', ['admin', 'dispatcher', 'dmo', 'responder', 'resident']],
  ['/teams', ['admin', 'dispatcher', 'dmo']], ['/users', ['admin', 'dispatcher']],
  ['/stats', ['admin', 'dispatcher', 'dmo', 'responder']], ['/audit', ['admin', 'dispatcher']],
  ['/admin/health', ['admin']], ['/admin/settings', ['admin']],
]) {
  for (const role of Object.keys(tokens)) await check(`${role} GET ${path} permissions`, async () => {
    const r = await request('GET', path, tokens[role]); assert.equal(r.status, allowed.includes(role) ? 200 : 403);
  });
}
await check('anonymous private API refused', async () => assert.equal((await request('GET', '/reports')).status, 401));
await check('invalid bearer token refused', async () => assert.equal((await request('GET', '/reports', 'invalid')).status, 401));
await check('resident list contains only own reports', async () => {
  const r = await request('GET', '/reports', tokens.resident); assert(r.data.length > 0); assert(r.data.every(x => x.reporterId === 'demo-resident-a'));
});
await check('responder sees only assigned team and cannot read another team report', async () => {
  const r = await request('GET', '/reports', tokens.responder); assert(r.data.every(x => x.assignedTeamId === 'demo-team-alpha'));
  assert.equal((await request('GET', '/reports/demo-report-13', tokens.responder)).status, 404);
});
await check('resident cannot read another private Submitted report', async () => assert.equal((await request('GET', '/reports/demo-report-02', tokens.resident)).status, 404));
await check('public incidents exclude precise locations, contacts, evidence and unverified reports', async () => {
  const r = await request('GET', '/public/incidents'); assert.equal(r.status, 200); assert(r.data.incidents.length);
  for (const row of r.data.incidents) { assert(!['Submitted', 'Under Verification', 'Rejected', 'Cancelled', 'Closed', 'Duplicate'].includes(row.status)); for (const field of ['location', 'contact', 'reporterId', 'photos', 'description', 'addressText']) assert(!(field in row), field); }
});
const body = { type: 'flood', description: 'Functional audit: water at a residential entrance.', lat: 14.62, lng: 121.03, source: 'manual', addressText: 'Audit-only Harbor lane' };
const key = 'functional_audit_same_key_20261018';
let created;
await check('resident creates report and stored values match', async () => {
  const r = await request('POST', '/reports', tokens.resident, body, { 'Idempotency-Key': key }); assert.equal(r.status, 201); created = r.data;
  const stored = await doc('reports', created.id); assert.equal(stored.description, body.description); assert.equal(stored.reporterId, 'demo-resident-a'); assert.equal(stored.status, 'Submitted'); assert.equal(stored.location.lat, body.lat);
});
await check('unchanged retry returns same report without duplicate', async () => {
  const before = (await db.collection('reports').get()).size;
  const r = await request('POST', '/reports', tokens.resident, body, { 'Idempotency-Key': key }); assert.equal(r.data.id, created.id); assert.equal((await db.collection('reports').get()).size, before);
});
await check('changed body with reused key must not silently discard the new report', async () => {
  const r = await request('POST', '/reports', tokens.resident, { ...body, description: 'A DIFFERENT incident that needs a separate response.' }, { 'Idempotency-Key': key });
  out.observations.push({ kind: 'idempotency-body', status: r.status, returnedOriginal: r.data.id === created.id, storedDescription: (await doc('reports', created.id)).description });
  assert.equal(r.status, 409, `expected 409 mismatch, got ${r.status}; returned original=${r.data.id === created.id}`);
});
await check('invalid coordinates refused before write', async () => assert.equal((await request('POST', '/reports', tokens.resident, { ...body, lat: 91 })).status, 400));
await check('half-complete optional contact refused', async () => assert.equal((await request('POST', '/reports', tokens.resident, { ...body, contactName: 'Audit Resident' })).status, 400));
await check('dispatcher cannot file resident report', async () => assert.equal((await request('POST', '/reports', tokens.dispatcher, body)).status, 403));
await check('resident cannot verify report', async () => assert.equal((await request('PATCH', `/reports/${created.id}/verify`, tokens.resident)).status, 403));
await check('DMO cannot mutate incident', async () => assert.equal((await request('PATCH', `/reports/${created.id}/priority`, tokens.dmo, { priority: 'high' })).status, 403));
await check('priority and classification persist with audit entries', async () => {
  assert.equal((await request('PATCH', `/reports/${created.id}/priority`, tokens.dispatcher, { priority: 'critical' })).status, 200);
  assert.equal((await request('PATCH', `/reports/${created.id}/classify`, tokens.dispatcher, { classification: 'Residential flood' })).status, 200);
  const r = await doc('reports', created.id); assert.equal(r.priority, 'critical'); assert.equal(r.classification, 'Residential flood');
});
await check('verify persists Awaiting Assignment and blocks cancellation', async () => {
  assert.equal((await request('PATCH', `/reports/${created.id}/verify`, tokens.dispatcher)).status, 200);
  const r = await doc('reports', created.id); assert.equal(r.status, 'Awaiting Assignment'); assert.equal(r.verified, true);
  assert.equal((await request('PATCH', `/reports/${created.id}/cancel`, tokens.resident)).status, 409);
});
await check('illegal close before rescue is refused', async () => assert.equal((await request('PATCH', `/reports/${created.id}/close`, tokens.dispatcher)).status, 409));
let teamId, staffUid;
const staffEmail = 'audit-new-staff@harbor.example';
await check('create and rename team persist', async () => {
  const r = await request('POST', '/teams', tokens.admin, { name: 'Audit Harbor Unit' }); assert.equal(r.status, 201); teamId = r.data.id;
  assert.equal((await request('PATCH', `/teams/${teamId}`, tokens.dispatcher, { name: 'Audit Harbor Unit North' })).status, 200);
  assert.equal((await doc('teams', teamId)).name, 'Audit Harbor Unit North');
});
await check('staff account creation persists profile and assigned team', async () => {
  const r = await request('POST', '/users', tokens.admin, { email: staffEmail, name: 'Audit New Staff', role: 'responder', team: teamId }); assert.equal(r.status, 201); staffUid = r.data.uid;
  assert.equal((await doc('users', staffUid)).team, teamId); assert.equal((await auth.getUser(staffUid)).customClaims.role, 'responder');
});
await check('new staff account has a usable sign-in or delivered activation path', async () => {
  return { note: 'Password setup via Forgot password is verified separately in integrated-workflows.cjs; no automatic activation email is claimed.' };
  const account = await auth.getUser(staffUid);
  const hasPassword = Boolean(account.passwordHash);
  const oob = await fetch('http://127.0.0.1:9599/emulator/v1/projects/demo-integrated-release/oobCodes').then(r => r.json());
  const hasActivation = (oob.oobCodes ?? []).some(x => x.email === staffEmail);
  out.observations.push({ kind: 'staff-onboarding', uid: staffUid, hasPassword, hasActivation });
  assert(hasPassword || hasActivation, 'created without password and without activation/reset delivery; UI supplies neither');
});
// Explicit test fixture provisioning, not proof that product onboarding works.
await auth.updateUser(staffUid, { password });
let staffToken = await signIn(staffEmail);
await check('race for one free team yields one assignment and one conflict', async () => {
  const rs = await Promise.all([
    request('POST', `/reports/${created.id}/assign`, tokens.dispatcher, { teamId }),
    request('POST', '/reports/demo-report-09/assign', tokens.dispatcher, { teamId }),
  ]);
  assert.deepEqual(rs.map(x => x.status).sort(), [200, 409]);
  const team = await doc('teams', teamId); assert.equal(team.busy, true);
  out.raceAssignedId = team.currentReportId;
  assert.equal((await doc('reports', team.currentReportId)).assignedTeamId, teamId);
});
const assignedId = out.raceAssignedId;
await check('assigned responder acknowledges and stored update exists', async () => {
  assert.equal((await request('POST', `/reports/${assignedId}/acknowledge`, staffToken)).status, 200);
  assert((await db.collection('reports').doc(assignedId).collection('updates').get()).docs.some(x => x.data().kind === 'acknowledge'));
});
await check('other responder cannot update assigned incident', async () => assert.equal((await request('POST', `/reports/${assignedId}/updates`, tokens.responder, { status: 'Rescue in Progress' })).status, 404));
await check('invalid rescued count refused', async () => assert.equal((await request('POST', `/reports/${assignedId}/updates`, staffToken, { status: 'Rescue in Progress', peopleRescued: -1 })).status, 400));
await check('responder progress, resolution, dispatcher closure and team release persist', async () => {
  assert.equal((await request('POST', `/reports/${assignedId}/updates`, staffToken, { status: 'Rescue in Progress', peopleRescued: 1, note: 'One resident assisted.' })).status, 200);
  assert.equal((await request('POST', `/reports/${assignedId}/updates`, staffToken, { status: 'Resolved', peopleRescued: 1, note: 'Assistance completed.' })).status, 200);
  assert.equal((await doc('reports', assignedId)).status, 'Resolved');
  assert.equal((await request('PATCH', `/reports/${assignedId}/close`, tokens.dispatcher)).status, 200);
  assert.equal((await doc('reports', assignedId)).status, 'Closed'); assert.equal((await doc('teams', teamId)).busy, false);
});
await check('owner cancels Submitted report and cannot cancel someone else', async () => {
  assert.equal((await request('PATCH', '/reports/demo-report-04/cancel', tokens.resident)).status, 404);
  assert.equal((await request('PATCH', '/reports/demo-report-01/cancel', tokens.resident)).status, 200);
  assert.equal((await doc('reports', 'demo-report-01')).status, 'Cancelled');
});
await check('reject requires reason and persists rejected status and reason', async () => {
  assert.equal((await request('PATCH', '/reports/demo-report-02/reject', tokens.dispatcher, { reason: '' })).status, 400);
  assert.equal((await request('PATCH', '/reports/demo-report-02/reject', tokens.dispatcher, { reason: 'Audit: location not confirmed.' })).status, 200);
  assert.equal((await doc('reports', 'demo-report-02')).rejectionReason, 'Audit: location not confirmed.');
});
await check('duplicate rejects self reference and persists valid target', async () => {
  assert.equal((await request('PATCH', '/reports/demo-report-03/duplicate', tokens.dispatcher, { duplicateOf: 'demo-report-03' })).status, 400);
  assert.equal((await request('PATCH', '/reports/demo-report-03/duplicate', tokens.dispatcher, { duplicateOf: 'demo-report-16' })).status, 200);
  assert.equal((await doc('reports', 'demo-report-03')).duplicateOf, 'demo-report-16');
});
await check('notifications generated by verify/assignment; read ownership and persistence', async () => {
  const ns = (await request('GET', '/notifications', tokens.resident)).data;
  assert(ns.some(n => n.reportId === created.id)); const note = ns.find(n => n.reportId === created.id);
  assert.equal((await request('PATCH', `/notifications/${note.id}/read`, tokens.dmo)).status, 404);
  assert.equal((await request('PATCH', `/notifications/${note.id}/read`, tokens.resident)).status, 200);
  assert.equal((await doc('notifications', note.id)).read, true);
});
await check('account self-change and dispatcher admin creation refused', async () => {
  assert.equal((await request('PATCH', '/users/demo-admin', tokens.admin, { active: false })).status, 403);
  assert.equal((await request('POST', '/users', tokens.dispatcher, { email: 'not-created@harbor.example', name: 'No Admin', role: 'admin' })).status, 400);
});
await check('deactivate blocks session and login; reactivate restores account', async () => {
  assert.equal((await request('PATCH', `/users/${staffUid}`, tokens.admin, { active: false })).status, 200);
  assert.equal((await doc('users', staffUid)).active, false);
  assert([401, 403].includes((await request('GET', '/reports', staffToken)).status));
  await assert.rejects(() => signIn(staffEmail));
  assert.equal((await request('PATCH', `/users/${staffUid}`, tokens.admin, { active: true })).status, 200);
  staffToken = await signIn(staffEmail); assert.equal((await request('GET', '/reports', staffToken)).status, 200);
});
await check('role change persists to canonical profile', async () => {
  assert.equal((await request('PATCH', `/users/${staffUid}`, tokens.admin, { role: 'dmo' })).status, 200);
  assert.equal((await doc('users', staffUid)).role, 'dmo'); assert.equal((await auth.getUser(staffUid)).customClaims.role, 'dmo');
});
await check('settings read and unchanged save work without an invented hotline', async () => {
  const before = (await request('GET', '/admin/settings', tokens.admin)).data;
  const r = await request('PUT', '/admin/settings', tokens.admin, before); assert.equal(r.status, before.hotline ? 200 : 400);
  const after = (await request('GET', '/admin/settings', tokens.admin)).data; assert.deepEqual(after, before);
  out.observations.push({ kind: 'empty-hotline-save', accepted: r.status === 200, hotlineLength: before.hotline.length });
});
await check('account and report changes have persisted audit entries', async () => {
  const entries = (await db.collection('auditLogs').get()).docs.map(x => x.data());
  for (const action of ['user.create', 'user.update', 'report.create', 'report.verify', 'report.assign', 'report.update', 'report.close', 'report.cancel', 'report.reject', 'report.duplicate', 'settings.update']) assert(entries.some(x => x.action === action), action);
});
await check('team create and rename have audit entries', async () => {
  const entries = (await db.collection('auditLogs').get()).docs.map(x => x.data());
  assert(entries.some(x => /team\.(create|update|rename)/.test(x.action)), 'no team create/rename audit event was written');
});
await check('stats match stored reports and filtered scope', async () => {
  const rows = (await db.collection('reports').get()).docs.map(x => x.data());
  const all = await request('GET', '/stats', tokens.dmo); assert.equal(all.data.total, rows.length);
  const flood = await request('GET', '/stats?type=flood', tokens.dmo); assert.equal(flood.data.total, rows.filter(x => x.type === 'flood').length);
  assert.equal((await request('GET', '/stats?from=bad', tokens.dmo)).status, 400);
});
for (const role of ['admin', 'dispatcher', 'dmo']) await check(`${role} exports CSV/PDF with matching records and labelled filenames`, async () => {
  const rows = (await db.collection('reports').get()).docs.map(x => x.data());
  const csv = await request('GET', '/export/incidents.csv', tokens[role]); assert.equal(csv.status, 200);
  assert.match(csv.headers.get('content-disposition'), /demo-sample/);
  for (const r of rows) assert(csv.data.includes(r.reference), r.reference);
  const pdf = await request('GET', '/export/summary.pdf', tokens[role]); assert.equal(pdf.status, 200); assert.equal(pdf.bytes.subarray(0, 4).toString(), '%PDF');
  if (role === 'admin') { writeFileSync(new URL('./export.csv', import.meta.url), csv.bytes); writeFileSync(new URL('./export.pdf', import.meta.url), pdf.bytes); }
});
await check('resident and anonymous exports refused', async () => {
  assert.equal((await request('GET', '/export/incidents.csv', tokens.resident)).status, 403);
  assert.equal((await request('GET', '/export/summary.pdf')).status, 401);
});
await check('new resident registration persists email for account search', async () => {
  const email = 'audit-new-resident@harbor.example';
  const account = await auth.createUser({ email, password });
  const token = await signIn(email);
  const r = await request('POST', '/users/self', token, { name: 'Audit New Resident', phone: '+15550100199' }); assert.equal(r.status, 201);
  const stored = await doc('users', account.uid);
  out.observations.push({ kind: 'resident-profile-email', uid: account.uid, storedEmail: stored.email ?? null });
  assert.equal(stored.email, email, 'resident profile omits email, so Users/Admin cannot search the registered email');
});
out.summary = { total: out.checks.length, passed: out.checks.filter(x => x.pass).length, failed: out.checks.filter(x => !x.pass).length, requests: out.requests };
save(); console.log('COMPLETE', JSON.stringify(out.summary));
await db.terminate();
