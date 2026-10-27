// Abandoned-photo cleanup (spec: design-plans/.../recovery/PHOTO-CLEANUP-SPEC.md). In-memory repo, fake provider,
// controlled clock. Real Firestore decisions are covered by test/adapters/submission-photo-ledger.emulator.test.js.
import { describe, it, expect, vi } from 'vitest';
import { createMemoryRepo } from '../fakes/memoryRepo.js';
import { createCloudProviderFake } from '../fakes/cloudProviderFake.js';
import { create, submissionFingerprint, makeReportId, makeReference } from '../../src/services/reportService.js';
import { drainPhotoCleanup } from '../../src/services/photoCleanupService.js';
import { parseReportInput } from '../../src/domain/validation.js';
import { UPLOAD_DEADLINE_MS, LATE_UPLOAD_GRACE_MS, newAssetId } from '../../src/domain/photoLedger.js';
import { HttpError } from '../../src/errors.js';

const KEY = 'photo-key-0000000001';
const LEASE = 120_000;
const T = 1_000_000;
const user = { uid: 'resident-1', role: 'resident' };
const input = { type: 'flood', description: 'Water across the road, contact Maria 0917 000 1234', lat: '14.5870', lng: '120.9720', source: 'gps', area: 'Quezon City' };
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xaa, 0xbb]);
const photo = () => ({ buffer: JPEG, mimetype: 'image/jpeg', size: JPEG.length, originalname: 'scene.jpg' });

function setup() {
  const repo = createMemoryRepo();
  const provider = createCloudProviderFake();
  const clock = { t: T };
  const notifier = { notifyRole: vi.fn(async () => {}) };
  const deps = { repo, uploader: provider, notifier, clock: () => clock.t };
  const cleanup = (now = clock.t, owner = 'worker-a') => drainPhotoCleanup({ repo, uploader: provider }, { now, owner });
  return { repo, provider, clock, deps, cleanup };
}

const ledger = (repo) => repo.listPhotoAssets();
const byState = async (repo, state) => (await ledger(repo)).filter((a) => a.state === state);
const reportCount = async (repo) => (await repo.listReports({})).length;

// Simulates a worker that claimed the key, reserved ids and then died. Nothing is uploaded.
async function crashedReservation(setupObj, count = 1) {
  const { repo, clock } = setupObj;
  const fingerprint = submissionFingerprint(parseReportInput(input), Array(count).fill(photo()));
  const reportId = makeReportId();
  const claim = await repo.claimSubmission(user.uid, KEY, { fingerprint, now: clock.t, reportId, reference: makeReference(), leaseMs: LEASE });
  const assetIds = Array.from({ length: count }, () => newAssetId());
  const reserved = await repo.reservePhotoAssets(user.uid, KEY, { generation: claim.generation, reportId, assetIds, now: clock.t });
  expect(reserved.mode).toBe('reserve');
  return { assetIds, reportId, generation: claim.generation };
}

describe('crash before upload', () => {
  it('a reserved id that never received bytes is kept while its upload deadline is still running', async () => {
    const s = setup();
    const { assetIds } = await crashedReservation(s);
    expect(await s.cleanup(s.clock.t + UPLOAD_DEADLINE_MS - 1)).toMatchObject({ destroyed: 0 });
    expect(s.provider.destroyLog).toEqual([]);
    expect((await ledger(s.repo))[0]).toMatchObject({ assetId: assetIds[0], state: 'reserved' });
  });

  it('a reserved id that never received bytes stays reconciling after the deadline and the late-upload grace, never final on not found', async () => {
    const s = setup();
    const { assetIds } = await crashedReservation(s);
    const at = s.clock.t + UPLOAD_DEADLINE_MS;
    await s.cleanup(at); // first destroy: not found, so the row is kept for reconciliation
    expect((await ledger(s.repo))[0]).toMatchObject({ assetId: assetIds[0], state: 'reconciling' });
    await s.cleanup(at + LATE_UPLOAD_GRACE_MS + 1); // re-checked after the grace: still not found
    expect((await ledger(s.repo))[0]).toMatchObject({ assetId: assetIds[0], state: 'reconciling' });
    expect(await byState(s.repo, 'deleted')).toHaveLength(0);
    expect(s.provider.destroyLog).toEqual([assetIds[0], assetIds[0]]);
  });
});

