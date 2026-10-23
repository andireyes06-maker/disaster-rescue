// Report retry repair: service behavior with an in-memory repo. Faults are injected explicitly and labelled [injected].
// The clock is controlled, so lease expiry is simulated without waiting. Real Firestore transactions are covered by
// test/adapters/submission.emulator.test.js.
import { describe, it, expect, vi } from 'vitest';
import { createMemoryRepo } from '../fakes/memoryRepo.js';
import { create, submissionFingerprint } from '../../src/services/reportService.js';
import { parseReportInput } from '../../src/domain/validation.js';
import { HttpError } from '../../src/errors.js';

const KEY = 'retry-key-0000000001';
const LEASE = 120_000;
const user = { uid: 'resident-1', role: 'resident' };
const input = { type: 'flood', description: 'Water across the road', lat: '14.5870', lng: '120.9720', source: 'gps' };
const JPEG_A = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xaa, 0xbb]);
const JPEG_B = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xcc, 0xdd]); // same length, different bytes
const photo = (buf = JPEG_A) => ({ buffer: buf, mimetype: 'image/jpeg', size: buf.length, originalname: 'scene.jpg' });

// Fake uploader with optional hold (for lease-expiry races), injected failure, and a removal record.
function makeUploader({ holdFirst = false } = {}) {
  let n = 0;
  let release;
  const gate = holdFirst ? new Promise((r) => { release = r; }) : null;
  let started;
  const startedP = new Promise((r) => { started = r; });
  const u = {
    uploads: [], removed: [], urlById: {}, failNext: false, holdFirst,
    started: startedP,
    release: () => release?.(),
    async upload(files) {
      u.uploads.push(files.length);
      if (u.failNext) { u.failNext = false; throw new Error('[injected] upload failure'); }
      const first = u.uploads.length === 1;
      started();
      if (first && gate) await gate;
      return files.map((f) => { n++; const item = { publicId: `pid-${n}`, url: `https://fake.cdn/p-${n}.jpg`, sizeBytes: f.buffer.length, mimeType: 'image/jpeg' }; u.urlById[item.publicId] = item.url; return item; });
    },
    async remove(items) { u.removed.push(...items.map((i) => i.publicId)); },
  };
  return u;
}

const reportCount = async (repo) => (await repo.listReports({})).length;
const auditCount = async (repo, action) => (await repo.listAudit({})).filter((a) => a.action === action).length;

function setup({ holdFirst = false } = {}) {
  const repo = createMemoryRepo();
  const uploader = makeUploader({ holdFirst });
  const notifier = { notifyRole: vi.fn(async () => {}) };
  const clock = { t: 1_000_000 };
  const deps = { repo, uploader, notifier, clock: () => clock.t };
  return { repo, uploader, notifier, clock, deps };
}

describe('atomic commit: failure before persistence', () => {
  it('[injected] commit throws before anything is written: no report, the photo is removed, and a safe retry succeeds once', async () => {
    const { repo, uploader, deps } = setup();
    let fail = true;
    const realCommit = repo.commitSubmission;
    repo.commitSubmission = async (...args) => {
      if (fail) { fail = false; throw new Error('[injected] commit failed before persistence'); }
      return realCommit(...args);
    };
    await expect(create(deps, user, input, [photo()], KEY)).rejects.toThrow('[injected] commit failed');
    expect(await reportCount(repo)).toBe(0);
    expect(uploader.removed).toHaveLength(1);
    const retry = await create(deps, user, input, [photo()], KEY);
    expect(retry.id).toBeTruthy();
    expect(await reportCount(repo)).toBe(1);
    expect(await auditCount(repo, 'report.create')).toBe(1);
  });

  it('[injected] an upload failure releases the claim, so the retry runs at once', async () => {
    const { repo, uploader, deps } = setup();
    uploader.failNext = true;
    await expect(create(deps, user, input, [photo()], KEY)).rejects.toThrow('[injected] upload failure');
    expect(await reportCount(repo)).toBe(0);
    const retry = await create(deps, user, input, [photo()], KEY);
    expect(retry.id).toBeTruthy();
    expect(await reportCount(repo)).toBe(1);
  });
});

describe('atomic commit: lost reply', () => {
  it('[injected] commit persists but the reply is lost: the request still returns the report, once, with no photo removed', async () => {
    const { repo, uploader, deps } = setup();
    const realCommit = repo.commitSubmission;
    repo.commitSubmission = async (...args) => {
      await realCommit(...args);
      throw new Error('[injected] reply lost after the commit');
    };
    const out = await create(deps, user, input, [photo()], KEY);
    expect(await reportCount(repo)).toBe(1);
    const [stored] = await repo.listReports({});
    expect(out).toMatchObject({ id: stored.id, reference: stored.reference });
    expect(uploader.removed).toHaveLength(0);
  });

  it('a retry after a lost reply replays the original report and creates nothing new', async () => {
    const { repo, deps } = setup();
    const first = await create(deps, user, input, [photo()], KEY);
    const audits = await auditCount(repo, 'report.create');
    const notifications = deps.notifier.notifyRole.mock.calls.length;
    const retry = await create(deps, user, input, [photo()], KEY);
    expect(retry).toEqual(first);
    expect(await reportCount(repo)).toBe(1);
    expect(await auditCount(repo, 'report.create')).toBe(audits);
    expect(deps.notifier.notifyRole.mock.calls.length).toBe(notifications);
  });
});

