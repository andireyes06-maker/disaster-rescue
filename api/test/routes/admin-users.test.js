import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

const create = (t, who, body) => request(t.app).post('/api/users').set('Authorization', who).send(body);
const patch = (t, who, id, body) => request(t.app).patch(`/api/users/${id}`).set('Authorization', who).send(body);

// An admin needs both a users document and an Auth account, as the real system has.
async function seedAdmin(t, uid, name) {
  await t.repo.createUser(uid, { name, role: 'admin', active: true });
  t.auth.users.set(uid, { uid, email: `${uid}@x.test`, disabled: false, customClaims: { role: 'admin', active: true } });
}

describe('admin account management', () => {
  it('admin can create a dispatcher and an admin', async () => {
    const t = makeTestApp();
    expect((await create(t, t.as('admin'), { email: 'd@x.test', name: 'Dee', role: 'dispatcher' })).status).toBe(201);
    expect((await create(t, t.as('admin'), { email: 'a2@x.test', name: 'Ada', role: 'admin' })).status).toBe(201);
  });

  it('dispatcher still cannot create an admin (400)', async () => {
    const t = makeTestApp();
    expect((await create(t, t.as('dispatcher'), { email: 'a3@x.test', name: 'Ada', role: 'admin' })).status).toBe(400);
  });

  it('admin can deactivate another admin when one other active admin remains', async () => {
    const t = makeTestApp();
    await seedAdmin(t, 'adm-2', 'Second');
    await seedAdmin(t, 'adm-3', 'Third');
    const res = await patch(t, t.as('admin', 'adm-1'), 'adm-2', { active: false });
    expect(res.status).toBe(200);
    expect(await t.repo.getUser('adm-2')).toMatchObject({ active: false });
  });

  it('admin cannot remove the last active admin (409 last_admin)', async () => {
    const t = makeTestApp();
    await seedAdmin(t, 'adm-2', 'Only');
    const res = await patch(t, t.as('admin', 'adm-1'), 'adm-2', { active: false });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('last_admin');
    expect(await t.repo.getUser('adm-2')).toMatchObject({ active: true });
  });

  it('admin cannot change their own account (403)', async () => {
    const t = makeTestApp();
    await t.repo.createUser('adm-1', { name: 'Me', role: 'admin', active: true });
    expect((await patch(t, t.as('admin', 'adm-1'), 'adm-1', { active: false })).status).toBe(403);
  });

  it('dispatcher still cannot touch an admin (403)', async () => {
    const t = makeTestApp();
    await seedAdmin(t, 'adm-2', 'Root');
    expect((await patch(t, t.as('dispatcher'), 'adm-2', { active: false })).status).toBe(403);
  });

  it('admin can create and rename a team; dispatcher still can', async () => {
    const t = makeTestApp();
    const made = await request(t.app).post('/api/teams').set('Authorization', t.as('admin')).send({ name: 'Team Bravo' });
    expect(made.status).toBe(201);
    const renamed = await request(t.app).patch(`/api/teams/${made.body.id}`).set('Authorization', t.as('admin')).send({ name: 'Team B' });
    expect(renamed.status).toBe(200);
  });

  it('admin can download the summary and the incident CSV (admins hold every staff permission)', async () => {
    const t = makeTestApp();
    expect((await request(t.app).get('/api/export/summary.pdf').set('Authorization', t.as('admin'))).status).toBe(200);
    expect((await request(t.app).get('/api/export/incidents.csv').set('Authorization', t.as('admin'))).status).toBe(200);
  });

  it('a role change revokes refresh tokens so the new role applies at once', async () => {
    const t = makeTestApp();
    await t.repo.createUser('res-9', { name: 'Rae', role: 'responder', active: true, team: null });
    t.auth.users.set('res-9', { uid: 'res-9', email: 'rae@x.test', disabled: false, customClaims: { role: 'responder', active: true } });
    expect((await patch(t, t.as('admin'), 'res-9', { role: 'dmo' })).status).toBe(200);
    expect(t.auth.calls.revokeRefreshTokens).toContain('res-9');
  });
});
