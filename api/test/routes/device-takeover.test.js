import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

describe('a phone that signs in to another account takes its push token over', () => {
  it('the new account owns the token, and the previous account can no longer remove it', async () => {
    const t = makeTestApp();
    expect((await request(t.app).post('/api/devices').set('Authorization', t.as('resident', 'res-a')).send({ token: 'phone-1' })).status).toBe(200);
    expect((await request(t.app).post('/api/devices').set('Authorization', t.as('resident', 'res-b')).send({ token: 'phone-1' })).status).toBe(200);
    expect(await t.repo.getDeviceOwner('phone-1')).toBe('res-b');
    const removedByOld = await request(t.app).delete('/api/devices/phone-1').set('Authorization', t.as('resident', 'res-a'));
    expect(removedByOld.status).toBe(404);
    expect(await t.repo.getDeviceOwner('phone-1')).toBe('res-b');
  });
});

describe('a takeover is recorded and the previous account is told', () => {
  it('writes one audit row without the token and one notice to the previous account', async () => {
    const t = makeTestApp();
    await request(t.app).post('/api/devices').set('Authorization', t.as('resident', 'res-a')).send({ token: 'phone-secret-token' });
    await request(t.app).post('/api/devices').set('Authorization', t.as('resident', 'res-b')).send({ token: 'phone-secret-token' });
    const audits = await t.repo.listAudit({ action: 'device.takeover' });
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ actorUid: 'res-b', target: { uid: 'res-a' } });
    expect(JSON.stringify(audits)).not.toContain('phone-secret-token');
    const notes = await t.repo.listNotifications('res-a');
    expect(notes.some((n) => n.title === 'Phone signed in to another account')).toBe(true);
  });

  it('a first registration writes no takeover record', async () => {
    const t = makeTestApp();
    await request(t.app).post('/api/devices').set('Authorization', t.as('resident', 'res-a')).send({ token: 'new-phone' });
    expect(await t.repo.listAudit({ action: 'device.takeover' })).toHaveLength(0);
  });
});
