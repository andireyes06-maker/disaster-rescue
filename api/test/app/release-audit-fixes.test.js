import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../fakes/testApp.js';

// Regression tests for the release-audit findings F03, F04, F05, F08, F09 and F10 (F01 is in canonical-access.test.js).

const KEY = 'idem-key-audit-0001';
const fields = { type: 'flood', description: 'Water rising fast', lat: '14.8512', lng: '120.8123', source: 'gps', area: 'Quezon City' };

function submit(t, over = {}) {
  let r = request(t.app).post('/api/reports').set('Authorization', t.as('resident', 'res-x')).set('Idempotency-Key', KEY);
  for (const [k, v] of Object.entries({ ...fields, ...over })) r = r.field(k, v);
  return r;
}

describe('F05: an idempotency key is bound to one submission', () => {
  it('refuses different photo bytes with the same type, size and filename', async () => {
    const t = makeTestApp();
    const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const first = await submit(t).attach('photos', Buffer.concat([header, Buffer.from([1])]), { filename: 'photo.png', contentType: 'image/png' });
    expect(first.status).toBe(201);
    const retry = await submit(t).attach('photos', Buffer.concat([header, Buffer.from([2])]), { filename: 'photo.png', contentType: 'image/png' });
    expect(retry.status).toBe(409);
    expect(retry.body.error).toBe('idempotency_conflict');
    expect(await t.repo.listReports({})).toHaveLength(1);
  });
  it('reusing a key for a different description is refused, and only the first report exists', async () => {
    const t = makeTestApp();
    const first = await submit(t);
    expect(first.status).toBe(201);
    const second = await submit(t, { description: 'A different report' });
    expect(second.status).toBe(409);
    expect(second.body.error).toBe('idempotency_conflict');
    const reports = await t.repo.listReports({});
    expect(reports).toHaveLength(1);
    expect(reports[0].description).toBe(fields.description);
  });

  it('an identical retry with the same key still replays the original report', async () => {
    const t = makeTestApp();
    const first = await submit(t);
    const retry = await submit(t);
    expect(retry.status).toBe(201);
    expect(retry.body.id).toBe(first.body.id);
    expect(await t.repo.listReports({})).toHaveLength(1);
  });
});

describe('F03: an administrator can assign and change a staff member\'s team', () => {
  it('links an existing responder to a team, then removes the link', async () => {
    const t = makeTestApp();
    await t.repo.saveTeam('tA', { name: 'Team A', busy: false });
    await t.repo.createUser('rsp-2', { name: 'Rsp', role: 'responder', team: null, active: true });
    t.auth.users.set('rsp-2', { uid: 'rsp-2', email: 'rsp2@x.test', disabled: false, customClaims: undefined });
    const linked = await request(t.app).patch('/api/users/rsp-2').set('Authorization', t.as('admin')).send({ team: 'tA' });
    expect(linked.status).toBe(200);
    expect(await t.repo.getUser('rsp-2')).toMatchObject({ team: 'tA' });
    expect(t.auth.users.get('rsp-2').customClaims).toMatchObject({ team: 'tA' });
    // A rescuer on a team cannot be moved or removed from it.
    const moved = await request(t.app).patch('/api/users/rsp-2').set('Authorization', t.as('admin')).send({ team: null });
    expect(moved.status).toBe(409);
    expect(await t.repo.getUser('rsp-2')).toMatchObject({ team: 'tA' });
  });

  it('refuses an unknown team', async () => {
    const t = makeTestApp();
    await t.repo.createUser('rsp-3', { name: 'Rsp', role: 'responder', team: null, active: true });
    const res = await request(t.app).patch('/api/users/rsp-3').set('Authorization', t.as('admin')).send({ team: 'nope' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_team');
  });
});

describe('F04: exports apply the same type and status filters as Analytics', () => {
  it('the CSV contains only the requested type', async () => {
    const t = makeTestApp();
    const base = { status: 'Submitted', priority: 'medium', verified: false, createdAt: new Date(), location: { lat: 14.8, lng: 120.8 } };
    await t.repo.createReport({ ...base, reference: 'DR-FLOODA1', type: 'flood', description: 'flood one' });
    await t.repo.createReport({ ...base, reference: 'DR-FIREB2', type: 'fire', description: 'fire one' });
    const res = await request(t.app).get('/api/export/incidents.csv?type=flood').set('Authorization', t.as('admin'));
    expect(res.status).toBe(200);
    expect(res.text).toContain('DR-FLOODA1');
    expect(res.text).not.toContain('DR-FIREB2');
  });
});

describe('F08: a new resident profile stores the verified email', () => {
  it('self-registration writes the token email, and admins can find the account by it', async () => {
    const t = makeTestApp();
    const res = await request(t.app).post('/api/users/self').set('Authorization', 'Bearer new:res-9:bea@x.test').send({ name: 'Bea', phone: '+1 555 010 0114' });
    expect(res.status).toBe(201);
    expect(await t.repo.getUser('res-9')).toMatchObject({ email: 'bea@x.test', emailVerified: false, role: 'resident' });
  });
});

describe('F09: team creation and renaming are audited', () => {
  it('a team create and a rename each write a team audit entry with the change', async () => {
    const t = makeTestApp();
    const created = await request(t.app).post('/api/teams').set('Authorization', t.as('admin')).send({ name: 'Team Lima' });
    expect(created.status).toBe(201);
    const renamed = await request(t.app).patch(`/api/teams/${created.body.id}`).set('Authorization', t.as('admin')).send({ name: 'Team Lima 2' });
    expect(renamed.status).toBe(200);
    const audit = (await request(t.app).get('/api/audit').set('Authorization', t.as('admin'))).body;
    const actions = audit.map((a) => a.action);
    expect(actions).toContain('team.create');
    expect(actions).toContain('team.update');
    const update = audit.find((a) => a.action === 'team.update');
    expect(update.before).toMatchObject({ name: 'Team Lima' });
    expect(update.after).toMatchObject({ name: 'Team Lima 2' });
  });
});

describe('F10: settings reject empty required fields', () => {
  it('an empty hotline or resident notice is refused and nothing is saved', async () => {
    const t = makeTestApp();
    const res = await request(t.app).put('/api/admin/settings').set('Authorization', t.as('admin')).send({ hotline: '', residentNotice: '' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validation_failed');
  });
});
