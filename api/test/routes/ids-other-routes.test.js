import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

// Same rule as reports: an id that cannot be a database id is "not found", never a server error.
describe('ids that cannot be database ids answer 404 on every id route', () => {
  it.each([
    ['PATCH', '/api/users/a%2Fb', 'admin', { active: true }],
    ['PATCH', '/api/teams/a%2Fb', 'admin', { name: 'Harbor' }],
    ['PATCH', '/api/notifications/a%2Fb/read', 'resident', undefined],
    ['DELETE', '/api/notifications/devices/a%2Fb', 'resident', undefined],
    ['POST', '/api/auth/reset-help/a%2Fb/reset-password', 'admin', undefined],
    ['POST', '/api/auth/reset-help/a%2Fb/close', 'admin', undefined],
    ['PATCH', '/api/users/%2E%2E', 'admin', { active: true }],
  ])('%s %s (as %s) is 404 not_found, not 500', async (method, path, who, body) => {
    const t = makeTestApp();
    let req = request(t.app)[method.toLowerCase()](path).set('Authorization', t.as(who));
    if (body) req = req.send(body);
    const res = await req;
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not_found');
  });
});
