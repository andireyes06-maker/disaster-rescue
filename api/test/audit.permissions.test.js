import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from './fakes/testApp.js';

// F05 matrix (decision D1): GET /api/audit is dispatcher and admin only.
const get = (t, auth) => request(t.app).get('/api/audit').set('Authorization', auth);

describe('GET /api/audit permission matrix (F05)', () => {
  const matrix = { resident: 403, responder: 403, dispatcher: 403, dmo: 403, admin: 200 };
  for (const [role, status] of Object.entries(matrix)) {
    it(`${role} gets ${status}`, async () => {
      const t = makeTestApp();
      expect((await get(t, t.as(role))).status).toBe(status);
    });
  }

  it('an admin whose users document is inactive gets 403, even with an admin token', async () => {
    const t = makeTestApp();
    await t.repo.createUser('adm-off', { name: 'Off', role: 'admin', active: false, team: null });
    expect((await get(t, t.as('admin', 'adm-off'))).status).toBe(403);
  });

  it('a signed-in account with no role claim or user document gets 403', async () => {
    const t = makeTestApp();
    expect((await get(t, 'Bearer new:nobody')).status).toBe(403);
  });

  it('no token gets 401', async () => {
    const t = makeTestApp();
    expect((await request(t.app).get('/api/audit')).status).toBe(401);
  });
});
