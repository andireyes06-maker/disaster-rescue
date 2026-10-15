import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

const fields = { type: 'flood', description: 'Water rising fast', lat: '14.8512', lng: '120.8123', source: 'gps' };
const submit = (t, token) => {
  let r = request(t.app).post('/api/reports').set('Authorization', token);
  for (const [k, v] of Object.entries(fields)) r = r.field(k, v);
  return r;
};

describe('per-user limit on POST /api/reports', () => {
  it('the 11th submission from the same user within the window returns 429', async () => {
    const t = makeTestApp();
    const statuses = [];
    for (let i = 0; i < 11; i++) statuses.push((await submit(t, t.as('resident', 'res-limit'))).status);
    expect(statuses.slice(0, 10).every((s) => s === 201)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  it('the 429 body is JSON {error: rate_limited}', async () => {
    const t = makeTestApp();
    for (let i = 0; i < 10; i++) await submit(t, t.as('resident', 'res-body'));
    const res = await submit(t, t.as('resident', 'res-body'));
    expect(res.status).toBe(429);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ error: 'rate_limited' });
  });

  it('a different user is not affected by another user reaching the limit', async () => {
    const t = makeTestApp();
    for (let i = 0; i < 10; i++) await submit(t, t.as('resident', 'res-busy'));
    expect((await submit(t, t.as('resident', 'res-busy'))).status).toBe(429);
    expect((await submit(t, t.as('resident', 'res-quiet'))).status).toBe(201);
  });
});

describe('CORS allowlist', () => {
  it('a request from a disallowed origin gets no Access-Control-Allow-Origin header', async () => {
    const t = makeTestApp({ corsOrigins: ['https://dispatch.example.test'] });
    const res = await request(t.app).get('/api/teams').set('Origin', 'https://evil.example.test');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('unknown routes', () => {
  it('an unknown /api/nope returns 404 with JSON {error: not_found}', async () => {
    const t = makeTestApp();
    const res = await request(t.app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ error: 'not_found' });
  });

  it('an unknown POST under /api also returns the JSON 404', async () => {
    const t = makeTestApp();
    const res = await request(t.app).post('/api/nope/deeper').send({});
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'not_found' });
  });
});

describe('no stack traces in 500 responses', () => {
  it('a route that throws an Error with a stack returns 500 internal_error with no stack or message', async () => {
    const t = makeTestApp();
    const secret = 'db password is hunter2';
    t.repo.listReports = async () => { throw new Error(secret); };
    const res = await request(t.app).get('/api/reports').set('Authorization', t.as('dispatcher', 'disp-1'));
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'internal_error' });
    const text = JSON.stringify(res.body);
    expect(text).not.toContain('stack');
    expect(text).not.toContain(secret);
    expect(text).not.toContain('hardening.test.js');
  });
});
