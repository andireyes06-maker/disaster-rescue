import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

describe('password help requests', () => {
  it('answers the same way for any email and stores one open request per email', async () => {
    const t = makeTestApp();
    const a = await request(t.app).post('/api/auth/reset-help').send({ email: 'Staff@Example.test' });
    const b = await request(t.app).post('/api/auth/reset-help').send({ email: 'staff@example.test' });
    expect(a.status).toBe(202);
    expect(b.status).toBe(202);
    const rows = await t.repo.listPasswordHelp();
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe('staff@example.test');
  });

  it('refuses an invalid email', async () => {
    const t = makeTestApp();
    expect((await request(t.app).post('/api/auth/reset-help').send({ email: 'nope' })).status).toBe(400);
  });

  it('only an administrator can list and close requests', async () => {
    const t = makeTestApp();
    const teams = { a: t.as('responder', 'tA') };
    await request(t.app).post('/api/auth/reset-help').send({ email: 'staff@example.test' });
    expect((await request(t.app).get('/api/auth/reset-help').set('Authorization', teams.a)).status).toBe(403);
    const list = await request(t.app).get('/api/auth/reset-help').set('Authorization', t.as('admin'));
    expect(list.status).toBe(200);
    expect(list.body[0]).toMatchObject({ email: 'staff@example.test' });
    const closed = await request(t.app).post(`/api/auth/reset-help/${list.body[0].id}/close`).set('Authorization', t.as('admin'));
    expect(closed.status).toBe(200);
    expect(await t.repo.listPasswordHelp()).toHaveLength(0);
  });
});
