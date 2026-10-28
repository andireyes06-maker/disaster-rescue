import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

const fields = { type: 'flood', description: 'Water rising fast', lat: '14.8512', lng: '120.8123', source: 'gps', area: 'Quezon City' };

function post(t, over = {}) {
  let r = request(t.app).post('/api/reports').set('Authorization', t.as('resident'));
  for (const [k, v] of Object.entries({ ...fields, ...over })) r = r.field(k, v);
  return r;
}
const stats = (t) => request(t.app).get('/api/stats').set('Authorization', t.as('admin'));

describe('POST /api/reports locality', () => {
  it('saves the town the phone sends', async () => {
    const t = makeTestApp();
    const res = await post(t, { locality: 'Guiguinto' });
    expect(res.status).toBe(201);
    expect((await t.repo.getReport(res.body.id)).locality).toBe('Guiguinto');
  });

  it('stats group it under that town', async () => {
    const t = makeTestApp();
    expect((await post(t, { locality: 'Guiguinto' })).status).toBe(201);
    const res = await stats(t);
    expect(res.status).toBe(200);
    expect(res.body.byLocation).toEqual({ Guiguinto: 1 });
  });

  it('spacing and case do not split a town', async () => {
    const t = makeTestApp();
    expect((await post(t, { locality: 'Guiguinto', description: 'Water rising fast one' })).status).toBe(201);
    expect((await post(t, { locality: ' GUIGUINTO ', description: 'Road blocked by debris' })).status).toBe(201);
    // The label is the first spelling in the repo's order (newest first), so compare the one bucket case-insensitively.
    const entries = Object.entries((await stats(t)).body.byLocation);
    expect(entries).toHaveLength(1);
    expect(entries[0][0].toLowerCase()).toBe('guiguinto');
    expect(entries[0][1]).toBe(2);
  });
});
