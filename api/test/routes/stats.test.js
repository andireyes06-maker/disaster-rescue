import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

async function seedMixed(t) {
  await t.repo.createReport({ type: 'flood', status: 'Submitted', priority: 'high', createdAt: new Date('2026-10-01T10:00:00Z'), reporterId: 'r1' });
  await t.repo.createReport({ type: 'flood', status: 'Resolved', priority: 'low', createdAt: new Date('2026-10-02T10:00:00Z'), reporterId: 'r2' });
  await t.repo.createReport({ type: 'fire', status: 'Submitted', priority: 'high', createdAt: new Date('2026-10-02T11:00:00Z'), reporterId: 'r3' });
}

describe('GET /api/stats filters', () => {
  it('type filter narrows the totals, by-status, and per-day numbers together', async () => {
    const t = makeTestApp();
    await seedMixed(t);
    const res = await request(t.app).get('/api/stats?type=flood').set('Authorization', t.as('dispatcher'));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.byType).toEqual({ flood: 2 });
    expect(res.body.byStatus).toEqual({ Submitted: 1, Resolved: 1 });
    expect(res.body.perDay.reduce((n, d) => n + d.count, 0)).toBe(2);
  });

  it('status filter narrows every number, not only the status card', async () => {
    const t = makeTestApp();
    await seedMixed(t);
    const res = await request(t.app).get('/api/stats?status=Submitted').set('Authorization', t.as('dispatcher'));
    expect(res.body.total).toBe(2);
    expect(res.body.byStatus).toEqual({ Submitted: 2 });
    expect(res.body.perDay.reduce((n, d) => n + d.count, 0)).toBe(2);
  });

  it('with no filters, all reports are counted', async () => {
    const t = makeTestApp();
    await seedMixed(t);
    const res = await request(t.app).get('/api/stats').set('Authorization', t.as('dispatcher'));
    expect(res.body.total).toBe(3);
  });
});
