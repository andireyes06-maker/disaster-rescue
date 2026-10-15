import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

describe('HTTP hardening', () => {
  it('sends security headers and hides the framework', async () => {
    const t = makeTestApp();
    const res = await request(t.app).get('/api/teams');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('allows only configured CORS origins', async () => {
    const t = makeTestApp({ corsOrigins: ['https://dispatch.example.test'] });
    const allowed = await request(t.app).get('/api/teams').set('Origin', 'https://dispatch.example.test');
    expect(allowed.headers['access-control-allow-origin']).toBe('https://dispatch.example.test');
    const denied = await request(t.app).get('/api/teams').set('Origin', 'https://evil.example.test');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('rate limits a client that exceeds the window with 429', async () => {
    const t = makeTestApp({ rateLimit: { windowMs: 60_000, limit: 2 } });
    const statuses = [];
    for (let i = 0; i < 3; i++) statuses.push((await request(t.app).get('/api/teams')).status);
    expect(statuses).toEqual([401, 401, 429]);
  });
});
