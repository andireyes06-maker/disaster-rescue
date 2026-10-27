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
