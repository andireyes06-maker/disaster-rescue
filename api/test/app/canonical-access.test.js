import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

// F01: permissions follow the users document, not the token claims, so a change applies on the next request.
describe('canonical access (F01)', () => {
  it('a dispatcher demoted to resident loses staff access at once, with the same token', async () => {
    const t = makeTestApp();
    const token = t.as('dispatcher', 'dis-1');
    expect((await request(t.app).get('/api/users').set('Authorization', token)).status).toBe(200);
    await t.repo.updateUser('dis-1', { role: 'resident' });
    const res = await request(t.app).get('/api/users').set('Authorization', token);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('forbidden');
  });

  it('a deactivated account is refused at once, with the same token', async () => {
    const t = makeTestApp();
    const token = t.as('dispatcher', 'dis-1');
    expect((await request(t.app).get('/api/users').set('Authorization', token)).status).toBe(200);
    await t.repo.updateUser('dis-1', { active: false });
    const res = await request(t.app).get('/api/users').set('Authorization', token);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('account_disabled');
  });
});
