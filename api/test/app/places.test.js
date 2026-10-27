import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';
describe('place reverse endpoint', () => {
  it('requires a current authorized account and validates the point before contacting the provider', async () => {
    const lookup = vi.fn(async () => 'Harbor'); const t = makeTestApp({ placeLookup: lookup });
    expect((await request(t.app).get('/api/places/reverse?lat=14&lng=120')).status).toBe(401);
    expect((await request(t.app).get('/api/places/reverse?lat=91&lng=120').set('Authorization', t.as('admin'))).status).toBe(400);
    expect((await request(t.app).get('/api/places/reverse?lat=&lng=120').set('Authorization', t.as('admin'))).status).toBe(400);
    expect((await request(t.app).get('/api/places/reverse?lat=14&lng=120').set('Authorization', t.as('resident'))).status).toBe(403);
    expect(lookup).not.toHaveBeenCalled();
    const res = await request(t.app).get('/api/places/reverse?lat=14&lng=120').set('Authorization', t.as('admin'));
    expect(res.status).toBe(200); expect(res.body).toMatchObject({ placeName: 'Harbor', approximate: true });
    await t.repo.updateUser('admin-1', { active: false });
    expect((await request(t.app).get('/api/places/reverse?lat=14&lng=120').set('Authorization', t.as('admin'))).status).toBe(403);
    expect(lookup).toHaveBeenCalledTimes(1);
  });
});