describe('unknown upload outcome', () => {
  it('a timed-out upload with an unknown outcome is not destroyed before its deadline', async () => {
    const s = setup();
    s.provider.faults.unknownNext = 1;
    await expect(create(s.deps, user, input, [photo()], KEY)).rejects.toThrow('outcome unknown');
    expect(await s.cleanup(s.clock.t + 1_000)).toMatchObject({ destroyed: 0 });
    expect(s.provider.destroyLog).toEqual([]);
    expect(await reportCount(s.repo)).toBe(0);
  });

  it('a photo accepted before its response was lost is removed by reconciliation and is never attached', async () => {
    const s = setup();
    s.provider.faults.lostResponseNext = 1;
    await expect(create(s.deps, user, input, [photo()], KEY)).rejects.toThrow('response was lost');
    expect(s.provider.accepted.size).toBe(1);
    await s.cleanup(s.clock.t + UPLOAD_DEADLINE_MS);
    expect(s.provider.accepted.size).toBe(0);
    expect(await reportCount(s.repo)).toBe(0);
    expect(await byState(s.repo, 'deleted')).toHaveLength(1);
  });
});

describe('report commit boundaries', () => {
  it('a photo accepted by the provider but never attached to a report is removed after the deadline', async () => {
    const s = setup();
    const { assetIds } = await crashedReservation(s);
    await s.provider.upload([photo()], { publicIds: assetIds });
    expect(s.provider.accepted.has(assetIds[0])).toBe(true);
    await s.cleanup(s.clock.t + UPLOAD_DEADLINE_MS);
    expect(s.provider.accepted.has(assetIds[0])).toBe(false);
    expect(await reportCount(s.repo)).toBe(0);
  });

  it('a photo attached by a committed report is recorded as committed and survives repeated cleanup', async () => {
    const s = setup();
    await create(s.deps, user, input, [photo()], KEY);
    const [committed] = await byState(s.repo, 'committed');
    expect(committed).toBeTruthy();
    for (const k of [1, 2, 3]) await s.cleanup(s.clock.t + k * UPLOAD_DEADLINE_MS * 3);
    expect(s.provider.accepted.has(committed.assetId)).toBe(true);
    expect(s.provider.destroyLog).not.toContain(committed.assetId);
  });

  it('a keyed upload reserves its ids in the ledger before any bytes are sent', async () => {
    const s = setup();
    const realUpload = s.provider.upload;
    let seenAtUpload = null;
    s.provider.upload = async (...args) => { seenAtUpload = (await ledger(s.repo)).map((a) => a.state); return realUpload(...args); };
    await create(s.deps, user, input, [photo()], KEY);
    expect(seenAtUpload).toEqual(['reserved']);
  });
});

describe('stale worker and takeover', () => {
  it('a stale worker fenced by a takeover writes no report, and its late photo is removed without touching the winner', async () => {
    const s = setup();
    s.provider.faults.holdNext = 1;
    const stale = create(s.deps, user, input, [photo()], KEY);
    stale.catch(() => {});
    await vi.waitFor(async () => expect(await byState(s.repo, 'reserved')).toHaveLength(1));
    const [staleAsset] = await byState(s.repo, 'reserved');
    s.clock.t += LEASE + 1;
    const winner = await create(s.deps, user, input, [photo()], KEY);
    s.provider.land(staleAsset.assetId);
    const staleOut = await stale;
    expect(staleOut.id).toBe(winner.id);
    expect(await reportCount(s.repo)).toBe(1);
    await s.cleanup(s.clock.t + UPLOAD_DEADLINE_MS);
    await s.cleanup(s.clock.t + UPLOAD_DEADLINE_MS + LATE_UPLOAD_GRACE_MS + 1);
    const [winnerAsset] = await byState(s.repo, 'committed');
    expect(s.provider.accepted.has(winnerAsset.assetId)).toBe(true);
    expect(s.provider.destroyLog).not.toContain(winnerAsset.assetId);
  });

  it('a worker whose photo cleanup has scheduled it for deletion cannot attach it and writes no report', async () => {
    const s = setup();
    s.provider.faults.holdNext = 1;
    const stale = create(s.deps, user, input, [photo()], KEY);
    stale.catch(() => {});
    await vi.waitFor(async () => expect(await byState(s.repo, 'reserved')).toHaveLength(1));
    const [asset] = await byState(s.repo, 'reserved');
    await s.cleanup(s.clock.t + UPLOAD_DEADLINE_MS); // the lease is long expired, so cleanup schedules the id for deletion
    expect((await ledger(s.repo))[0].state).toBe('reconciling');
    s.provider.land(asset.assetId); // the upload finally lands after the destroy saw nothing
    await expect(stale).rejects.toMatchObject({ status: 409, code: 'photos_expired' });
    expect(await reportCount(s.repo)).toBe(0);
    // The key is released, so a retry with the same content runs and succeeds on new ids.
    const retry = await create(s.deps, user, input, [photo()], KEY);
    expect(retry.id).toBeTruthy();
    expect(await reportCount(s.repo)).toBe(1);
  });

  it('a late upload that lands after a not-found destroy is removed by a later drain and is not completed early', async () => {
    const s = setup();
    s.provider.faults.holdNext = 1;
    const stale = create(s.deps, user, input, [photo()], KEY);
    stale.catch(() => {});
    await vi.waitFor(async () => expect(await byState(s.repo, 'reserved')).toHaveLength(1));
    const [asset] = await byState(s.repo, 'reserved');
    const deadline = s.clock.t + UPLOAD_DEADLINE_MS;
    await s.cleanup(deadline); // not found: the upload is still in flight
    s.provider.land(asset.assetId); // lands late
    await expect(stale).rejects.toBeInstanceOf(HttpError);
    expect(s.provider.accepted.has(asset.assetId)).toBe(true);
    await s.cleanup(deadline + 1_000); // not yet due for re-check: must not be final
    expect((await ledger(s.repo))[0].state).toBe('reconciling');
    await s.cleanup(deadline + LATE_UPLOAD_GRACE_MS + 1);
    expect(s.provider.accepted.has(asset.assetId)).toBe(false);
    expect(await byState(s.repo, 'deleted')).toHaveLength(1);
  });
});

