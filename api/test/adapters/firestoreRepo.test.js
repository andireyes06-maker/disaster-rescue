import { describe, it, expect } from 'vitest';
import { REPO_METHODS } from '../../src/ports/repo.js';
import { createMemoryRepo } from '../fakes/memoryRepo.js';
import { createFakeFirestore } from '../fakes/fakeFirestore.js';
import { createFirestoreRepo } from '../../src/adapters/firestoreRepo.js';

const setup = () => {
  const db = createFakeFirestore();
  return { db, repo: createFirestoreRepo(db) };
};
const base = { type: 'flood', status: 'Submitted', reporterId: 'u1' };

describe('port parity', () => {
  it('memory repo and firestore adapter expose every REPO_METHODS name', () => {
    const impls = { memory: createMemoryRepo(), firestore: setup().repo };
    for (const [name, repo] of Object.entries(impls)) {
      for (const m of REPO_METHODS) expect(typeof repo[m], `${name}.${m}`).toBe('function');
    }
  });

  it('user round trip has the same shape in both: {uid, ...data}, no id', async () => {
    const shapes = [];
    for (const repo of [createMemoryRepo(), setup().repo]) {
      await repo.createUser('u1', { name: 'A', role: 'resident', createdAt: new Date('2026-01-01') });
      const got = await repo.getUser('u1');
      const listed = (await repo.listUsers())[0];
      expect(got).toEqual(listed);
      expect(got).not.toHaveProperty('id');
      expect(got.uid).toBe('u1');
      shapes.push(got);
    }
    expect(shapes[0]).toEqual(shapes[1]);
  });

  it('updateUser on a missing user throws in both', async () => {
    for (const repo of [createMemoryRepo(), setup().repo]) {
      await expect(repo.updateUser('nope', { name: 'x' })).rejects.toThrow();
    }
  });

  it('listAudit sorts by at descending in both', async () => {
    for (const repo of [createMemoryRepo(), setup().repo]) {
      await repo.addAudit({ action: 'old', at: new Date('2026-01-01') });
      await repo.addAudit({ action: 'new', at: new Date('2026-03-01') });
      await repo.addAudit({ action: 'mid', at: new Date('2026-02-01') });
      expect((await repo.listAudit({})).map((a) => a.action)).toEqual(['new', 'mid', 'old']);
    }
  });
});

describe('firestoreRepo.updateReportIf', () => {
  it('missing report returns false and creates nothing', async () => {
    const { db, repo } = setup();
    expect(await repo.updateReportIf('ghost', 'Submitted', { status: 'X' })).toBe(false);
    expect(db.store.size).toBe(0);
    expect(db.calls.runTransaction).toBe(1);
  });
  it('true on match (patch applied, updatedAt Date), false on mismatch', async () => {
    const { db, repo } = setup();
    const id = await repo.createReport({ ...base });
    expect(await repo.updateReportIf(id, 'Closed', { status: 'X' })).toBe(false);
    expect((await repo.getReport(id)).status).toBe('Submitted');
    expect(await repo.updateReportIf(id, 'Submitted', { status: 'Verified', note: undefined })).toBe(true);
    const r = await repo.getReport(id);
    expect(r.status).toBe('Verified');
    expect(r.updatedAt).toBeInstanceOf(Date);
    expect(db.calls.runTransaction).toBe(2);
  });
});

describe('firestoreRepo.markRead', () => {
  it('owner true, non-owner false, missing false', async () => {
    const { repo } = setup();
    const id = await repo.addNotification({ recipientUid: 'u1', title: 't', body: 'b' });
    expect(await repo.markRead(id, 'u2')).toBe(false);
    expect((await repo.listNotifications('u1'))[0].read).toBe(false);
    expect(await repo.markRead(id, 'u1')).toBe(true);
    expect((await repo.listNotifications('u1'))[0].read).toBe(true);
    expect(await repo.markRead('missing', 'u1')).toBe(false);
  });
});

describe('firestoreRepo conversion and stripping', () => {
  it('converts Timestamps to Dates, including nested audit before/after and updates', async () => {
    const { db, repo } = setup();
    const d = new Date('2026-02-02T10:00:00Z');
    await repo.addAudit({ actorUid: 'a', action: 'x', before: { seenAt: d }, after: { list: [{ at: d }] }, at: d });
    const [a] = await repo.listAudit({});
    expect(a.at).toBeInstanceOf(Date);
    expect(a.before.seenAt).toBeInstanceOf(Date);
    expect(a.after.list[0].at).toBeInstanceOf(Date);
    // confirm the double really stored Timestamp-like values
    const stored = [...db.store.values()][0];
    expect(typeof stored.at.toDate).toBe('function');

    await repo.addUpdate('r1', { status: 'Verified', meta: { when: d } });
    const [u] = await repo.listUpdates('r1');
    expect(u.at).toBeInstanceOf(Date);
    expect(u.meta.when).toEqual(d);
  });
  it('strips nested undefined on write (double throws on undefined)', async () => {
    const { repo } = setup();
    const id = await repo.createReport({ ...base, location: { lat: 1, lng: 2, extra: undefined }, photos: [{ url: 'u', x: undefined }], gone: undefined });
    const r = await repo.getReport(id);
    expect(r.location).toEqual({ lat: 1, lng: 2 });
    expect(r.photos).toEqual([{ url: 'u' }]);
    expect(r).not.toHaveProperty('gone');
    await repo.addAudit({ action: 'a', before: { k: undefined }, after: { z: 1 } });
    expect((await repo.listAudit({}))[0].before).toEqual({});
  });
});

describe('firestoreRepo.listReports', () => {
  it('passes filters and returns newest first', async () => {
    const { db, repo } = setup();
    const mk = async (data, createdAt) => {
      const id = await repo.createReport(data);
      await db.collection('reports').doc(id).update({ createdAt });
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
    const last = db.calls.queries.at(-1);
    expect(last.wheres.map((w) => w[0]).sort()).toEqual(['createdAt', 'createdAt']);
    expect(last.order).toEqual(['createdAt', 'desc']);
  });
  it('listOpenReports excludes closed statuses', async () => {
    const { repo } = setup();
    const a = await repo.createReport({ ...base });
    await repo.createReport({ ...base, status: 'Closed' });
    expect((await repo.listOpenReports()).map((r) => r.id)).toEqual([a]);
  });
});
