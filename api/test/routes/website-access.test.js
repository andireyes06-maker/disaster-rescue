import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

// Professor clarification (2026-10-23), option A: dispatcher and DMO accounts keep their records
// but the API refuses them on every route. Administrators hold their functions.
describe('website access is administrator only', () => {
  it.each(['dispatcher', 'dmo'])('%s gets website_access_disabled on every staff route', async (role) => {
    const t = makeTestApp();
    const id = await t.repo.createReport({ type: 'flood', status: 'Submitted', reporterId: 'res-1', location: {}, photos: [] });
    const paths = [
      ['get', '/api/reports'], ['get', `/api/reports/${id}`], ['get', '/api/users'], ['get', '/api/teams'],
      ['get', '/api/audit'], ['get', '/api/stats'], ['get', '/api/export/incidents.csv'],
    ];
    for (const [method, path] of paths) {
      const res = await request(t.app)[method](path).set('Authorization', t.as(role));
      expect(res.status, `${role} ${method} ${path}`).toBe(403);
      expect(res.body.error, `${role} ${method} ${path}`).toBe('website_access_disabled');
    }
    const patch = await request(t.app).patch(`/api/reports/${id}/verify`).set('Authorization', t.as(role));
    expect(patch.body.error).toBe('website_access_disabled');
    expect(Boolean((await t.repo.getReport(id)).verified)).toBe(false);
  });

  it('an administrator still reaches the same routes', async () => {
    const t = makeTestApp();
    expect((await request(t.app).get('/api/reports').set('Authorization', t.as('admin'))).status).toBe(200);
    expect((await request(t.app).get('/api/users').set('Authorization', t.as('admin'))).status).toBe(200);
  });
});
