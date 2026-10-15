import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

const get = (t, who, q = '') => request(t.app).get(`/api/audit${q}`).set('Authorization', who);

async function seed(t) {
  await t.repo.addAudit({ actorUid: 'd1', action: 'report.create', reportId: 'r1', after: { status: 'Submitted' }, at: new Date('2026-10-01T10:00:00Z') });
  await t.repo.addAudit({ actorUid: 'd1', action: 'report.assign', reportId: 'r2', after: { status: 'Team Assigned' }, at: new Date('2026-10-02T10:00:00Z') });
  await t.repo.addAudit({ actorUid: 'r7', action: 'report.update', reportId: 'r1', after: { status: 'Resolved' }, at: new Date('2026-10-03T10:00:00Z') });
}

describe('GET /api/audit', () => {
  it('dispatcher and admin get 200; resident, responder and dmo get 403', async () => {
    const t = makeTestApp();
    expect((await get(t, t.as('dispatcher'))).status).toBe(200);
    expect((await get(t, t.as('admin'))).status).toBe(200);
    for (const role of ['resident', 'responder', 'dmo']) {
      expect((await get(t, t.as(role))).status).toBe(403);
    }
  });

  it('filters by reportId, actorUid and action', async () => {
    const t = makeTestApp();
    await seed(t);
    expect((await get(t, t.as('dispatcher'), '?reportId=r1')).body).toHaveLength(2);
    expect((await get(t, t.as('dispatcher'), '?actorUid=d1')).body).toHaveLength(2);
    const byAction = (await get(t, t.as('dispatcher'), '?action=report.update')).body;
    expect(byAction).toHaveLength(1);
    expect(byAction[0].actorUid).toBe('r7');
  });

  it('filters by from and to ISO dates, with to inclusive of its whole day', async () => {
    const t = makeTestApp();
    await seed(t);
    const rows = (await get(t, t.as('dispatcher'), '?from=2026-10-02&to=2026-10-02')).body;
    expect(rows.map((r) => r.reportId)).toEqual(['r2']);
  });

  it('returns rows as stored, with no added fields', async () => {
    const t = makeTestApp();
    await seed(t);
    const [row] = (await get(t, t.as('admin'), '?reportId=r2')).body;
    expect(Object.keys(row).sort()).toEqual(['action', 'actorUid', 'after', 'at', 'id', 'reportId']);
  });

  it('rejects a bad from date with 400', async () => {
    const t = makeTestApp();
    expect((await get(t, t.as('dispatcher'), '?from=2026-02-30')).status).toBe(400);
    expect((await get(t, t.as('dispatcher'), '?to=tomorrow')).status).toBe(400);
  });
});
