import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

const base = {
  type: 'flood', description: 'Water rising', status: 'Submitted', verified: false, priority: 'medium',
  location: { lat: 14.8512, lng: 120.8123, source: 'gps' }, coarseLocation: { lat: 14.85, lng: 120.81 },
  contact: { name: 'Ana', phone: '09171234567' }, reporterId: 'res-1', photos: [], reference: 'DR-AAAAAA',
};
const seed = (t, over = {}) => t.repo.createReport({ ...base, ...over });
const post = (t, id, path, who, body) => request(t.app).post(`/api/reports/${id}/${path}`).set('Authorization', who).send(body ?? {});
const audits = (t, id) => t.repo.listAudit({ reportId: id });
const countAudit = async (t, id, action) => (await audits(t, id)).filter((a) => a.action === action).length;

// Two teams, one responder each. rsp-a belongs to tA, rsp-b to tB.
async function withTeams(t) {
  await t.repo.saveTeam('tA', { name: 'Team A', busy: false });
  await t.repo.saveTeam('tB', { name: 'Team B', busy: false });
  await t.repo.createUser('rsp-a', { name: 'Rafa', role: 'responder', team: 'tA', active: true });
  await t.repo.createUser('rsp-b', { name: 'Bea', role: 'responder', team: 'tB', active: true });
  return { a: t.as('responder', 'rsp-a'), b: t.as('responder', 'rsp-b') };
}

describe('assign', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('two concurrent assigns give one 200, one 409, one report.assign audit', async () => {
    const t = makeTestApp();
    await withTeams(t);
    const id = await seed(t, { status: 'Awaiting Assignment', verified: true });
    const rs = await Promise.all([
      post(t, id, 'assign', t.as('dispatcher', 'd1'), { teamId: 'tA' }),
      post(t, id, 'assign', t.as('dispatcher', 'd2'), { teamId: 'tA' }),
    ]);
    expect(rs.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await countAudit(t, id, 'report.assign')).toBe(1);
    expect(await t.repo.getReport(id)).toMatchObject({ status: 'Team Assigned', assignedTeamId: 'tA' });
  });

  it('assign from Verified auto-advances to Awaiting Assignment with an audit row for the advance', async () => {
    const t = makeTestApp();
    await withTeams(t);
    const id = await seed(t, { status: 'Verified', verified: true });
    expect((await post(t, id, 'assign', t.as('dispatcher'), { teamId: 'tA' })).status).toBe(200);
    expect(await t.repo.getReport(id)).toMatchObject({ status: 'Team Assigned' });
    const a = await audits(t, id);
    expect(a.some((x) => x.action === 'status.change' && x.after?.status === 'Awaiting Assignment')).toBe(true);
    expect(a.filter((x) => x.action === 'report.assign')).toHaveLength(1);
  });

  it('assign notifies the reporter and the team members', async () => {
    const notifier = { notifyUsers: vi.fn(async () => {}), notifyRole: vi.fn(async () => {}) };
    const t = makeTestApp({ notifier });
    await withTeams(t);
    const id = await seed(t, { status: 'Awaiting Assignment', verified: true });
    expect((await post(t, id, 'assign', t.as('dispatcher'), { teamId: 'tA' })).status).toBe(200);
    expect(notifier.notifyUsers).toHaveBeenCalledWith(['res-1'], expect.objectContaining({ reportId: id }));
    expect(notifier.notifyUsers).toHaveBeenCalledWith(['rsp-a'], expect.objectContaining({ reportId: id }));
  });

  it('assign marks the team busy; unknown team is 400; non-dispatcher is 403; from Submitted is 409', async () => {
    const t = makeTestApp();
    await withTeams(t);
    const id = await seed(t, { status: 'Awaiting Assignment', verified: true });
    expect((await post(t, id, 'assign', t.as('dispatcher'), { teamId: 'ghost' })).status).toBe(400);
    expect((await post(t, id, 'assign', t.as('dmo'), { teamId: 'tA' })).status).toBe(403);
    const sub = await seed(t);
    expect((await post(t, sub, 'assign', t.as('dispatcher'), { teamId: 'tA' })).status).toBe(409);
    await post(t, id, 'assign', t.as('dispatcher'), { teamId: 'tA' });
    expect((await t.repo.getTeam('tA')).busy).toBe(true);
  });
});

