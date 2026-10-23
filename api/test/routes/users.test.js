import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

const create = (t, who, body) => request(t.app).post('/api/users').set('Authorization', who).send(body);
const self = (t, token, body) => request(t.app).post('/api/users/self').set('Authorization', token).send(body ?? {});

// Creates a staff account through the dispatcher route and returns its uid.
async function makeStaff(t, body = { email: 'bea@x.test', name: 'Bea', role: 'responder', team: 'tA' }) {
  await t.repo.saveTeam('tA', { name: 'Team A', busy: false });
  const res = await create(t, t.as('admin'), body);
  expect(res.status).toBe(201);
  return res.body.uid;
}

describe('POST /api/users (dispatcher creates staff)', () => {
  it('resident cannot create users (403)', async () => {
    const t = makeTestApp();
    expect((await create(t, t.as('resident'), { email: 'a@x.test', name: 'A', role: 'responder' })).status).toBe(403);
    expect(t.auth.calls.setCustomUserClaims).toHaveLength(0);
  });

  it('dispatcher is refused before any account is created', async () => {
    const t = makeTestApp();
    const res = await create(t, t.as('dispatcher'), { email: 'root@x.test', name: 'Root', role: 'admin' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('website_access_disabled');
    expect(t.auth.users.size).toBe(0);
  });

  it('creates the account with claims {role, active:true, team} and a users doc', async () => {
    const t = makeTestApp();
    const uid = await makeStaff(t);
    expect(t.auth.users.get(uid).customClaims).toEqual({ role: 'responder', active: true, team: 'tA' });
    expect(await t.repo.getUser(uid)).toMatchObject({ role: 'responder', team: 'tA', active: true, name: 'Bea' });
  });

  it('rejects an unknown team (400) and a duplicate email (409)', async () => {
    const t = makeTestApp();
    expect((await create(t, t.as('admin'), { email: 'a@x.test', name: 'A', role: 'responder', team: 'ghost' })).status).toBe(400);
    await makeStaff(t, { email: 'dup@x.test', name: 'Dup', role: 'dmo' });
    expect((await create(t, t.as('admin'), { email: 'dup@x.test', name: 'Dup 2', role: 'dmo' })).status).toBe(409);
  });
});

describe('GET /api/users', () => {
  it('dispatcher and admin can list; responder gets 403', async () => {
    const t = makeTestApp();
    await makeStaff(t);
    expect((await request(t.app).get('/api/users').set('Authorization', t.as('admin'))).body).toHaveLength(1);
    expect((await request(t.app).get('/api/users').set('Authorization', t.as('admin'))).status).toBe(200);
    expect((await request(t.app).get('/api/users').set('Authorization', t.as('responder'))).status).toBe(403);
  });
});

describe('PATCH /api/users/:id', () => {
  it('deactivation sets claims to {role, active:false} (never {}), revokes refresh tokens and disables the account', async () => {
    const t = makeTestApp();
    const uid = await makeStaff(t);
    const res = await request(t.app).patch(`/api/users/${uid}`).set('Authorization', t.as('admin')).send({ active: false });
    expect(res.status).toBe(200);
    expect(t.auth.users.get(uid).customClaims).toEqual({ role: 'responder', active: false });
    expect(t.auth.calls.revokeRefreshTokens).toEqual([uid]);
    expect(t.auth.users.get(uid).disabled).toBe(true);
    expect(await t.repo.getUser(uid)).toMatchObject({ active: false, role: 'responder' });
  });

  it('a role change keeps active and team in claims', async () => {
    const t = makeTestApp();
    const uid = await makeStaff(t);
    expect((await request(t.app).patch(`/api/users/${uid}`).set('Authorization', t.as('admin')).send({ role: 'dmo' })).status).toBe(200);
    expect(t.auth.users.get(uid).customClaims).toEqual({ role: 'dmo', active: true, team: 'tA' });
  });

  it('dispatcher cannot promote to admin (refused); an admin unknown user is 404', async () => {
    const t = makeTestApp();
    const uid = await makeStaff(t);
    expect((await request(t.app).patch(`/api/users/${uid}`).set('Authorization', t.as('dispatcher')).send({ role: 'admin' })).status).toBe(403);
    expect((await request(t.app).patch('/api/users/ghost').set('Authorization', t.as('admin')).send({ active: false })).status).toBe(404);
  });
});

describe('PATCH /api/users/:id guards', () => {
  it('a dispatcher cannot deactivate or change an admin (403) and nothing is written', async () => {
    const t = makeTestApp();
    await t.repo.createUser('adm-1', { name: 'Root', role: 'admin', active: true });
    t.auth.users.set('adm-1', { uid: 'adm-1', email: 'root@x.test', disabled: false });
    const res = await request(t.app).patch('/api/users/adm-1').set('Authorization', t.as('dispatcher')).send({ active: false });
    expect(res.status).toBe(403);
    expect(t.auth.calls.setCustomUserClaims).toHaveLength(0);
    expect(t.auth.calls.revokeRefreshTokens ?? []).toHaveLength(0);
    expect(await t.repo.getUser('adm-1')).toMatchObject({ role: 'admin', active: true });
  });

  it('deactivating a user removes their device tokens so they stop receiving pushes', async () => {
    const t = makeTestApp();
    const uid = await makeStaff(t);
    await t.repo.addDevice(uid, 'tok-bea');
    expect((await request(t.app).patch(`/api/users/${uid}`).set('Authorization', t.as('admin')).send({ active: false })).status).toBe(200);
    expect(await t.repo.listDevices(uid)).toEqual([]);
  });

  it('a dispatcher cannot change their own account (403)', async () => {
    const t = makeTestApp();
    await t.repo.createUser('d1', { name: 'Dee', role: 'dispatcher', active: true });
    t.auth.users.set('d1', { uid: 'd1', email: 'dee@x.test', disabled: false });
    const res = await request(t.app).patch('/api/users/d1').set('Authorization', t.as('admin', 'd1')).send({ active: false });
    expect(res.status).toBe(403);
    expect(await t.repo.getUser('d1')).toMatchObject({ active: true });
  });
});

describe('POST /api/users/self', () => {
  it('empty body creates a resident with users doc and claims {role, active:true}', async () => {
    const t = makeTestApp();
    const res = await self(t, 'Bearer new:u-new-1:ana.cruz@x.test');
    expect(res.status).toBe(201);
    expect(await t.repo.getUser('u-new-1')).toMatchObject({ role: 'resident', active: true, name: 'ana.cruz', phone: null });
    expect(await t.repo.getUser('u-new-1')).toHaveProperty('createdAt');
    expect(t.auth.calls.setCustomUserClaims.at(-1)).toEqual({ uid: 'u-new-1', claims: { role: 'resident', active: true } });
  });

  it('name defaults to "Resident" when the token has no email; sanitized name and phone are stored', async () => {
    const t = makeTestApp();
    await self(t, 'Bearer new:u-anon');
    expect((await t.repo.getUser('u-anon')).name).toBe('Resident');
    const res = await self(t, 'Bearer new:u-x:x@x.test', { name: ' <b>Ana</b> ', phone: '0917 123 4567' });
    expect(res.status).toBe(201);
    expect(await t.repo.getUser('u-x')).toMatchObject({ name: 'Ana', phone: '0917 123 4567' });
  });

  it('second call for the same account is idempotent: 200 and claims re-set', async () => {
    const t = makeTestApp();
    const token = 'Bearer new:u-2:two@x.test';
    expect((await self(t, token)).status).toBe(201);
    const again = await self(t, token);
    expect(again.status).toBe(200);
    expect(t.auth.calls.setCustomUserClaims.at(-1).claims).toEqual({ role: 'resident', active: true });
    expect(await t.repo.getUser('u-2')).toMatchObject({ role: 'resident', active: true });
  });

  it('a disabled account is never re-enabled by self-heal (409)', async () => {
    const t = makeTestApp();
    await t.repo.createUser('u-off', { name: 'Off', role: 'resident', active: false });
    expect((await self(t, 'Bearer new:u-off')).status).toBe(409);
    expect(t.auth.calls.setCustomUserClaims).toHaveLength(0);
    expect(await t.repo.getUser('u-off')).toMatchObject({ active: false });
  });

  it('an existing account with a non-resident role is refused (409)', async () => {
    const t = makeTestApp();
    await t.repo.createUser('u-staff', { name: 'Staff', role: 'dispatcher', active: true });
    expect((await self(t, 'Bearer new:u-staff')).status).toBe(409);
    expect(t.auth.calls.setCustomUserClaims).toHaveLength(0);
    expect(await t.repo.getUser('u-staff')).toMatchObject({ role: 'dispatcher' });
  });

  it('invalid name (empty, too long) and invalid phone return 400', async () => {
    const t = makeTestApp();
    expect((await self(t, 'Bearer new:u-3', { name: '<i></i>' })).status).toBe(400);
    expect((await self(t, 'Bearer new:u-3', { name: 'x'.repeat(101) })).status).toBe(400);
    expect((await self(t, 'Bearer new:u-3', { phone: 'call me' })).status).toBe(400);
    expect(await t.repo.getUser('u-3')).toBeNull();
  });

  it('requires a valid token (401); claimless tokens still fail closed on every other route', async () => {
    const t = makeTestApp();
    expect((await request(t.app).post('/api/users/self').send({})).status).toBe(401);
    expect((await request(t.app).get('/api/reports').set('Authorization', 'Bearer new:u-4')).body.error).toBe('account_disabled');
    expect((await request(t.app).get('/api/reports').set('Authorization', 'Bearer new:u-4')).status).toBe(403);
  });
});
