import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';
import { canTransition } from '../../src/domain/workflow.js';
import { createNotifier } from '../../src/services/notificationService.js';

describe('admin holds every staff permission', () => {
  it('admin gets the dispatcher-only report actions (priority is not 403)', async () => {
    const t = makeTestApp();
    const id = await t.repo.createReport({ type: 'flood', status: 'Submitted', lat: 14.6, lng: 121, reporterId: 'r1', priority: 'low' });
    const res = await request(t.app).patch(`/api/reports/${id}/priority`).set('Authorization', t.as('admin')).send({ priority: 'high' });
    expect(res.status).not.toBe(403);
  });

  it('admin sees the full report, including the reporter, as a dispatcher does', async () => {
    const t = makeTestApp();
    const id = await t.repo.createReport({ type: 'fire', status: 'Submitted', lat: 14.6, lng: 121, reporterId: 'r1' });
    const res = await request(t.app).get(`/api/reports/${id}`).set('Authorization', t.as('admin'));
    expect(res.status).toBe(200);
    expect(res.body.reporterId).toBe('r1');
  });

  it('admin can download the summary and the incident CSV', async () => {
    const t = makeTestApp();
    expect((await request(t.app).get('/api/export/summary.pdf').set('Authorization', t.as('admin'))).status).toBe(200);
    expect((await request(t.app).get('/api/export/incidents.csv').set('Authorization', t.as('admin'))).status).toBe(200);
  });

  it('admin can make every staff workflow step, but a resident-only step stays resident-only', () => {
    expect(canTransition('Submitted', 'Under Verification', 'admin')).toBe(true);
    expect(canTransition('Team Assigned', 'Rescue in Progress', 'admin')).toBe(true);
    expect(canTransition('Resolved', 'Closed', 'admin')).toBe(true);
    expect(canTransition('Submitted', 'Cancelled', 'admin')).toBe(false);
    expect(canTransition('Submitted', 'Cancelled', 'resident')).toBe(true);
  });

  it('a resident cannot use staff routes, and an admin cannot file or cancel a resident report', async () => {
    const t = makeTestApp();
    const id = await t.repo.createReport({ type: 'flood', status: 'Submitted', lat: 14.6, lng: 121, reporterId: 'r1' });
    expect((await request(t.app).get('/api/export/incidents.csv').set('Authorization', t.as('resident'))).status).toBe(403);
    expect((await request(t.app).patch(`/api/reports/${id}/cancel`).set('Authorization', t.as('admin'))).status).toBe(403);
  });

  it('admin receives dispatcher notifications', async () => {
    const t = makeTestApp();
    await t.repo.createUser('adm-1', { name: 'Root', role: 'admin', active: true });
    const notifier = createNotifier({ repo: t.repo, sender: t.sender });
    await notifier.notifyRole('dispatcher', { title: 'New report', body: 'x', reportId: 'r1' });
    expect((await t.repo.listNotifications('adm-1')).length).toBe(1);
  });
});
