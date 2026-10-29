import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

const report = (t, lat, lng) => {
  let r = request(t.app).post('/api/reports').set('Authorization', t.as('resident', 'res-1')).set('X-Forwarded-For', '203.0.113.9');
  for (const [k, v] of Object.entries({ type: 'flood', description: 'Water rising fast', lat, lng, source: 'gps', area: 'Quezon City' })) r = r.field(k, v);
  return r;
};

describe('a pin outside the Philippines is refused', () => {
  it('a report in Sabah is refused and nothing is saved', async () => {
    const t = makeTestApp();
    const res = await report(t, '5.98', '116.07');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_input');
    expect(res.body.message).toMatch(/inside the Philippines/);
  });

  it('a team headquarters in Taiwan is refused', async () => {
    const t = makeTestApp();
    const res = await request(t.app).post('/api/teams').set('Authorization', t.as('admin')).send({ name: 'Harbor', kind: 'Rescue', hq: { lat: 25.03, lng: 121.56 } });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('outside_philippines');
  });
});

describe('a team of type Other needs its label when it is created', () => {
  it('is refused without a label, and the label is kept when given', async () => {
    const t = makeTestApp();
    const refused = await request(t.app).post('/api/teams').set('Authorization', t.as('admin')).send({ name: 'Harbor', kind: 'Other' });
    expect(refused.status).toBe(400);
    expect(refused.body.error).toBe('invalid_kind_label');
    const ok = await request(t.app).post('/api/teams').set('Authorization', t.as('admin')).send({ name: 'Harbor', kind: 'Other', kindLabel: 'Barangay rescue', hq: { lat: 14.6, lng: 120.9 } });
    expect(ok.status).toBe(201);
    const teams = await t.repo.listTeams();
    expect(teams.find((x) => x.id === ok.body.id)?.kindLabel).toBe('Barangay rescue');
  });
});
