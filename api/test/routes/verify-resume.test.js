import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

describe('a verify that stopped after the Verified step can be finished by a retry', () => {
  it('finishes the report once, with one verify audit row', async () => {
    const t = makeTestApp();
    const id = await t.repo.createReport({
      type: 'flood', status: 'Verified', verified: true,
      verifiedBy: { uid: 'admin-1', name: 'Admin' }, verifiedAt: new Date('2026-10-27T10:00:00Z'),
      reporterId: 'res-1', location: { lat: 14.8, lng: 120.8 }, photos: [],
    });
    const res = await request(t.app).patch(`/api/reports/${id}/verify`).set('Authorization', t.as('admin'));
    expect(res.status).toBe(200);
    const after = await t.repo.getReport(id);
    expect(after.status).toBe('Awaiting Assignment');
    const audits = await t.repo.listAudit({ action: 'report.verify' });
    expect(audits.filter((a) => a.reportId === id).length).toBe(1);
  });
});
