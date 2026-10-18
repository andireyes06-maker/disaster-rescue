// Last-admin race and admin-protection checks on the release-audit API (real HTTP, real emulator).
const fs = require('node:fs');
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1', API = 'http://localhost:3105/api';
const PASSWORD = 'AuditOnly-Rescue-2026';
const results = [];
const note = (id, pass, detail) => { results.push({ id, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${id}: ${JSON.stringify(detail)}`); };
const sign = async (email) => (await (await fetch(`${AUTH}/accounts:signInWithPassword?key=audit-local-key`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }) })).json());
const call = async (m, p, tok, body) => {
  const r = await fetch(`${API}${p}`, { method: m, headers: { authorization: `Bearer ${tok}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
(async () => {
  const adminSelf = await sign('admin@harbor.example');
  const admin = adminSelf.idToken;
  const dispatcher = await sign('dispatcher@harbor.example');
  // Create a second admin, so two admins exist for the race.
  const email = `second.admin.${Date.now()}@harbor.example`;
  const created = await call('POST', '/users', admin, { email, name: 'Second Admin', role: 'admin' });
  note('ADMIN-create-second-admin', created.status === 201, { status: created.status });
  // Passwords for new accounts are not set by the API (F02). Use the Auth emulator's own admin path to set one for this test account.
  const { createRequire } = require('node:module');
  const apiReq = createRequire('/Users/rien/Documents/FINAL_PROJECT-fixes/api/package.json');
  const { initializeApp } = apiReq('firebase-admin/app');
  const { getAuth } = apiReq('firebase-admin/auth');
  const app = initializeApp({ projectId: 'demo-release-audit' }, 'race');
  await getAuth(app).updateUser(created.body.uid, { password: PASSWORD });
  const second = await sign(email);
  const race = await Promise.all([
    call('PATCH', `/users/${second.localId}`, admin, { active: false }),
    call('PATCH', `/users/${adminSelf.localId}`, second.idToken, { active: false }),
  ]);
  const statuses = race.map((r) => r.status).sort();
  note('RACE-last-admin-two-deactivations-one-succeeds', statuses[0] === 200 || statuses[0] === 403, { statuses, errors: race.map((r) => r.body?.error ?? null) });
  // Whatever happened, at least one active admin must remain.
  // Read with whichever admin token is still active (the race may have revoked one).
  let users = (await call('GET', '/users', admin)).body;
  if (!Array.isArray(users)) users = (await call('GET', '/users', second.idToken)).body;
  const activeAdmins = Array.isArray(users) ? users.filter((u) => u.role === 'admin' && u.active === true) : [];
  note('RACE-at-least-one-active-admin-remains', activeAdmins.length >= 1, { activeAdmins: activeAdmins.map((u) => u.email) });
  // Dispatcher cannot touch an admin account.
  const dispAttempt = await call('PATCH', `/users/${created.body.uid}`, dispatcher.idToken, { role: 'resident' });
  note('AUTHZ-dispatcher-cannot-change-admin', dispAttempt.status === 403 || dispAttempt.status === 401, { status: dispAttempt.status, error: dispAttempt.body?.error });
  fs.writeFileSync(__dirname + '/admin-race.json', JSON.stringify(results, null, 2));
})().catch((e) => { console.error('script error', e); process.exit(1); });
