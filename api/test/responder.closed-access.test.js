import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from './fakes/testApp.js';

// Responder access to a report follows the current user document, not a stale token:
// a moved, cleared or deactivated responder loses access on the next request.
const base = {
  type: 'flood', description: 'Water rising', status: 'Closed', verified: true, priority: 'medium',
  location: { lat: 14.8512, lng: 120.8123, source: 'gps' }, coarseLocation: { lat: 14.85, lng: 120.81 },
  contact: { name: 'Ana', phone: '09171234567' }, reporterId: 'res-1', photos: [], reference: 'DR-CLOSED1',
  assignedTeamId: 'tA',
};
const seed = (t, over = {}) => t.repo.createReport({ ...base, ...over });
const get = (t, id, who) => request(t.app).get(`/api/reports/${id}`).set('Authorization', who);
const post = (t, id, path, who, body) => request(t.app).post(`/api/reports/${id}/${path}`).set('Authorization', who).send(body ?? {});

// Team A and team B, one responder each. rsp-a is on tA, rsp-b is on tB.
async function withTeams(t) {
  await t.repo.saveTeam('tA', { name: 'Team A', busy: false });
  await t.repo.saveTeam('tB', { name: 'Team B', busy: false });
  await t.repo.createUser('rsp-a', { name: 'Rafa', role: 'responder', team: 'tA', active: true });
  await t.repo.createUser('rsp-b', { name: 'Bea', role: 'responder', team: 'tB', active: true });
  return { a: t.as('responder', 'rsp-a'), b: t.as('responder', 'rsp-b') };
}

describe('responder read of a closed report', () => {
  it('the current team reads its closed report', async () => {
    const t = makeTestApp();
    const { a } = await withTeams(t);
    const id = await seed(t);
    const res = await get(t, id, a);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id, status: 'Closed', assignedTeamId: 'tA' });
  });

  it('another team gets 404, not the report', async () => {
    const t = makeTestApp();
    const { b } = await withTeams(t);
    const id = await seed(t);
    const res = await get(t, id, b);
    expect(res.status).toBe(404);
    expect(res.body.description).toBeUndefined();
  });

  it('a team change takes effect on the next request', async () => {
    const t = makeTestApp();
    const { a } = await withTeams(t);
    const id = await seed(t);
    expect((await get(t, id, a)).status).toBe(200);
    await t.repo.updateUser('rsp-a', { team: 'tB' });
    expect((await get(t, id, a)).status).toBe(404);
  });

  it('a responder whose team was cleared gets 404', async () => {
    const t = makeTestApp();
    const { a } = await withTeams(t);
    const id = await seed(t);
    await t.repo.updateUser('rsp-a', { team: null });
    expect((await get(t, id, a)).status).toBe(404);
  });

  it('a deactivated responder is refused with no report data, even while the token still says active', async () => {
    const t = makeTestApp();
    const { a } = await withTeams(t);
    const id = await seed(t);
    await t.repo.updateUser('rsp-a', { active: false });
    const res = await get(t, id, a);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('account_disabled');
    expect(res.body.description).toBeUndefined();
  });

  it('a responder whose role was changed away from responder gets 404', async () => {
    const t = makeTestApp();
    const { a } = await withTeams(t);
    const id = await seed(t);
    await t.repo.updateUser('rsp-a', { role: 'resident' });
    expect((await get(t, id, a)).status).toBe(404);
  });
});

describe('responder writes on a closed report are refused', () => {
  it('acknowledge is refused with 409', async () => {
    const t = makeTestApp();
    const { a } = await withTeams(t);
    const id = await seed(t);
    const res = await post(t, id, 'acknowledge', a);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('report_closed');
  });

  it('a progress update with a status is refused with 409 and writes nothing', async () => {
    const t = makeTestApp();
    const { a } = await withTeams(t);
    const id = await seed(t);
    const res = await post(t, id, 'updates', a, { status: 'Resolved', note: 'Late note', peopleRescued: 2 });
    expect(res.status).toBe(409);
    expect((await t.repo.listUpdates(id))).toHaveLength(0);
    expect((await t.repo.getReport(id)).status).toBe('Closed');
  });

  it('a rescue-in-progress update is refused with 409', async () => {
    const t = makeTestApp();
    const { a } = await withTeams(t);
    const id = await seed(t);
    expect((await post(t, id, 'updates', a, { status: 'Rescue in Progress' })).status).toBe(409);
  });

  it('close is refused for a responder (dispatcher only)', async () => {
    const t = makeTestApp();
    const { a } = await withTeams(t);
    const id = await seed(t, { status: 'Resolved' });
    expect((await request(t.app).patch(`/api/reports/${id}/close`).set('Authorization', a).send({})).status).toBe(403);
    expect((await t.repo.getReport(id)).status).toBe('Resolved');
  });
});
