import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

const binary = (res, cb) => {
  const chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};

const ROUTES = ['/api/stats', '/api/export/incidents.csv', '/api/export/summary.pdf'];

async function seed(t) {
  return t.repo.createReport({
    reference: 'DR-AAA111', type: 'flood', description: 'Water rising', status: 'Team Assigned',
    priority: 'high', verified: true, addressText: '12 Quay St',
    location: { lat: -33.9, lng: 151.2, source: 'gps' }, coarseLocation: { lat: -33.9, lng: 151.2 },
    reporterId: 'res-9', assignedTeamId: 'tA', photos: [{ url: 'https://photos.example/p1.jpg' }],
    contact: { name: 'Maria Contact', phone: '+63 917 000 1111' },
  });
}

const get = (t, who, path) => request(t.app).get(path).set('Authorization', who);

describe('stats and export access control', () => {
  it('resident gets 403 on all four stats and export routes', async () => {
    const t = makeTestApp();
    await seed(t);
    for (const p of [...ROUTES, '/api/audit']) {
      expect((await get(t, t.as('resident'), p)).status).toBe(403);
    }
  });

  it('responder gets 403 on stats (admin only) and on both exports', async () => {
    const t = makeTestApp();
    expect((await get(t, t.as('responder'), '/api/stats')).status).toBe(403);
    expect((await get(t, t.as('responder'), '/api/export/incidents.csv')).status).toBe(403);
    expect((await get(t, t.as('responder'), '/api/export/summary.pdf')).status).toBe(403);
  });

  it('dispatcher and dmo get 200 on stats and both exports', async () => {
    const t = makeTestApp();
    await seed(t);
    for (const who of [t.as('admin'), t.as('admin')]) {
      expect((await get(t, who, '/api/stats')).status).toBe(200);
      expect((await get(t, who, '/api/export/incidents.csv')).status).toBe(200);
      expect((await get(t, who, '/api/export/summary.pdf')).status).toBe(200);
    }
  });
});

describe('stats and export content', () => {
  let t;
  beforeEach(async () => {
    t = makeTestApp();
    await seed(t);
  });

  it('CSV for dispatcher includes exact location and the incident row', async () => {
    const res = await get(t, t.as('admin'), '/api/export/incidents.csv');
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain('DR-AAA111');
    expect(res.text).toContain('-33.9');
  });

  it('CSV and stats contain no contact name, phone or photo URL', async () => {
    const csv = await get(t, t.as('admin'), '/api/export/incidents.csv');
    const stats = await get(t, t.as('admin'), '/api/stats');
    for (const text of [csv.text, JSON.stringify(stats.body)]) {
      expect(text).not.toContain('Maria Contact');
      expect(text).not.toContain('000 1111');
      expect(text).not.toContain('photos.example');
    }
  });

  it('PDF body starts with %PDF', async () => {
    const res = await request(t.app).get('/api/export/summary.pdf').set('Authorization', t.as('admin'))
      .buffer(true).parse(binary);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.body.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('bad from or to date returns 400', async () => {
    for (const q of ['from=2026-13-45', 'from=yesterday', 'to=10/10/2026']) {
      expect((await get(t, t.as('admin'), `/api/stats?${q}`)).status).toBe(400);
      expect((await get(t, t.as('admin'), `/api/export/incidents.csv?${q}`)).status).toBe(400);
    }
  });
});