describe('losing and winning attempts', () => {
  it('when two attempts race, only the losing attempt photos are ever destroyed and the winner photos are kept', async () => {
    const s = setup();
    s.provider.faults.holdNext = 1;
    const stale = create(s.deps, user, input, [photo(), photo()], KEY);
    stale.catch(() => {});
    await vi.waitFor(async () => expect(await byState(s.repo, 'reserved')).toHaveLength(2));
    const staleIds = (await byState(s.repo, 'reserved')).map((a) => a.assetId);
    s.clock.t += LEASE + 1;
    await create(s.deps, user, input, [photo(), photo()], KEY);
    const winnerIds = (await byState(s.repo, 'committed')).map((a) => a.assetId);
    expect(winnerIds).toHaveLength(2);
    s.provider.land(staleIds[0]);
    await stale;
    await s.cleanup(s.clock.t + UPLOAD_DEADLINE_MS);
    await s.cleanup(s.clock.t + UPLOAD_DEADLINE_MS + LATE_UPLOAD_GRACE_MS + 1);
    for (const id of winnerIds) {
      expect(s.provider.accepted.has(id)).toBe(true);
      expect(s.provider.destroyLog).not.toContain(id);
    }
    expect(s.provider.destroyLog.every((id) => staleIds.includes(id))).toBe(true);
  });
});

describe('provider failures and recovery', () => {
  it('a failed destroy leaves the photo pending and a later drain removes it', async () => {
    const s = setup();
    const { assetIds } = await crashedReservation(s);
    await s.provider.upload([photo()], { publicIds: assetIds });
    s.provider.faults.destroyErrorNext = 1;
    const at = s.clock.t + UPLOAD_DEADLINE_MS;
    expect(await s.cleanup(at)).toMatchObject({ destroyed: 0 });
    expect((await ledger(s.repo))[0]).toMatchObject({ state: 'abandoned', attempts: 1 });
    expect(s.provider.accepted.has(assetIds[0])).toBe(true);
    await s.cleanup(at + 60 * 60_000);
    expect(s.provider.accepted.has(assetIds[0])).toBe(false);
    expect(await byState(s.repo, 'deleted')).toHaveLength(1);
  });
});

describe('concurrent cleanup', () => {
  it('two cleanup workers draining at once destroy each abandoned photo exactly once', async () => {
    const s = setup();
    const { assetIds } = await crashedReservation(s, 3);
    await s.provider.upload([photo(), photo(), photo()], { publicIds: assetIds });
    const at = s.clock.t + UPLOAD_DEADLINE_MS;
    await Promise.all([
      drainPhotoCleanup({ repo: s.repo, uploader: s.provider }, { now: at, owner: 'worker-a' }),
      drainPhotoCleanup({ repo: s.repo, uploader: s.provider }, { now: at, owner: 'worker-b' }),
    ]);
    for (const id of assetIds) expect(s.provider.destroyLog.filter((x) => x === id)).toHaveLength(1);
    expect(s.provider.accepted.size).toBe(0);
  });
});

describe('ledger and identity', () => {
  it('the ledger holds ids, states and sizes only, never photo bytes, urls or contact text', async () => {
    const s = setup();
    await create(s.deps, user, input, [photo()], KEY);
    const dump = JSON.stringify(await ledger(s.repo));
    expect(dump).not.toContain('Maria');
    expect(dump).not.toContain('0917');
    expect(dump).not.toContain('https://');
    expect(dump).not.toContain('Water across');
  });

  it('a reserved id cannot be reserved again, so ids are never reused', async () => {
    const s = setup();
    const { assetIds, reportId, generation } = await crashedReservation(s);
    const again = await s.repo.reservePhotoAssets(user.uid, KEY, { generation, reportId, assetIds, now: s.clock.t });
    expect(again.mode).toBe('collision');
  });
});