describe('assign to a busy team', () => {
  it('refuses a second report for a team already on a rescue with 409 team_busy', async () => {
    const t = makeTestApp();
    await withTeams(t);
    const first = await seed(t, { status: 'Awaiting Assignment', verified: true });
    const second = await seed(t, { status: 'Awaiting Assignment', verified: true, reference: 'DR-BBBBBB' });
    expect((await post(t, first, 'assign', t.as('dispatcher', 'd1'), { teamId: 'tA' })).status).toBe(200);
    const res = await post(t, second, 'assign', t.as('dispatcher', 'd1'), { teamId: 'tA' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('team_busy');
    expect(await t.repo.getReport(second)).toMatchObject({ status: 'Awaiting Assignment' });
    expect(await t.repo.getTeam('tA')).toMatchObject({ busy: true, currentReportId: first });
  });
});

describe('acknowledge and updates', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('responder of another team gets 404 on updates and acknowledge', async () => {
    const t = makeTestApp();
    const teams = await withTeams(t);
    const id = await seed(t, { status: 'Team Assigned', assignedTeamId: 'tA' });
    expect((await post(t, id, 'acknowledge', teams.b)).status).toBe(404);
    expect((await post(t, id, 'updates', teams.b, { status: 'Rescue in Progress', note: 'On way', peopleRescued: 0 })).status).toBe(404);
    expect(await t.repo.listUpdates(id)).toHaveLength(0);
  });

  it('acknowledge by the assigned team writes an update and an audit row, no status change', async () => {
    const t = makeTestApp();
    const teams = await withTeams(t);
    const id = await seed(t, { status: 'Team Assigned', assignedTeamId: 'tA' });
    expect((await post(t, id, 'acknowledge', teams.a)).status).toBe(200);
    expect(await t.repo.getReport(id)).toMatchObject({ status: 'Team Assigned' });
    expect(await t.repo.listUpdates(id)).toHaveLength(1);
    expect(await countAudit(t, id, 'report.acknowledge')).toBe(1);
  });

  it('peopleRescued -1 and "many" return 400', async () => {
    const t = makeTestApp();
    const teams = await withTeams(t);
    const id = await seed(t, { status: 'Team Assigned', assignedTeamId: 'tA' });
    for (const peopleRescued of [-1, 'many', 10001, 1.5]) {
      expect((await post(t, id, 'updates', teams.a, { status: 'Rescue in Progress', note: 'x', peopleRescued })).status).toBe(400);
    }
    expect(await t.repo.listUpdates(id)).toHaveLength(0);
  });

  it('status must be Rescue in Progress or Resolved; progress then resolve works', async () => {
    const t = makeTestApp();
    const teams = await withTeams(t);
    const id = await seed(t, { status: 'Team Assigned', assignedTeamId: 'tA' });
    expect((await post(t, id, 'updates', teams.a, { status: 'Closed', note: 'x', peopleRescued: 0 })).status).toBe(400);
    expect((await post(t, id, 'updates', teams.a, { status: 'Rescue in Progress', note: 'Boats out', peopleRescued: 4 })).status).toBe(200);
    expect(await t.repo.getReport(id)).toMatchObject({ status: 'Rescue in Progress' });
    expect((await post(t, id, 'updates', teams.a, { status: 'Resolved', note: 'Done', peopleRescued: 10 })).status).toBe(200);
    expect(await t.repo.getReport(id)).toMatchObject({ status: 'Resolved' });
    expect(await t.repo.listUpdates(id)).toHaveLength(2);
  });

  it('a responder who is not assigned at all gets 404; residents and dispatchers get 403', async () => {
    const t = makeTestApp();
    const teams = await withTeams(t);
    const id = await seed(t, { status: 'Awaiting Assignment', verified: true });
    expect((await post(t, id, 'acknowledge', teams.a)).status).toBe(404);
    expect((await post(t, id, 'updates', t.as('resident', 'res-1'), { status: 'Resolved' })).status).toBe(403);
    expect((await post(t, id, 'updates', t.as('dispatcher'), { status: 'Resolved' })).status).toBe(403);
  });
});

describe('close', () => {
  it('close from Rescue in Progress returns 409', async () => {
    const t = makeTestApp();
    await withTeams(t);
    const id = await seed(t, { status: 'Rescue in Progress', assignedTeamId: 'tA' });
    const res = await request(t.app).patch(`/api/reports/${id}/close`).set('Authorization', t.as('dispatcher'));
    expect(res.status).toBe(409);
    expect(await t.repo.getReport(id)).toMatchObject({ status: 'Rescue in Progress' });
  });

  it('close from Resolved moves to Closed and frees the team', async () => {
    const t = makeTestApp();
    const id = await seed(t, { status: 'Resolved', assignedTeamId: 'tA' });
    await t.repo.saveTeam('tA', { name: 'Team A', busy: true, currentReportId: id });
    const res = await request(t.app).patch(`/api/reports/${id}/close`).set('Authorization', t.as('dispatcher'));
    expect(res.status).toBe(200);
    expect(await t.repo.getReport(id)).toMatchObject({ status: 'Closed' });
    expect(await t.repo.getTeam('tA')).toMatchObject({ busy: false, currentReportId: null });
  });
});

describe('teams', () => {
  it('resident cannot create a team; dispatcher creates and renames; list is open to staff', async () => {
    const t = makeTestApp();
    expect((await request(t.app).post('/api/teams').set('Authorization', t.as('resident')).send({ name: 'Rogue' })).status).toBe(403);
    const created = await request(t.app).post('/api/teams').set('Authorization', t.as('dispatcher')).send({ name: 'Fire Unit 1' });
    expect(created.status).toBe(201);
    const renamed = await request(t.app).patch(`/api/teams/${created.body.id}`).set('Authorization', t.as('dispatcher')).send({ name: 'Fire Unit 2' });
    expect(renamed.status).toBe(200);
    expect((await t.repo.getTeam(created.body.id)).name).toBe('Fire Unit 2');
    expect((await request(t.app).patch('/api/teams/ghost').set('Authorization', t.as('dispatcher')).send({ name: 'x' })).status).toBe(404);
    const list = await request(t.app).get('/api/teams').set('Authorization', t.as('dispatcher'));
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
  });

  it('team status is hidden from residents and responders (403); dispatcher, dmo and admin can list', async () => {
    const t = makeTestApp();
    await t.repo.saveTeam('tA', { name: 'Team A', busy: true, currentReportId: 'rep-secret' });
    expect((await request(t.app).get('/api/teams').set('Authorization', t.as('resident'))).status).toBe(403);
    expect((await request(t.app).get('/api/teams').set('Authorization', t.as('responder'))).status).toBe(403);
    expect((await request(t.app).get('/api/teams').set('Authorization', t.as('dmo'))).status).toBe(200);
    expect((await request(t.app).get('/api/teams').set('Authorization', t.as('admin'))).status).toBe(200);
  });
});
