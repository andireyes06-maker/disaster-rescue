import { it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

it('an administrator can assign a team that has no members yet', async () => {
  const t = makeTestApp();
  await t.repo.saveTeam('tEmpty', { name: 'Team Delta', kind: 'Rescue', busy: false });
  const id = await t.repo.createReport({ type: 'flood', description: 'Water rising', status: 'Awaiting Assignment', verified: true, priority: 'high', location: { lat: 14.85, lng: 120.81, source: 'gps' }, reporterId: 'res-1', photos: [], reference: 'DR-EMPTY1', createdAt: new Date() });
  const res = await request(t.app).post(`/api/reports/${id}/assign`).set('Authorization', t.as('admin')).send({ teamIds: ['tEmpty'] });
  expect(res.status).toBe(200);
});
