import { it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

const seedReport = (t) => t.repo.createReport({ type: 'flood', description: 'Water rising', status: 'Awaiting Assignment', verified: true, priority: 'high', location: { lat: 14.85, lng: 120.81, source: 'gps' }, reporterId: 'res-1', photos: [], reference: 'DR-EMPTY1', createdAt: new Date() });

it("refuses to assign a team that has no members, and says so", async () => {
  const t = makeTestApp();
  await t.repo.saveTeam('tEmpty', { name: 'Team Delta', kind: 'Rescue', busy: false });
  const id = await seedReport(t);
  const res = await request(t.app).post(`/api/reports/${id}/assign`).set('Authorization', t.as('admin')).send({ teamIds: ['tEmpty'] });
  expect(res.status).toBe(409);
  expect(res.body.error).toBe('team_no_members');
  expect(res.body.message).toMatch(/You can't assign Team Delta/);
  expect((await t.repo.getReport(id)).status).toBe('Awaiting Assignment');
  expect((await t.repo.getTeam('tEmpty')).busy).toBe(false);
});

it('assigns a team once it has an active member', async () => {
  const t = makeTestApp();
  await t.repo.saveTeam('tMembers', { name: 'Team Echo', busy: false });
  await t.repo.createUser('rsp-e', { name: 'E', role: 'responder', team: 'tMembers', active: true });
  const id = await seedReport(t);
  const res = await request(t.app).post(`/api/reports/${id}/assign`).set('Authorization', t.as('admin')).send({ teamIds: ['tMembers'] });
  expect(res.status).toBe(200);
});