describe('reconciliation after the old terminal grace (C1)', () => {
  it('a provider upload that completes after the deadline and the grace is removed by a later drain, with no request continuation (process death)', async () => {
    const s = setup();
    s.provider.faults.holdNext = 1;
    // The request continuation is dropped here: nothing awaits this promise after the upload starts, as after a process death.
    create(s.deps, user, input, [photo()], KEY).catch(() => {});
    await vi.waitFor(async () => expect(await byState(s.repo, 'reserved')).toHaveLength(1));
    const [asset] = await byState(s.repo, 'reserved');
    const deadline = s.clock.t + UPLOAD_DEADLINE_MS;
    await s.cleanup(deadline); // not found while the upload is still held
    await s.cleanup(deadline + LATE_UPLOAD_GRACE_MS + 1); // the old terminal point: still not found, so not deleted
    expect((await ledger(s.repo))[0]).toMatchObject({ assetId: asset.assetId, state: 'reconciling' });
    s.provider.land(asset.assetId); // completes long after deadline plus grace, with no callback alive
    // The provider records its own acceptance; no request promise is awaited or resumed here.
    await vi.waitFor(() => expect(s.provider.accepted.has(asset.assetId)).toBe(true));
    const due = (await ledger(s.repo))[0].nextAttemptAtMs;
    await s.cleanup(due); // a later drain with no request in memory finds the asset and destroys it
    expect(s.provider.accepted.has(asset.assetId)).toBe(false);
    expect((await ledger(s.repo))[0]).toMatchObject({ assetId: asset.assetId, state: 'deleted', outcome: 'destroyed' });
  });

  it('a reconciling row is never deleted by a not-found result, however long it waits', async () => {
    const s = setup();
    const { assetIds } = await crashedReservation(s);
    let at = s.clock.t + UPLOAD_DEADLINE_MS;
    for (let i = 0; i < 4; i++) {
      await s.cleanup(at);
      const row = (await ledger(s.repo))[0];
      expect(row).toMatchObject({ assetId: assetIds[0], state: 'reconciling' });
      at = row.nextAttemptAtMs;
    }
    expect(await byState(s.repo, 'deleted')).toHaveLength(0);
  });

  it('an unkeyed request reserves its photos in the ledger before bytes are sent, so a late unkeyed upload is still reconciled', async () => {
    const s = setup();
    s.provider.faults.holdNext = 1;
    create(s.deps, user, input, [photo()], undefined).catch(() => {});
    await vi.waitFor(async () => expect(await byState(s.repo, 'reserved')).toHaveLength(1));
    const [asset] = await byState(s.repo, 'reserved');
    expect(asset.assetId.startsWith('disaster-rescue/')).toBe(true);
    s.provider.land(asset.assetId);
    await s.cleanup(s.clock.t + UPLOAD_DEADLINE_MS + 1);
    expect(s.provider.accepted.has(asset.assetId)).toBe(false);
    expect(await reportCount(s.repo)).toBe(0);
  });

  it('the server-generated identity of an unkeyed request never deduplicates separate requests', async () => {
    const s = setup();
    const a = await create(s.deps, user, input, [], undefined);
    const b = await create(s.deps, user, input, [], undefined);
    expect(a.id).not.toBe(b.id);
    expect(await reportCount(s.repo)).toBe(2);
  });
});

describe('reconciliation visibility (counts only, no identifiers)', () => {
  it('a not-found run counts one provider call and one backlog row, and the oldest age grows on later rechecks', async () => {
    const s = setup();
    const { assetIds } = await crashedReservation(s);
    const at = s.clock.t + UPLOAD_DEADLINE_MS;
    const first = await s.cleanup(at);
    expect(first).toMatchObject({ providerCalls: 1, notFound: 1, destroyed: 0, errors: 0, reconciliation: { rows: 1, oldestAgeMs: 0 } });
    const later = await s.cleanup(at + 2 * LATE_UPLOAD_GRACE_MS);
    expect(later.reconciliation.rows).toBe(1);
    expect(later.reconciliation.oldestAgeMs).toBe(2 * LATE_UPLOAD_GRACE_MS);
    expect(assetIds).toHaveLength(1);
  });

  it('the run summary never contains an asset identifier', async () => {
    const s = setup();
    const { assetIds } = await crashedReservation(s);
    const result = await s.cleanup(s.clock.t + UPLOAD_DEADLINE_MS);
    expect(JSON.stringify(result)).not.toContain(assetIds[0]);
    expect(JSON.stringify(result)).not.toContain('disaster-rescue/');
  });

  it('a settled run with nothing to reconcile reports zero backlog and zero provider calls', async () => {
    const s = setup();
    const result = await s.cleanup(s.clock.t);
    expect(result).toMatchObject({ providerCalls: 0, checked: 0, reconciliation: { rows: 0, oldestAgeMs: 0 } });
  });
});
