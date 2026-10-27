import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

const base = {
  type: 'flood', description: 'Water rising', status: 'Awaiting Assignment', verified: true, priority: 'high',
  location: { lat: 14.8512, lng: 120.8123, source: 'gps' }, reporterId: 'res-1', photos: [], reference: 'DR-MULTI1',
  createdAt: new Date('2026-10-01T08:00:00Z'),
};
const seed = (t, over = {}) => t.repo.createReport({ ...base, ...over });

async function teams(t) {
  await t.repo.saveTeam('tA', { name: 'PNP Team', kind: 'PNP', busy: false });
  await t.repo.saveTeam('tB', { name: 'BFP Team', kind: 'BFP', busy: false });
  await t.repo.saveTeam('tC', { name: 'Rescue Team', kind: 'Rescue', busy: false });
  await t.repo.createUser('rsp-a', { name: 'A', role: 'responder', team: 'tA', active: true });
  await t.repo.createUser('rsp-b', { name: 'B', role: 'responder', team: 'tB', active: true });
  await t.repo.createUser('rsp-c', { name: 'C', role: 'responder', team: 'tC', active: true });
}

describe('several teams on one report', () => {
  it('an administrator assigns two teams at once; both claim the report and both can act on it', async () => {
    const t = makeTestApp();
    await teams(t);
    const id = await seed(t);
    const res = await request(t.app).post(`/api/reports/${id}/assign`).set('Authorization', t.as('admin')).send({ teamIds: ['tA', 'tB'] });
    expect(res.status).toBe(200);
    expect(res.body.assignedTeamIds).toEqual(['tA', 'tB']);
    const report = await t.repo.getReport(id);
    expect(report.assignedTeamIds).toEqual(['tA', 'tB']);
    expect((await t.repo.getTeam('tA')).busy).toBe(true);
    expect((await t.repo.getTeam('tB')).busy).toBe(true);
    expect((await t.repo.getTeam('tC')).busy).toBe(false);
    // The second team sees the report in its own list, and the third does not.
    const forB = await request(t.app).get('/api/reports').query({ assignedTeamId: 'tB' }).set('Authorization', t.as('admin'));
    expect(forB.body.map((r) => r.id)).toEqual([id]);
    const ack = await request(t.app).post(`/api/reports/${id}/acknowledge`).set('Authorization', t.as('responder', 'rsp-b'));
    expect(ack.status).toBe(200);
    const notMine = await request(t.app).post(`/api/reports/${id}/acknowledge`).set('Authorization', t.as('responder', 'rsp-c'));
    expect(notMine.status).toBe(404);
  });

  it('closing the report releases every team', async () => {
    const t = makeTestApp();
    await teams(t);
    const id = await seed(t, { status: 'Resolved', assignedTeamIds: ['tA', 'tB'], assignedTeamId: 'tA' });
    await t.repo.saveTeam('tA', { busy: true, currentReportId: id });
    await t.repo.saveTeam('tB', { busy: true, currentReportId: id });
    const res = await request(t.app).patch(`/api/reports/${id}/close`).set('Authorization', t.as('admin'));
    expect(res.status).toBe(200);
    expect((await t.repo.getTeam('tA')).busy).toBe(false);
    expect((await t.repo.getTeam('tB')).busy).toBe(false);
  });

  it('a team already on another report blocks the whole assignment, and no team is claimed', async () => {
    const t = makeTestApp();
    await teams(t);
    await t.repo.saveTeam('tB', { busy: true, currentReportId: 'other' });
    const id = await seed(t);
    const res = await request(t.app).post(`/api/reports/${id}/assign`).set('Authorization', t.as('admin')).send({ teamIds: ['tA', 'tB'] });
    expect(res.status).toBe(409);
    expect((await t.repo.getReport(id)).status).toBe('Awaiting Assignment');
    expect((await t.repo.getTeam('tA')).busy).toBe(false);
  });

  it('an older report with one team still works for that team', async () => {
    const t = makeTestApp();
    await teams(t);
    const id = await seed(t, { status: 'Team Assigned', assignedTeamId: 'tA' });
    const ack = await request(t.app).post(`/api/reports/${id}/acknowledge`).set('Authorization', t.as('responder', 'rsp-a'));
    expect(ack.status).toBe(200);
  });

  it('each assigned team acknowledges once; the report stays in progress and repeats change nothing', async () => {
    const t = makeTestApp();
    await teams(t);
    const id = await seed(t, { status: 'Team Assigned', assignedTeamIds: ['tA', 'tB'], assignedTeamId: 'tA' });
    expect((await request(t.app).post(`/api/reports/${id}/acknowledge`).set('Authorization', t.as('responder', 'rsp-a'))).status).toBe(200);
    expect((await t.repo.getReport(id)).status).toBe('Rescue in Progress');
    expect((await t.repo.getReport(id)).acknowledgedTeamIds).toEqual(['tA']);
    expect((await request(t.app).post(`/api/reports/${id}/acknowledge`).set('Authorization', t.as('responder', 'rsp-b'))).status).toBe(200);
    expect((await t.repo.getReport(id)).acknowledgedTeamIds).toEqual(['tA', 'tB']);
    await request(t.app).post(`/api/reports/${id}/acknowledge`).set('Authorization', t.as('responder', 'rsp-a'));
    expect((await t.repo.getReport(id)).acknowledgedTeamIds).toEqual(['tA', 'tB']);
    expect(await t.repo.listUpdates(id)).toHaveLength(2);
  });
});
