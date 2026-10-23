import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

// A completed key replays its report. The reply says so in a header (the body keeps its shape), so the browser can
// ask the person before treating a later deliberate send as a retry (CODEX-REPAIR-REVIEW R3).
const KEY = 'replay-header-key-01';
const post = (t) => request(t.app).post('/api/reports').set('Authorization', t.as('resident', 'res-h')).set('Idempotency-Key', KEY)
  .field('type', 'flood').field('description', 'Replay header check').field('lat', '14.5870').field('lng', '120.9720').field('source', 'gps');

describe('replay signal', () => {
  it('the first reply has no replay header; a completed replay marks it and keeps the same body', async () => {
    const t = makeTestApp();
    const first = await post(t);
    expect(first.status).toBe(201);
    expect(first.headers['idempotent-replayed']).toBeUndefined();
    const again = await post(t);
    expect(again.status).toBe(201);
    expect(again.headers['idempotent-replayed']).toBe('1');
    expect(again.body).toEqual(first.body);
  });

  it('the replay header is readable by the browser (exposed through CORS)', async () => {
    const t = makeTestApp({ corsOrigins: ['http://localhost:5179'] });
    await post(t);
    const again = await request(t.app).post('/api/reports').set('Origin', 'http://localhost:5179').set('Authorization', t.as('resident', 'res-h')).set('Idempotency-Key', KEY)
      .field('type', 'flood').field('description', 'Replay header check').field('lat', '14.5870').field('lng', '120.9720').field('source', 'gps');
    expect(again.headers['access-control-expose-headers']).toContain('Idempotent-Replayed');
  });
});
