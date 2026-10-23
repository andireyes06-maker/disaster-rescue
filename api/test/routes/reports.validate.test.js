import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

const base = {
  type: 'flood', description: 'Water rising', status: 'Submitted', verified: false, priority: 'medium',
  location: { lat: 14.8512, lng: 120.8123, source: 'gps' }, coarseLocation: { lat: 14.85, lng: 120.81 },
  contact: { name: 'Ana', phone: '09171234567' }, reporterId: 'res-1', photos: [], reference: 'DR-AAAAAA',
};
const seed = (t, over = {}) => t.repo.createReport({ ...base, ...over });
const validate = (t, id, who) => request(t.app).patch(`/api/reports/${id}/verify`).set('Authorization', who);
const audits = (t, id) => t.repo.listAudit({ reportId: id });

describe('manual validation', () => {
  it('admin validates a submitted report and the validator and time are recorded', async () => {
    const t = makeTestApp();
    await t.repo.createUser('admin-1', { role: 'admin', name: 'Admin Ana' });
    const id = await seed(t);
    const res = await validate(t, id, t.as('admin'));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ verified: true, status: 'Awaiting Assignment', verifiedBy: { uid: 'admin-1', name: 'Admin Ana' } });
    expect(res.body.verifiedAt).toBeTruthy();
    const stored = await t.repo.getReport(id);
    expect(stored).toMatchObject({ verified: true, verifiedBy: { uid: 'admin-1', name: 'Admin Ana' } });
    expect(stored.verifiedAt).toBeInstanceOf(Date);
  });

  it('validating twice gives 409, keeps the first validator, and writes one validation audit entry', async () => {
    const t = makeTestApp();
    await t.repo.createUser('admin-1', { role: 'admin', name: 'Admin Ana' });
    await t.repo.createUser('admin-2', { role: 'admin', name: 'Admin Ben' });
    const id = await seed(t);
    expect((await validate(t, id, t.as('admin'))).status).toBe(200);
    const again = await validate(t, id, t.as('admin', 'admin-2'));
    expect(again.status).toBe(409);
    expect((await t.repo.getReport(id)).verifiedBy).toMatchObject({ uid: 'admin-1' });
    expect((await audits(t, id)).filter((a) => a.action === 'report.verify')).toHaveLength(1);
  });

  it.each(['resident', 'responder', 'dispatcher', 'dmo'])('%s cannot validate a report', async (role) => {
    const t = makeTestApp();
    const id = await seed(t);
    const res = await validate(t, id, t.as(role));
    expect(res.status).toBe(403);
    expect((await t.repo.getReport(id)).verified).toBe(false);
  });
});
