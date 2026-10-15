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

describe('rate limit behind a proxy', () => {
  it('counts each forwarded client separately when trustProxy is on', async () => {
    const t = makeTestApp({ rateLimit: { windowMs: 60_000, limit: 1 }, trustProxy: 1 });
    const a = await request(t.app).get('/api/teams').set('X-Forwarded-For', '198.51.100.1');
    const b = await request(t.app).get('/api/teams').set('X-Forwarded-For', '198.51.100.2');
    expect([a.status, b.status]).toEqual([401, 401]);
  });

  it('without trustProxy, every forwarded client shares the proxy address limit', async () => {
    const t = makeTestApp({ rateLimit: { windowMs: 60_000, limit: 1 } });
    const a = await request(t.app).get('/api/teams').set('X-Forwarded-For', '198.51.100.1');
    const b = await request(t.app).get('/api/teams').set('X-Forwarded-For', '198.51.100.2');
    expect([a.status, b.status]).toEqual([401, 429]);
  });
});
