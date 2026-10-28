import { describe, it, expect, vi } from 'vitest';
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

  const fake = (locality) => Object.assign(async () => null, { locality });

  it('fills a missing town from the lookup', async () => {
    const locality = vi.fn(async () => 'Guiguinto');
    const t = makeTestApp({ placeLookup: fake(locality) });
    const res = await post(t);
    expect(res.status).toBe(201);
    expect(locality).toHaveBeenCalledWith(14.8512, 120.8123);
    expect((await t.repo.getReport(res.body.id)).locality).toBe('Guiguinto');
  });

  it('does not look up when the phone sent a town', async () => {
    const locality = vi.fn(async () => 'Other');
    const t = makeTestApp({ placeLookup: fake(locality) });
    const res = await post(t, { locality: 'Guiguinto' });
    expect((await t.repo.getReport(res.body.id)).locality).toBe('Guiguinto');
    expect(locality).not.toHaveBeenCalled();
  });

  it('a failing lookup still saves the report with no town', async () => {
    const t = makeTestApp({ placeLookup: fake(async () => { throw new Error('down'); }) });
    const res = await post(t);
    expect(res.status).toBe(201);
    expect((await t.repo.getReport(res.body.id)).locality).toBeUndefined();
  });

  it('a slow lookup does not hold the report past the wait limit', async () => {
    const t = makeTestApp({ placeLookup: fake(() => new Promise(() => {})), localityWaitMs: 50 });
    const started = Date.now();
    const res = await post(t);
    expect(res.status).toBe(201);
    expect(Date.now() - started).toBeLessThan(2000);
    expect((await t.repo.getReport(res.body.id)).locality).toBeUndefined();
  });

  it('a replay with the same Idempotency-Key still matches', async () => {
    const t = makeTestApp({ placeLookup: fake(async () => 'Guiguinto') });
    const key = 'locality-replay-key-0001';
    const first = await post(t).set('Idempotency-Key', key);
    const second = await post(t).set('Idempotency-Key', key);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.id).toBe(first.body.id);
  });
});
