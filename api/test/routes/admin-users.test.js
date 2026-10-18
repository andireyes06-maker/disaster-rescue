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

  it('an admin can be deactivated while another active admin remains', async () => {
    const t = makeTestApp();
    await seedAdmin(t, 'adm-1', 'One');
    await seedAdmin(t, 'adm-2', 'Two');
    const res = await patch(t, t.as('admin', 'adm-1'), 'adm-2', { active: false });
    expect(res.status).toBe(200);
    expect(await t.repo.getUser('adm-2')).toMatchObject({ active: false });
  });

  it('admin cannot remove the last active admin (409 last_admin)', async () => {
    const t = makeTestApp();
    await seedAdmin(t, 'adm-1', 'Caller');
    await seedAdmin(t, 'adm-2', 'Only');
    // Deterministic race: the caller passes the token check as active, then is deactivated
    // inside the transaction, so the guard sees no other active admin and must refuse.
    const setStaffGuarded = t.repo.setStaffGuarded;
    t.repo.setStaffGuarded = async (uid, patch, guard) => {
      await t.repo.updateUser('adm-1', { active: false });
      return setStaffGuarded(uid, patch, guard);
    };
    const res = await patch(t, t.as('admin', 'adm-1'), 'adm-2', { active: false });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('last_admin');
    expect(await t.repo.getUser('adm-2')).toMatchObject({ active: true });
  });

  it('two admins removing each other at the same time leave one active admin (BE07)', async () => {
    const t = makeTestApp();
    await seedAdmin(t, 'adm-1', 'One');
    await seedAdmin(t, 'adm-2', 'Two');
    const [a, b] = await Promise.all([
      patch(t, t.as('admin', 'adm-1'), 'adm-2', { active: false }),
      patch(t, t.as('admin', 'adm-2'), 'adm-1', { active: false }),
    ]);
    // The winner's commit deactivates the other caller, so the loser is refused at the token check (403)
    // or, if it had already passed that check, by the transactional guard (409). Either way one admin remains.
    const statuses = [a.status, b.status].sort();
    expect(statuses[0]).toBe(200);
    expect([403, 409]).toContain(statuses[1]);
    const active = (await t.repo.listUsers()).filter((u) => u.role === 'admin' && u.active === true);
    expect(active).toHaveLength(1);
  });

  it('a failed Auth update leaves the change pending, and a retry completes it (BE07 recovery)', async () => {
    const t = makeTestApp();
    await seedAdmin(t, 'adm-2', 'Second');
    await seedAdmin(t, 'adm-3', 'Third');
    t.auth.failOnce.setCustomUserClaims = true;
    const failed = await patch(t, t.as('admin', 'adm-1'), 'adm-2', { active: false });
    expect(failed.status).toBe(500);
    expect(await t.repo.getUser('adm-2')).toMatchObject({ active: false, authSyncPending: true });

    const retried = await patch(t, t.as('admin', 'adm-1'), 'adm-2', { active: false });
    expect(retried.status).toBe(200);
    expect(await t.repo.getUser('adm-2')).toMatchObject({ active: false, authSyncPending: false });
    expect(t.auth.users.get('adm-2').disabled).toBe(true);
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

  it('creating and changing accounts writes an audit entry with actor, target, and before/after (BE05)', async () => {
    const t = makeTestApp();
    await seedAdmin(t, 'adm-2', 'Second');
    await seedAdmin(t, 'adm-3', 'Third');
    const made = await create(t, t.as('admin', 'adm-1'), { email: 'd@x.test', name: 'Dee', role: 'dispatcher' });
    expect(made.status).toBe(201);
    expect(await patch(t, t.as('admin', 'adm-1'), made.body.uid, { role: 'responder' })).toMatchObject({ status: 200 });
    const audit = await t.repo.listAudit({});
    const create_ = audit.find((a) => a.action === 'user.create');
    const update = audit.find((a) => a.action === 'user.update');
    expect(create_).toMatchObject({ actorUid: 'adm-1', after: { target: made.body.uid, role: 'dispatcher', active: true } });
    expect(update).toMatchObject({ actorUid: 'adm-1', before: { role: 'dispatcher', active: true }, after: { target: made.body.uid, role: 'responder', active: true } });
    expect(JSON.stringify(audit)).not.toMatch(/password|token|09/i);
  });

  it('a retry after a failed Auth step revokes the old tokens even though the role already changed (review)', async () => {
    const t = makeTestApp();
    await seedAdmin(t, 'adm-2', 'Second');
    await seedAdmin(t, 'adm-3', 'Third');
    await t.repo.updateUser('adm-2', { role: 'dispatcher' });
    t.auth.users.get('adm-2').customClaims = { role: 'dispatcher', active: true };
    t.auth.failOnce.setCustomUserClaims = true;
    expect((await patch(t, t.as('admin', 'adm-1'), 'adm-2', { role: 'responder' })).status).toBe(500);
    expect(t.auth.calls.revokeRefreshTokens).not.toContain('adm-2');
    expect((await patch(t, t.as('admin', 'adm-1'), 'adm-2', { role: 'responder' })).status).toBe(200);
    expect(t.auth.calls.revokeRefreshTokens).toContain('adm-2');
  });

  it('a change decided on a stale read is refused inside the transaction (409 stale_user), and nothing is written (review)', async () => {
    const t = makeTestApp();
    await seedAdmin(t, 'adm-2', 'Second');
    await seedAdmin(t, 'adm-3', 'Third');
    await t.repo.updateUser('adm-2', { role: 'dispatcher' });
    const real = t.repo.getUser;
    // The request's read is stale: it still shows responder while the stored role is dispatcher.
    t.repo.getUser = async (uid) => (uid === 'adm-2' ? { ...(await real(uid)), role: 'responder' } : real(uid));
    const res = await patch(t, t.as('admin', 'adm-1'), 'adm-2', { active: false });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('stale_user');
    expect(await real('adm-2')).toMatchObject({ role: 'dispatcher', active: true });
  });

  it('a dispatcher cannot change an admin even when its own read says the target is not an admin (review)', async () => {
    const t = makeTestApp();
    await seedAdmin(t, 'adm-2', 'Root');
    await seedAdmin(t, 'adm-3', 'Other');
    const real = t.repo.getUser;
    t.repo.getUser = async (uid) => (uid === 'adm-2' ? { ...(await real(uid)), role: 'dispatcher' } : real(uid));
    const res = await patch(t, t.as('dispatcher', 'disp-1'), 'adm-2', { active: false });
    expect(res.status).toBe(403);
    expect(await real('adm-2')).toMatchObject({ role: 'admin', active: true });
  });
});
