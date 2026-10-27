import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';
import { createFakeSender } from '../fakes/fakeSender.js';

const seedReport = (t, over = {}) => t.repo.createReport({
  type: 'flood', description: 'Water rising', status: 'Awaiting Assignment', verified: true, priority: 'medium',
  location: { lat: 14.8512, lng: 120.8123, source: 'gps' }, coarseLocation: { lat: 14.85, lng: 120.81 },
  reporterId: 'res-1', photos: [], reference: 'DR-AAAAAA', ...over,
});

describe('POST /api/devices', () => {
  it('rejects an empty token with 400', async () => {
    const t = makeTestApp();
    const r = await request(t.app).post('/api/devices').set('Authorization', t.as('resident', 'res-1')).send({ token: '   ' });
    expect(r.status).toBe(400);
    expect(await t.repo.listDevices('res-1')).toEqual([]);
  });

  it('rejects a token longer than 4096 characters with 400', async () => {
    const t = makeTestApp();
    const r = await request(t.app).post('/api/devices').set('Authorization', t.as('resident', 'res-1')).send({ token: 'x'.repeat(4097) });
    expect(r.status).toBe(400);
  });

  it('accepts a valid token and is idempotent', async () => {
    const t = makeTestApp();
    const auth = t.as('resident', 'res-1');
    expect((await request(t.app).post('/api/devices').set('Authorization', auth).send({ token: 'tok-ok' })).status).toBe(200);
    expect((await request(t.app).post('/api/devices').set('Authorization', auth).send({ token: 'tok-ok' })).status).toBe(200);
    expect(await t.repo.listDevices('res-1')).toEqual(['tok-ok']);
  });

  it('a token held by another account moves to the account signed in on the phone', async () => {
    const t = makeTestApp();
    await t.repo.addDevice('res-1', 'tok-phone');
    const r = await request(t.app).post('/api/devices').set('Authorization', t.as('resident', 'res-2')).send({ token: 'tok-phone' });
    expect(r.status).toBe(200);
    expect(await t.repo.listDevices('res-1')).toEqual([]);
    expect(await t.repo.listDevices('res-2')).toEqual(['tok-phone']);
  });
});

describe('DELETE /api/devices/:token', () => {
  it('the owner can remove their token (sign-out); another user gets 404 and the token stays', async () => {
    const t = makeTestApp();
    await t.repo.addDevice('res-1', 'tok-1');
    expect((await request(t.app).delete('/api/devices/tok-1').set('Authorization', t.as('resident', 'res-2'))).status).toBe(404);
    expect(await t.repo.listDevices('res-1')).toEqual(['tok-1']);
    expect((await request(t.app).delete('/api/devices/tok-1').set('Authorization', t.as('resident', 'res-1'))).status).toBe(200);
    expect(await t.repo.listDevices('res-1')).toEqual([]);
  });
});

describe('GET /api/notifications', () => {
  it('returns only the caller\'s own notifications', async () => {
    const t = makeTestApp();
    await t.repo.addNotification({ recipientUid: 'res-1', title: 'mine', body: 'b', read: false });
    await t.repo.addNotification({ recipientUid: 'res-2', title: 'theirs', body: 'b', read: false });
    const r = await request(t.app).get('/api/notifications').set('Authorization', t.as('resident', 'res-1'));
    expect(r.status).toBe(200);
    expect(r.body.map((n) => n.title)).toEqual(['mine']);
  });
});

describe('PATCH /api/notifications/:id/read', () => {
  it('lets the owner mark a notification read', async () => {
    const t = makeTestApp();
    const id = await t.repo.addNotification({ recipientUid: 'res-1', title: 'x', body: 'b', read: false });
    const r = await request(t.app).patch(`/api/notifications/${id}/read`).set('Authorization', t.as('resident', 'res-1'));
    expect(r.status).toBe(200);
    expect((await t.repo.listNotifications('res-1'))[0].read).toBe(true);
  });

  it('returns 404 (not 403) when another user tries to mark it read, and leaves it unread', async () => {
    const t = makeTestApp();
    const id = await t.repo.addNotification({ recipientUid: 'res-1', title: 'x', body: 'b', read: false });
    const r = await request(t.app).patch(`/api/notifications/${id}/read`).set('Authorization', t.as('resident', 'res-2'));
    expect(r.status).toBe(404);
    expect((await t.repo.listNotifications('res-1'))[0].read).toBe(false);
  });
});

describe('report operations survive a notification failure', () => {
  it('assign still returns 200 and the in-app notification is stored when the sender throws', async () => {
    const t = makeTestApp({ sender: createFakeSender({ throws: true }) });
    await t.repo.saveTeam('tA', { name: 'Team A', busy: false });
    await t.repo.createUser('rsp-a', { name: 'Rafa', role: 'responder', team: 'tA', active: true });
    const id = await seedReport(t);
    const r = await request(t.app).post(`/api/reports/${id}/assign`)
      .set('Authorization', t.as('admin', 'd1')).send({ teamId: 'tA' });
    expect(r.status).toBe(200);
    expect(await t.repo.getReport(id)).toMatchObject({ status: 'Team Assigned', assignedTeamId: 'tA' });
    expect(await t.repo.listNotifications('res-1')).toHaveLength(1);
  });
});

// Invalid Firestore document identities are input errors, never server failures.
it.each(['.', '..', '__reserved__', 'path/token', 'x'.repeat(1501)])('refuses an unsupported device identity (%s)', async token => {
 const t = makeTestApp();
 const r = await request(t.app).post('/api/devices').set('Authorization', t.as('resident', 'identity-check')).send({token});
 expect(r.status).toBe(400); expect(await t.repo.listDevices('identity-check')).toEqual([]);
});
