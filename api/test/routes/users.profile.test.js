import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

const read = (t, who, id) => request(t.app).get(`/api/users/${id}`).set('Authorization', who);

async function seedResident(t) {
  await t.repo.createUser('res-42', {
    name: 'Maria Santos', email: 'maria@x.test', phone: '+639170000000', role: 'resident', active: true, team: null,
    password: 'never-shown', passwordHash: 'hash', photo: { publicId: 'secret-public-id', url: 'https://fake.cdn/maria.jpg', updatedAt: new Date() },
  });
}

describe('GET /api/users/:id (administrator reads a submitter profile)', () => {
  it('admin reads a user', async () => {
    const t = makeTestApp();
    await seedResident(t);
    const res = await read(t, t.as('admin'), 'res-42');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      uid: 'res-42', name: 'Maria Santos', email: 'maria@x.test', phone: '+639170000000', role: 'resident', active: true,
      photoUrl: 'https://fake.cdn/maria.jpg',
    });
  });

  it('resident, responder get 403', async () => {
    const t = makeTestApp();
    await seedResident(t);
    expect((await read(t, t.as('resident'), 'res-42')).status).toBe(403);
    expect((await read(t, t.as('responder'), 'res-42')).status).toBe(403);
  });

  it('unknown id gives 404', async () => {
    const t = makeTestApp();
    const res = await read(t, t.as('admin'), 'nobody-here');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not_found');
  });

  it('response has no password or photo.publicId', async () => {
    const t = makeTestApp();
    await seedResident(t);
    const res = await read(t, t.as('admin'), 'res-42');
    expect(Object.keys(res.body).sort()).toEqual(['active', 'email', 'name', 'phone', 'photoUrl', 'role', 'uid']);
    const text = JSON.stringify(res.body);
    expect(text).not.toContain('never-shown');
    expect(text).not.toContain('secret-public-id');
    expect(text).not.toContain('password');
  });
});
