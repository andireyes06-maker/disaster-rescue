import { AUTH, PW, signIn, api, fsDoc, fsList, FS } from './rel-lib.mjs';
const out = { checks: [] };
const rec = (name, ok, detail) => { out.checks.push({ name, ok, detail }); console.log(ok ? 'PASS' : 'FAIL', name, detail ?? ''); };
const emu = (method, path, body) => fetch(`${AUTH}/${path}`, { method, headers: { authorization: 'Bearer owner', 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });

const admin = await signIn('elena.cruz@harbor.example');
const dispatcher = await signIn('marco.reyes@harbor.example');
const dmo = await signIn('adrian.santos@harbor.example');

// ---- Teams: create, read back in Firestore, rename, read back ----
const teamName = `Release Check Team ${Date.now()}`;
const created = await api('POST', '/teams', dispatcher, { name: teamName });
rec('dispatcher creates team', created.status === 201, `status ${created.status}`);
const teamId = created.json?.id;
const teamDoc = teamId ? await fsDoc('teams', teamId) : null;
rec('team create persisted in emulator', teamDoc?.name === teamName, `doc name=${teamDoc?.name}`);
const renamed = `${teamName} renamed`;
const patched = await api('PATCH', `/teams/${teamId}`, dispatcher, { name: renamed });
const renamedDoc = await fsDoc('teams', teamId);
rec('team rename persisted in emulator', patched.status === 200 && renamedDoc?.name === renamed, `status ${patched.status}, doc=${renamedDoc?.name}`);
const listed = await api('GET', '/teams', dmo);
rec('DMO reads renamed team via API', listed.status === 200 && listed.json.some((t) => t.id === teamId && t.name === renamed));
const dmoCreate = await api('POST', '/teams', dmo, { name: 'should not exist' });
rec('DMO cannot create team (refused)', dmoCreate.status === 403, `status ${dmoCreate.status}`);

// ---- Staff: create temp responder and temp admin on the emulator ----
const tag = Date.now();
const respEmail = `release-check-responder-${tag}@harbor.example`;
const admEmail = `release-check-admin-${tag}@harbor.example`;
const cr = await api('POST', '/users', admin, { email: respEmail, name: 'Release Check Responder', role: 'responder' });
const ca = await api('POST', '/users', admin, { email: admEmail, name: 'Release Check Admin', role: 'admin' });
rec('admin creates temp responder and temp admin', cr.status === 201 && ca.status === 201, `${cr.status}/${ca.status}`);
const allUsers = await fsList('users');
const respUid = allUsers.find((u) => u.email === respEmail)?.id;
const admUid = allUsers.find((u) => u.email === admEmail)?.id;
const pwSet = await Promise.all([respUid, admUid].map((localId) => emu('POST', 'accounts:update?key=fake-api-key', { localId, password: PW })));
rec('temp accounts given passwords (emulator admin)', pwSet.every((r) => r.ok), pwSet.map((r) => r.status).join('/'));
const tempAdminToken = await signIn(admEmail);

// role change by dispatcher: responder -> dispatcher, then deactivate and reactivate
const roleChg = await api('PATCH', `/users/${respUid}`, dispatcher, { role: 'dispatcher' });
const roleDoc = await fsDoc('users', respUid);
rec('dispatcher changes temp responder role', roleChg.status === 200 && roleDoc?.role === 'dispatcher', `status ${roleChg.status}, stored=${roleDoc?.role}`);
const deact = await api('PATCH', `/users/${respUid}`, dispatcher, { active: false });
rec('deactivate persisted', deact.status === 200 && (await fsDoc('users', respUid))?.active === false);
const react = await api('PATCH', `/users/${respUid}`, dispatcher, { active: true });
rec('reactivate persisted', react.status === 200 && (await fsDoc('users', respUid))?.active === true);
const dispAdmin = await api('PATCH', `/users/${admUid}`, dispatcher, { role: 'responder' });
rec('dispatcher cannot demote an admin (refused)', dispAdmin.status === 403, `status ${dispAdmin.status}`);
const selfChg = await api('PATCH', `/users/${admUid}`, tempAdminToken, { role: 'responder' });
rec('admin cannot change own account (refused)', selfChg.status === 403, `status ${selfChg.status}`);

// ---- Concurrency: two active admins demote each other at the same instant ----
// Each round starts with fresh sessions. Demotion revokes the target's session, so a stale token is not a test result.
const rounds = [];
const emailOf = { 'demo-admin': 'elena.cruz@harbor.example', [admUid]: admEmail };
for (let i = 0; i < 3; i++) {
  const elenaTok = await signIn('elena.cruz@harbor.example');
  const tempTok = await signIn(admEmail);
  const roleOf = async (uid) => (await fsDoc('users', uid))?.role;
  // Restore any demoted admin, using the other admin's fresh token (never self).
  if ((await roleOf(admUid)) !== 'admin') await api('PATCH', `/users/${admUid}`, elenaTok, { role: 'admin' });
  if ((await roleOf('demo-admin')) !== 'admin') await api('PATCH', '/users/demo-admin', tempTok, { role: 'admin' });
  const pre = [await roleOf(admUid), await roleOf('demo-admin')];
  const fresh = [await signIn('elena.cruz@harbor.example'), await signIn(admEmail)];
  const [r1, r2] = await Promise.all([
    api('PATCH', `/users/${admUid}`, fresh[0], { role: 'responder' }),
    api('PATCH', '/users/demo-admin', fresh[1], { role: 'responder' }),
  ]);
  const post = [await roleOf(admUid), await roleOf('demo-admin')];
  const codes = [r1, r2].map((r) => `${r.status}:${r.json?.error ?? 'ok'}`);
  const exact = [r1, r2].filter((r) => r.status === 200).length === 1
    && [r1, r2].filter((r) => r.status === 409 && r.json?.error === 'last_admin').length === 1;
  const oneAdmin = post.filter((r) => r === 'admin').length === 1;
  rounds.push({ pre, codes, post });
  rec(`race round ${i + 1}: one demotion succeeds, the other refused last_admin, one admin remains`, exact && oneAdmin,
    `codes ${codes.join(' | ')}; stored before ${pre.join('/')}, after ${post.join('/')}`);
}
out.rounds = rounds;

// ---- Cleanup of temp accounts and team (emulator only) ----
for (const uid of [respUid, admUid]) {
  await fetch(`${FS}/users/${uid}`, { method: 'DELETE', headers: { authorization: 'Bearer owner' } });
  await emu('POST', 'accounts:delete?key=fake-api-key', { localId: uid });
}
await fetch(`${FS}/teams/${teamId}`, { method: 'DELETE', headers: { authorization: 'Bearer owner' } });
rec('cleanup: temp users and team removed', (await fsDoc('users', admUid)) === null && (await fsDoc('teams', teamId)) === null);
console.log(JSON.stringify(out, null, 2));