describe('concurrency and lease takeover', () => {
  it('concurrent matching requests produce one report; the loser is refused while pending or receives the winner', async () => {
    const { repo, deps } = setup();
    const results = await Promise.allSettled([create(deps, user, input, [photo()], KEY), create(deps, user, input, [photo()], KEY)]);
    const ok = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    const refused = results.filter((r) => r.status === 'rejected').map((r) => r.reason);
    expect(ok.length).toBeGreaterThanOrEqual(1);
    for (const e of refused) expect(e).toBeInstanceOf(HttpError);
    expect(new Set(ok.map((o) => o.id)).size).toBe(1);
    expect(await reportCount(repo)).toBe(1);
  });

  it('[injected lease expiry] the first worker stalls past its lease, a retry takes over and commits; the stale worker cannot commit and cannot remove the winner photos', async () => {
    const { repo, uploader, clock, deps } = setup({ holdFirst: true });
    const stale = create(deps, user, input, [photo()], KEY);
    await uploader.started;
    clock.t += LEASE + 1;
    const winner = await create(deps, user, input, [photo()], KEY);
    uploader.release();
    const staleOut = await stale;
    expect(staleOut.id).toBe(winner.id);
    expect(staleOut.reference).toBe(winner.reference);
    expect(await reportCount(repo)).toBe(1);
    // Exactly one photo was removed, and it is the stale attempt's own (by URL). The winner's photo stays on the report.
    const [winnerStored] = await repo.listReports({});
    const winnerUrls = winnerStored.photos.map((p) => p.url);
    expect(uploader.removed).toHaveLength(1);
    expect(winnerUrls).toHaveLength(1);
    expect(winnerUrls).not.toContain(uploader.urlById[uploader.removed[0]]);
    expect(await auditCount(repo, 'report.create')).toBe(1);
  });

  it('[injected expiry and restart] a worker that claimed and crashed; after the lease a new server instance commits with the reserved reference', async () => {
    const { repo, clock, deps } = setup();
    const fingerprint = submissionFingerprint(parseReportInput(input), [photo()]);
    const crashed = await repo.claimSubmission(user.uid, KEY, { fingerprint, now: clock.t, reportId: 'rid-reserved', reference: 'DR-RESERV', leaseMs: LEASE });
    expect(crashed.mode).toBe('run');
    clock.t += LEASE + 1;
    const restarted = await create({ ...deps }, user, input, [photo()], KEY); // a fresh call, same store
    expect(restarted.reference).toBe('DR-RESERV');
    expect(restarted.id).toBe('rid-reserved');
    expect(await reportCount(repo)).toBe(1);
  });
});

describe('content binding', () => {
  it('a reused key with a different body is refused, including after the lease has expired', async () => {
    const { repo, clock, deps } = setup();
    await create(deps, user, input, [photo()], KEY);
    clock.t += 10 * LEASE;
    await expect(create(deps, user, { ...input, description: 'Another report entirely' }, [photo()], KEY))
      .rejects.toMatchObject({ status: 409, code: 'idempotency_conflict' });
    expect(await reportCount(repo)).toBe(1);
  });

  it('equal-size photos with different bytes conflict for the same key (actual-content binding)', async () => {
    const { repo, deps } = setup();
    await create(deps, user, input, [photo(JPEG_A)], KEY);
    await expect(create(deps, user, input, [photo(JPEG_B)], KEY))
      .rejects.toMatchObject({ status: 409, code: 'idempotency_conflict' });
    expect(await reportCount(repo)).toBe(1);
  });

  it('an expired claim with different content is not taken over', async () => {
    const { repo, uploader, clock, deps } = setup({ holdFirst: true });
    const first = create(deps, user, input, [photo(JPEG_A)], KEY);
    await uploader.started;
    clock.t += LEASE + 1;
    await expect(create(deps, user, input, [photo(JPEG_B)], KEY)).rejects.toMatchObject({ code: 'idempotency_conflict' });
    uploader.release();
    await first;
    expect(await reportCount(repo)).toBe(1);
  });
});

describe('legacy claims', () => {
  it('a legacy pending claim with no reserved id is refused while live and reported unresolved after expiry; nothing is created', async () => {
    const { repo, clock, deps } = setup();
    const fingerprint = submissionFingerprint(parseReportInput(input), []);
    repo.seedSubmission(user.uid, KEY, { state: 'pending', fingerprint, startedAtMs: clock.t });
    await expect(create(deps, user, input, [], KEY)).rejects.toMatchObject({ status: 409, code: 'submission_in_progress' });
    clock.t += LEASE + 1;
    await expect(create(deps, user, input, [], KEY)).rejects.toMatchObject({ status: 409, code: 'submission_unresolved' });
    expect(await reportCount(repo)).toBe(0);
  });

  it('a legacy completed claim replays its stored result', async () => {
    const { repo, deps } = setup();
    const fingerprint = submissionFingerprint(parseReportInput(input), []);
    const result = { id: 'legacy-r1', status: 'Submitted', reference: 'DR-LEGACY' };
    repo.seedSubmission(user.uid, KEY, { state: 'done', fingerprint, result });
    expect(await create(deps, user, input, [], KEY)).toEqual(result);
    expect(await reportCount(repo)).toBe(0);
  });
});

describe('clients without a key', () => {
  it('keep the original behavior: each request with no key creates its own report', async () => {
    const { repo, deps } = setup();
    await create(deps, user, input, [], undefined);
    await create(deps, user, input, [], undefined);
    expect(await reportCount(repo)).toBe(2);
  });
});
