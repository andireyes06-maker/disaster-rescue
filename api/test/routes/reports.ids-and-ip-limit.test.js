import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

const fields = { type: 'flood', description: 'Water rising fast', lat: '14.8512', lng: '120.8123', source: 'gps' };
const submit = (t, uid, ip = '203.0.113.7') => {
  let r = request(t.app).post('/api/reports').set('Authorization', t.as('resident', uid)).set('X-Forwarded-For', ip);
  for (const [k, v] of Object.entries(fields)) r = r.field(k, v);
  return r;
};

describe('report ids that cannot be database ids answer 404, never 500', () => {
  it.each(['a%2Fb', '%2E%2E'])('GET /api/reports/%s is 404 not_found', async (id) => {
    const t = makeTestApp();
    const res = await request(t.app).get(`/api/reports/${id}`).set('Authorization', t.as('admin'));
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not_found');
  });

  it('a PATCH action on such an id is 404 before any write', async () => {
    const t = makeTestApp();
    const res = await request(t.app).patch('/api/reports/a%2Fb/verify').set('Authorization', t.as('admin'));
    expect(res.status).toBe(404);
  });

  it('a normal id still reaches the handler', async () => {
    const t = makeTestApp();
    const id = await t.repo.createReport({ type: 'flood', status: 'Submitted', reporterId: 'res-1', location: {}, photos: [] });
    expect((await request(t.app).get(`/api/reports/${id}`).set('Authorization', t.as('admin'))).status).toBe(200);
  });
});

// trustProxy makes the forwarded address the client address, as behind a host proxy.
describe('POST /api/reports per-address limit', () => {
  it('the 31st submission from one address is 429, even across different accounts', async () => {
    const t = makeTestApp({ trustProxy: 1 });
    const statuses = [];
    for (let i = 0; i < 31; i++) statuses.push((await submit(t, `res-${i}`)).status);
    expect(statuses.slice(0, 30).every((s) => s === 201)).toBe(true);
    expect(statuses[30]).toBe(429);
  });

  it('requests without a valid sign-in do not use up the address quota', async () => {
    const t = makeTestApp({ trustProxy: 1 });
    for (let i = 0; i < 40; i++) {
      await request(t.app).post('/api/reports').set('X-Forwarded-For', '198.51.100.9').send({});
    }
    expect((await submit(t, 'res-shared', '198.51.100.9')).status).toBe(201);
  });

  it('another address is not affected by the first one filling up', async () => {
    const t = makeTestApp({ trustProxy: 1 });
    for (let i = 0; i < 30; i++) await submit(t, `res-a${i}`, '198.51.100.1');
    expect((await submit(t, 'res-b', '198.51.100.2')).status).toBe(201);
  });
});
