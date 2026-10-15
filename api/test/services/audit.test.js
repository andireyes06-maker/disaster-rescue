import { describe, it, expect } from 'vitest';
import { createMemoryRepo } from '../fakes/memoryRepo.js';
import { createFakeUploader } from '../fakes/fakeUploader.js';
import { createFakeSender } from '../fakes/fakeSender.js';
import { record } from '../../src/services/auditService.js';

const base = { type: 'flood', status: 'Submitted', reporterId: 'u1' };

describe('auditService.record', () => {
  it('stores actor, action, before, after and a Date at', async () => {
    const repo = createMemoryRepo();
    await record(repo, { actorUid: 'd1', action: 'verify', reportId: 'r1', before: { status: 'A' }, after: { status: 'B' } });
    const [e] = await repo.listAudit({});
    expect(e).toMatchObject({ actorUid: 'd1', action: 'verify', reportId: 'r1', before: { status: 'A' }, after: { status: 'B' } });
    expect(e.at).toBeInstanceOf(Date);
  });
});

describe('memory repo updateReportIf', () => {
  it('returns false when status differs, true and patches when it matches', async () => {
    const repo = createMemoryRepo();
    const id = await repo.createReport({ ...base });
    expect(await repo.updateReportIf(id, 'Verified', { status: 'X' })).toBe(false);
    expect((await repo.getReport(id)).status).toBe('Submitted');
    expect(await repo.updateReportIf(id, 'Submitted', { status: 'Verified' })).toBe(true);
    const r = await repo.getReport(id);
    expect(r.status).toBe('Verified');
    expect(r.updatedAt).toBeInstanceOf(Date);
  });
  it('returns false for a missing report', async () => {
    expect(await createMemoryRepo().updateReportIf('nope', 'Submitted', {})).toBe(false);
  });
  it('exactly one of two concurrent callers wins', async () => {
    const repo = createMemoryRepo();
    const id = await repo.createReport({ ...base });
    const res = await Promise.all([
      repo.updateReportIf(id, 'Submitted', { status: 'Verified' }),
      repo.updateReportIf(id, 'Submitted', { status: 'Rejected' }),
    ]);
    expect(res.filter(Boolean)).toHaveLength(1);
  });
});

describe('memory repo reads', () => {
  it('createReport returns string id, Dates, and copies', async () => {
    const repo = createMemoryRepo();
    const id = await repo.createReport({ ...base });
    expect(typeof id).toBe('string');
    const r = await repo.getReport(id);
    expect(r.createdAt).toBeInstanceOf(Date);
    r.status = 'Hacked';
    expect((await repo.getReport(id)).status).toBe('Submitted');
    expect(await repo.getReport('missing')).toBeNull();
  });
  it('listReports filters and sorts newest first', async () => {
    const repo = createMemoryRepo();
    const mk = async (d, createdAt) => {
      const id = await repo.createReport(d);
      repo._setCreatedAt(id, createdAt);
      return id;
    };
    const a = await mk({ ...base, reporterId: 'u1', type: 'flood' }, new Date('2026-01-01'));
    const b = await mk({ ...base, reporterId: 'u2', type: 'fire', assignedTeamId: 't1' }, new Date('2026-01-03'));
    const c = await mk({ ...base, reporterId: 'u1', type: 'fire', status: 'Closed' }, new Date('2026-01-02'));
    const ids = async (f) => (await repo.listReports(f)).map((r) => r.id);
    expect(await ids({})).toEqual([b, c, a]);
    expect(await ids({ reporterId: 'u1' })).toEqual([c, a]);
    expect(await ids({ assignedTeamId: 't1' })).toEqual([b]);
    expect(await ids({ status: 'Closed' })).toEqual([c]);
    expect(await ids({ type: 'fire' })).toEqual([b, c]);
    expect(await ids({ from: new Date('2026-01-02'), to: new Date('2026-01-02T23:00:00Z') })).toEqual([c]);
    expect(await ids({ from: new Date('2026-01-02') })).toEqual([b, c]);
  });
  it('listOpenReports excludes closed statuses', async () => {
    const repo = createMemoryRepo();
    const a = await repo.createReport({ ...base });
    await repo.createReport({ ...base, status: 'Closed' });
    expect((await repo.listOpenReports()).map((r) => r.id)).toEqual([a]);
  });
});

describe('memory repo other collections', () => {
  it('markRead returns false for another user and true for the owner', async () => {
    const repo = createMemoryRepo();
    const id = await repo.addNotification({ recipientUid: 'u1', title: 't', body: 'b', read: false });
    expect(await repo.markRead(id, 'u2')).toBe(false);
    expect((await repo.listNotifications('u1'))[0].read).toBe(false);
    expect(await repo.markRead(id, 'u1')).toBe(true);
    expect((await repo.listNotifications('u1'))[0].read).toBe(true);
    expect(await repo.markRead('missing', 'u1')).toBe(false);
  });
  it('users, teams, devices, updates, hotlines', async () => {
    const repo = createMemoryRepo({ hotlines: { numbers: [{ label: 'x', number: '1' }] } });
    await repo.createUser('u1', { name: 'A' });
    await repo.updateUser('u1', { name: 'B' });
    expect((await repo.getUser('u1')).name).toBe('B');
    expect(await repo.listUsers()).toHaveLength(1);
    const t = await repo.saveTeam(null, { name: 'T' });
    await repo.saveTeam(t, { name: 'T2' });
    expect((await repo.getTeam(t)).name).toBe('T2');
    expect(await repo.listTeams()).toHaveLength(1);
    await repo.addDevice('u1', 'tok');
    expect(await repo.listDevices('u1')).toEqual(['tok']);
    await repo.removeDevice('tok');
    expect(await repo.listDevices('u1')).toEqual([]);
    const id = await repo.createReport({ ...base });
    await repo.addUpdate(id, { status: 'Verified' });
    expect(await repo.listUpdates(id)).toHaveLength(1);
    expect((await repo.getHotlines()).numbers).toHaveLength(1);
  });
});

describe('fakes', () => {
  it('uploader records calls, sniffs type, can fail', async () => {
    const u = createFakeUploader();
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const out = await u.upload([{ buffer: png }]);
    expect(out).toEqual([{ url: 'https://fake.cdn/photo-1.jpg', sizeBytes: png.length, mimeType: 'image/png' }]);
    expect(u.calls).toHaveLength(1);
    u.failNext = true;
    await expect(u.upload([{ buffer: png }])).rejects.toThrow();
    await expect(u.upload([{ buffer: png }])).resolves.toHaveLength(1);
  });
  it('sender reports failed tokens and can throw', async () => {
    const s = createFakeSender({ failedTokens: ['b'] });
    expect(await s.send(['a', 'b'], { title: 't' })).toEqual({ failedTokens: ['b'] });
    expect(s.calls).toHaveLength(1);
    await expect(createFakeSender({ throws: true }).send(['a'], {})).rejects.toThrow();
  });
});
