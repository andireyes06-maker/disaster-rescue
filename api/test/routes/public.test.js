import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';
import { coarsen } from '../../src/domain/privacy.js';

describe('GET /api/public/incidents', () => {
  it('answers with no token and returns only rounded, non-identifying fields', async () => {
    const t = makeTestApp();
    await t.repo.createReport({ type: 'flood', status: 'Verified', location: { lat: 14.6123, lng: 121.0456, source: 'gps' }, reporterId: 'r1', addressText: '12 Mabini St', contact: { name: 'Ana', phone: '09170000001' }, photos: [{ url: 'https://img/x.jpg' }] });
    const res = await request(t.app).get('/api/public/incidents');
    expect(res.status).toBe(200);
    expect(res.body.incidents).toHaveLength(1);
    const row = res.body.incidents[0];
    for (const key of ['id', 'reporterId', 'contact', 'photos', 'addressText']) expect(row).not.toHaveProperty(key);
    expect(row).toEqual({
      type: 'flood',
      statusCategory: 'open',
      center: coarsen(14.6123, 121.0456),
      radiusMeters: 500,
    });
  });

  it('maps statuses to open, responding, and resolved, and leaves out closed and internal statuses', async () => {
    const t = makeTestApp();
    const base = { type: 'fire', location: { lat: 14.6, lng: 121.0, source: 'gps' }, reporterId: 'r1' };
    await t.repo.createReport({ ...base, status: 'Awaiting Assignment' });
    await t.repo.createReport({ ...base, status: 'Rescue in Progress' });
    await t.repo.createReport({ ...base, status: 'Resolved' });
    await t.repo.createReport({ ...base, status: 'Closed' });
    await t.repo.createReport({ ...base, status: 'Submitted' });
    await t.repo.createReport({ ...base, status: 'Rejected' });
    const res = await request(t.app).get('/api/public/incidents');
    expect(res.body.incidents.map((r) => r.statusCategory).sort()).toEqual(['open', 'resolved', 'responding']);
  });

  it('answers with an empty list when there are no incidents', async () => {
    const t = makeTestApp();
    const res = await request(t.app).get('/api/public/incidents');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ incidents: [] });
  });

  it('rate limits callers after 60 requests in a minute', async () => {
    const t = makeTestApp();
    let last;
    for (let i = 0; i < 61; i += 1) last = await request(t.app).get('/api/public/incidents');
    expect(last.status).toBe(429);
    expect(last.body).toEqual({ error: 'rate_limited' });
  });

  it('a report submitted through the API appears publicly once verified (BE04 end to end)', async () => {
    const t = makeTestApp();
    const created = await request(t.app).post('/api/reports').set('Authorization', t.as('resident'))
      .field('type', 'flood').field('description', 'Water rising fast').field('lat', '14.8512').field('lng', '120.8123').field('source', 'gps');
    expect(created.status).toBe(201);
    expect((await request(t.app).get('/api/public/incidents')).body.incidents).toEqual([]);
    const id = created.body.id;
    await t.repo.updateReportIf(id, 'Submitted', { status: 'Verified', verified: true });
    const res = await request(t.app).get('/api/public/incidents');
    expect(res.body.incidents).toEqual([{
      type: 'flood', statusCategory: 'open', center: coarsen(14.8512, 120.8123), radiusMeters: 500,
    }]);
  });
});
