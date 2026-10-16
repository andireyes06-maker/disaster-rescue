import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

describe('admin endpoints', () => {
  it.each([
    ['GET', '/api/admin/health'],
    ['GET', '/api/admin/settings'],
    ['PUT', '/api/admin/settings'],
  ])('%s %s refuses a dispatcher with 403', async (method, path) => {
    const t = makeTestApp();
    const res = await request(t.app)[method.toLowerCase()](path).set('Authorization', t.as('dispatcher')).send({ hotline: '0917', residentNotice: 'x' });
    expect(res.status).toBe(403);
  });

  it('GET /health answers for an admin with api and firestore status', async () => {
    const t = makeTestApp();
    const res = await request(t.app).get('/api/admin/health').set('Authorization', t.as('admin'));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ api: 'ok', firestore: 'ok' });
    expect(typeof res.body.checkedAt).toBe('string');
  });

  it('GET /settings returns the editable hotline and resident notice', async () => {
    const t = makeTestApp();
    await t.repo.saveHotlines({ numbers: [{ label: 'LDRRMO', number: '000-0000', editable: true }], residentNotice: 'Old notice' });
    const res = await request(t.app).get('/api/admin/settings').set('Authorization', t.as('admin'));
    expect(res.body).toEqual({ hotline: '000-0000', residentNotice: 'Old notice' });
  });

  it('PUT /settings rejects a resident notice over 500 characters', async () => {
    const t = makeTestApp();
    const res = await request(t.app).put('/api/admin/settings').set('Authorization', t.as('admin'))
      .send({ hotline: '0917', residentNotice: 'x'.repeat(501) });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validation_failed');
  });

  it('PUT /settings saves and writes one audit entry', async () => {
    const t = makeTestApp();
    const res = await request(t.app).put('/api/admin/settings').set('Authorization', t.as('admin'))
      .send({ hotline: '0917-123-4567', residentNotice: 'A report does not guarantee rescue.' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ hotline: '0917-123-4567', residentNotice: 'A report does not guarantee rescue.' });
    const audits = await t.repo.listAudit({});
    expect(audits.filter((a) => a.action === 'settings.update')).toHaveLength(1);
  });
});
