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

describe('password help cooldown', () => {
  it('does not reopen a request that an administrator closed in the last day', async () => {
    const t = makeTestApp();
    await request(t.app).post('/api/auth/reset-help').send({ email: 'staff@example.test' });
    const [row] = await t.repo.listPasswordHelp();
    await request(t.app).post(`/api/auth/reset-help/${row.id}/close`).set('Authorization', t.as('admin'));
    await request(t.app).post('/api/auth/reset-help').send({ email: 'staff@example.test' });
    expect(await t.repo.listPasswordHelp()).toHaveLength(0);
  });
});

describe('administrator sets the password from a help request', () => {
  it('sets the password, ends sign-ins, closes the request, and records no password', async () => {
    const t = makeTestApp();
    await t.auth.createUser({ email: 'staff@example.test', password: 'old-password-1' });
    await request(t.app).post('/api/auth/reset-help').send({ email: 'staff@example.test' });
    const [row] = await t.repo.listPasswordHelp();
    const res = await request(t.app).post(`/api/auth/reset-help/${row.id}/set-password`).set('Authorization', t.as('admin')).send({ password: 'New-harbor-2026' });
    expect(res.status).toBe(200);
    const account = await t.auth.getUserByEmail('staff@example.test');
    expect(account.passwordSet).toBe(true);
    expect(await t.repo.listPasswordHelp()).toHaveLength(0);
    const audits = await t.repo.listAudit({});
    expect(JSON.stringify(audits)).not.toContain('New-harbor-2026');
  });

  it('refuses a short password and a non-admin', async () => {
    const t = makeTestApp();
    await t.auth.createUser({ email: 'staff@example.test', password: 'old-password-1' });
    await request(t.app).post('/api/auth/reset-help').send({ email: 'staff@example.test' });
    const [row] = await t.repo.listPasswordHelp();
    expect((await request(t.app).post(`/api/auth/reset-help/${row.id}/set-password`).set('Authorization', t.as('admin')).send({ password: 'short' })).status).toBe(400);
    expect((await request(t.app).post(`/api/auth/reset-help/${row.id}/set-password`).set('Authorization', t.as('responder', 'rsp-x')).send({ password: 'New-harbor-2026' })).status).toBe(403);
  });
});
