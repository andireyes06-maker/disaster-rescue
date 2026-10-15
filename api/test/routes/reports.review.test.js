import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

const base = {
  type: 'flood', description: 'Water rising', status: 'Submitted', verified: false, priority: 'medium',
  location: { lat: 14.8512, lng: 120.8123, source: 'gps' }, coarseLocation: { lat: 14.85, lng: 120.81 },
  contact: { name: 'Ana', phone: '09171234567' }, reporterId: 'res-1', photos: [], reference: 'DR-AAAAAA',
};
const seed = (t, over = {}) => t.repo.createReport({ ...base, ...over });
const patch = (t, id, path, who, body) => request(t.app).patch(`/api/reports/${id}/${path}`).set('Authorization', who).send(body ?? {});
const audits = (t, id) => t.repo.listAudit({ reportId: id });

describe('review endpoints', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('resident A gets 404, not 403, for resident B report', async () => {
    const t = makeTestApp();
    const id = await seed(t, { reporterId: 'res-b' });
    const res = await request(t.app).get(`/api/reports/${id}`).set('Authorization', t.as('resident', 'res-a'));
    expect(res.status).toBe(404);
    expect((await request(t.app).get('/api/reports/nope').set('Authorization', t.as('dispatcher'))).status).toBe(404);
  });

  it('public projection of verified reports hides contact and exact location', async () => {
    const t = makeTestApp();
    const id = await seed(t, { reporterId: 'res-b', status: 'Verified', verified: true });
    const res = await request(t.app).get(`/api/reports/${id}`).set('Authorization', t.as('resident', 'res-a'));
    expect(res.status).toBe(200);
    expect(res.body.contact).toBeUndefined();
    expect(res.body.location).toBeUndefined();
    expect(res.body.coarseLocation).toBeDefined();
    const list = await request(t.app).get('/api/reports').set('Authorization', t.as('resident', 'res-a'));
    expect(list.body).toHaveLength(0);
  });

  it('list is role scoped and filterable', async () => {
    const t = makeTestApp();
    await seed(t); await seed(t, { type: 'fire', priority: 'high', reporterId: 'res-2' });
    const d = await request(t.app).get('/api/reports?type=fire').set('Authorization', t.as('dispatcher'));
    expect(d.body).toHaveLength(1);
    expect((await request(t.app).get('/api/reports?priority=high').set('Authorization', t.as('dmo'))).body).toHaveLength(1);
    expect((await request(t.app).get('/api/reports?verified=true').set('Authorization', t.as('dmo'))).body).toHaveLength(0);
    const r = await request(t.app).get('/api/reports').set('Authorization', t.as('resident', 'res-1'));
    expect(r.body).toHaveLength(1);
    expect(r.body[0].contact).toBeDefined();
  });

  it('responder lists only reports of their own team', async () => {
    const t = makeTestApp();
    await t.repo.createUser('rsp-1', { role: 'responder', team: 'tA' });
    await seed(t, { assignedTeamId: 'tA', status: 'Team Assigned' });
    await seed(t, { assignedTeamId: 'tB', status: 'Team Assigned' });
    await seed(t);
    const res = await request(t.app).get('/api/reports').set('Authorization', t.as('responder', 'rsp-1'));
    expect(res.body).toHaveLength(1);
    expect(res.body[0].assignedTeamId).toBe('tA');
  });

  it('verify from Submitted ends Awaiting Assignment with 4 audit entries', async () => {
    const t = makeTestApp();
    const id = await seed(t);
    const res = await patch(t, id, 'verify', t.as('dispatcher'));
    expect(res.status).toBe(200);
    expect(await t.repo.getReport(id)).toMatchObject({ status: 'Awaiting Assignment', verified: true });
    const a = await audits(t, id);
    expect(a).toHaveLength(4);
    expect(a.filter((x) => x.action === 'status.change')).toHaveLength(3);
    expect(a.filter((x) => x.action === 'report.verify')).toHaveLength(1);
  });

  it('verify from Under Verification gives 3 audit entries; notifies reporter', async () => {
    const notifier = { notifyUsers: vi.fn(async () => {}), notifyRole: vi.fn(async () => {}) };
    const t = makeTestApp({ notifier });
    const id = await seed(t, { status: 'Under Verification' });
    expect((await patch(t, id, 'verify', t.as('dispatcher'))).status).toBe(200);
    expect(await audits(t, id)).toHaveLength(3);
    expect(notifier.notifyUsers).toHaveBeenCalledWith(['res-1'], expect.objectContaining({ reportId: id }));
  });

  it('verify from Verified or Resolved is 409; unknown id is 404', async () => {
    const t = makeTestApp();
    for (const status of ['Verified', 'Resolved']) {
      const id = await seed(t, { status });
      expect((await patch(t, id, 'verify', t.as('dispatcher'))).status).toBe(409);
    }
    expect((await patch(t, 'nope', 'verify', t.as('dispatcher'))).status).toBe(404);
    expect((await patch(t, 'nope', 'priority', t.as('dispatcher'), { priority: 'low' })).status).toBe(404);
  });

  it('reject: reason required, stored and audited', async () => {
    const t = makeTestApp();
    const id = await seed(t);
    expect((await patch(t, id, 'reject', t.as('dispatcher'), {})).status).toBe(400);
    expect((await patch(t, id, 'reject', t.as('dispatcher'), { reason: '   ' })).status).toBe(400);
    expect((await patch(t, id, 'reject', t.as('dispatcher'), { reason: 'x'.repeat(501) })).status).toBe(400);
    const res = await patch(t, id, 'reject', t.as('dispatcher'), { reason: '<b>Prank</b> call' });
    expect(res.status).toBe(200);
    expect(await t.repo.getReport(id)).toMatchObject({ status: 'Rejected', rejectionReason: 'Prank call' });
    expect((await audits(t, id)).length).toBeGreaterThanOrEqual(2);
  });

  it('duplicate: self and unknown are 400; valid works', async () => {
    const t = makeTestApp();
    const id = await seed(t); const other = await seed(t);
    expect((await patch(t, id, 'duplicate', t.as('dispatcher'), { duplicateOf: id })).status).toBe(400);
    expect((await patch(t, id, 'duplicate', t.as('dispatcher'), { duplicateOf: 'ghost' })).status).toBe(400);
    expect((await patch(t, id, 'duplicate', t.as('dispatcher'), { duplicateOf: other })).status).toBe(200);
    expect(await t.repo.getReport(id)).toMatchObject({ status: 'Duplicate', duplicateOf: other });
  });

  it('priority change is audited with before and after; invalid is 400', async () => {
    const t = makeTestApp();
    const id = await seed(t);
    expect((await patch(t, id, 'priority', t.as('dispatcher'), { priority: 'urgent' })).status).toBe(400);
    expect((await patch(t, id, 'priority', t.as('dispatcher'), { priority: 'critical' })).status).toBe(200);
    const a = (await audits(t, id)).find((x) => x.action === 'priority.change');
    expect(a.before).toEqual({ priority: 'medium' });
    expect(a.after).toEqual({ priority: 'critical' });
  });

  it('classify validates and audits', async () => {
    const t = makeTestApp();
    const id = await seed(t);
    expect((await patch(t, id, 'classify', t.as('dispatcher'), { classification: '' })).status).toBe(400);
    expect((await patch(t, id, 'classify', t.as('dispatcher'), { classification: 'x'.repeat(101) })).status).toBe(400);
    expect((await patch(t, id, 'classify', t.as('dispatcher'), { classification: 'Flash flood' })).status).toBe(200);
    expect((await audits(t, id)).some((x) => x.action === 'report.classify')).toBe(true);
  });

  it('cancel: own Submitted only; others get 404; 409 after verify', async () => {
    const notifier = { notifyUsers: vi.fn(async () => {}), notifyRole: vi.fn(async () => {}) };
    const t = makeTestApp({ notifier });
    const id = await seed(t);
    expect((await patch(t, id, 'cancel', t.as('resident', 'res-2'))).status).toBe(404);
    expect((await patch(t, id, 'cancel', t.as('dispatcher'))).status).toBe(403);
    expect((await patch(t, id, 'cancel', t.as('resident', 'res-1'))).status).toBe(200);
    expect(notifier.notifyRole).toHaveBeenCalledWith('dispatcher', expect.any(Object));
    const id2 = await seed(t);
    await patch(t, id2, 'verify', t.as('dispatcher'));
    expect((await patch(t, id2, 'cancel', t.as('resident', 'res-1'))).status).toBe(409);
  });

  it('dmo gets 403 on every PATCH', async () => {
    const t = makeTestApp();
    const id = await seed(t);
    for (const p of ['verify', 'priority', 'classify', 'reject', 'duplicate', 'cancel']) {
      expect((await patch(t, id, p, t.as('dmo'), {})).status).toBe(403);
    }
  });

  it('two concurrent verifies give one 200, one 409, no duplicate audit', async () => {
    const t = makeTestApp();
    const id = await seed(t);
    const rs = await Promise.all([patch(t, id, 'verify', t.as('dispatcher')), patch(t, id, 'verify', t.as('dispatcher', 'd2'))]);
    expect(rs.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await audits(t, id)).toHaveLength(4);
  });

  it('a throwing notifier or audit never fails the request', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const boom = { notifyUsers: async () => { throw new Error('x'); }, notifyRole: async () => { throw new Error('x'); } };
    const t = makeTestApp({ notifier: boom });
    const id = await seed(t);
    expect((await patch(t, id, 'verify', t.as('dispatcher'))).status).toBe(200);
    const id2 = await seed(t);
    expect((await patch(t, id2, 'cancel', t.as('resident', 'res-1'))).status).toBe(200);
    const t2 = makeTestApp();
    t2.repo.addAudit = async () => { throw new Error('audit down'); };
    const id3 = await seed(t2);
    expect((await patch(t2, id3, 'reject', t2.as('dispatcher'), { reason: 'no' })).status).toBe(200);
  });
});
