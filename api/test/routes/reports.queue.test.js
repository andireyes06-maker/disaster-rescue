import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

const base = {
  type: 'flood', description: 'Water rising', status: 'Submitted', verified: false, priority: 'medium',
  location: { lat: 14.8512, lng: 120.8123, source: 'gps' }, coarseLocation: { lat: 14.85, lng: 120.81 },
  contact: { name: 'Ana', phone: '09171234567' }, reporterId: 'res-1', photos: [], reference: 'DR-AAAAAA',
};
// The fake repo stamps createdAt with the current time, so tests set the clock before each seed.
const seed = (t, iso, over = {}) => { vi.setSystemTime(new Date(iso)); return t.repo.createReport({ ...base, ...over }); };
const list = (t, role, uid) => request(t.app).get('/api/reports').set('Authorization', t.as(role, uid));
const ids = (res) => res.body.map((r) => r.id);

describe('queue order', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('admin queue lists awaiting-action reports oldest first, ties broken by id', async () => {
    const t = makeTestApp();
    const c = await seed(t, '2026-10-03T08:00:00Z');
    const b = await seed(t, '2026-10-01T08:00:00Z');
    const a = await seed(t, '2026-10-01T08:00:00Z');
    expect(ids(await list(t, 'admin'))).toEqual([b, a, c]);
  });

  it('priority does not change queue order', async () => {
    const t = makeTestApp();
    const old = await seed(t, '2026-10-01T08:00:00Z', { priority: 'low' });
    await seed(t, '2026-10-02T08:00:00Z', { priority: 'critical' });
    expect(ids(await list(t, 'admin'))[0]).toBe(old);
  });

  it('closed reports follow the open queue, newest first', async () => {
    const t = makeTestApp();
    const closed = await seed(t, '2026-10-05T08:00:00Z', { status: 'Closed' });
    const open2 = await seed(t, '2026-10-02T08:00:00Z');
    const open1 = await seed(t, '2026-10-01T08:00:00Z');
    expect(ids(await list(t, 'admin'))).toEqual([open1, open2, closed]);
  });

  it('a report with no createdAt sorts last in the admin queue and does not fail', async () => {
    const t = makeTestApp();
    const older = await seed(t, '2026-09-30T08:00:00Z');
    const undated = await seed(t, '2026-10-01T08:00:00Z');
    const newer = await seed(t, '2026-10-02T08:00:00Z');
    const orig = t.repo.listReports;
    t.repo.listReports = async (f) => (await orig(f)).map((r) => (r.id === undated ? { ...r, createdAt: undefined } : r));
    const res = await list(t, 'admin');
    expect(res.status).toBe(200);
    expect(ids(res)).toEqual([older, newer, undated]);
  });

  it('responder queue for their team is oldest first', async () => {
    const t = makeTestApp();
    await t.repo.createUser('rsp-1', { role: 'responder', team: 'tA', active: true });
    const later = await seed(t, '2026-10-02T08:00:00Z', { assignedTeamId: 'tA', status: 'Team Assigned' });
    const earlier = await seed(t, '2026-10-01T08:00:00Z', { assignedTeamId: 'tA', status: 'Team Assigned' });
    expect(ids(await list(t, 'responder', 'rsp-1'))).toEqual([earlier, later]);
  });

  it('responder with no team gets an empty list without error', async () => {
    const t = makeTestApp();
    await t.repo.createUser('rsp-2', { role: 'responder', active: true });
    await seed(t, '2026-10-01T08:00:00Z', { assignedTeamId: 'tA', status: 'Team Assigned' });
    const res = await list(t, 'responder', 'rsp-2');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('resident list stays newest first', async () => {
    const t = makeTestApp();
    const old = await seed(t, '2026-10-01T08:00:00Z', { reporterId: 'res-1' });
    const recent = await seed(t, '2026-10-02T08:00:00Z', { reporterId: 'res-1' });
    expect(ids(await list(t, 'resident', 'res-1'))).toEqual([recent, old]);
  });
});
