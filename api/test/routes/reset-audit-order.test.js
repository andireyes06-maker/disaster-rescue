import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

describe('a help-request reset writes its audit row before the request is closed', () => {
  it('when the audit write fails, the request stays open for a safe retry', async () => {
    const t = makeTestApp();
    await t.auth.createUser({ email: 'staff@example.test', password: 'old-password-1' });
    await request(t.app).post('/api/auth/reset-help').send({ email: 'staff@example.test' });
    const [row] = await t.repo.listPasswordHelp();
    const spy = vi.spyOn(t.repo, 'addAudit').mockRejectedValueOnce(new Error('audit down'));
    const failed = await request(t.app).post(`/api/auth/reset-help/${row.id}/reset-password`).set('Authorization', t.as('admin')).send({});
    expect(failed.status).toBe(500);
    expect((await t.repo.listPasswordHelp()).map((r) => r.id)).toContain(row.id);
    spy.mockRestore();
    const retry = await request(t.app).post(`/api/auth/reset-help/${row.id}/reset-password`).set('Authorization', t.as('admin')).send({});
    expect(retry.status).toBe(200);
    expect(await t.repo.listPasswordHelp()).toHaveLength(0);
    const audits = await t.repo.listAudit({ action: 'password-help.reset' });
    expect(audits.length).toBe(1);
  });
});
