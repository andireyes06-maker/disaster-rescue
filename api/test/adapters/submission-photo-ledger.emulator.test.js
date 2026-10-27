// Photo ledger decisions on real Firestore transactions. Runs only inside the emulator. The file name matches the
// existing `test:submission-emulator` pattern (test/adapters/submission), so no package.json change is needed.
import { describe, it, expect, beforeAll } from 'vitest';
import { createHash } from 'node:crypto';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createFirestoreRepo } from '../../src/adapters/firestoreRepo.js';
import { newAssetId, UPLOAD_DEADLINE_MS, LATE_UPLOAD_GRACE_MS } from '../../src/domain/photoLedger.js';
import { submissionFingerprint } from '../../src/services/reportService.js';
import { parseReportInput } from '../../src/domain/validation.js';

const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const LEASE = 120_000;
const T = 2_000_000;
const input = parseReportInput({ type: 'flood', description: 'Emulator ledger check', lat: '14.5870', lng: '120.9720', source: 'gps', area: 'Quezon City' });
const photos = [{ buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]), mimetype: 'image/jpeg' }];

describe.skipIf(!emulator)('photo ledger against the Firestore emulator', () => {
  let db;
  const uidFor = (label) => `pl-${label}-${Math.random().toString(36).slice(2, 10)}`;
  const KEY = (label) => `pl-key-${label}-${Math.random().toString(36).slice(2, 10)}`;
  // Ledger rows are keyed by the SHA-256 of the asset id (Firestore document ids cannot contain "/").
  const ledgerDoc = async (assetId) => (await db.collection('photoAssets').doc(createHash('sha256').update(assetId).digest('hex')).get()).data();

  beforeAll(() => {
    const app = getApps().length ? getApps()[0] : initializeApp({ projectId: 'demo-idem-test' });
    db = getFirestore(app);
  });

  // Claims the key as a new worker (generation 1) and returns the reservation context.
  async function claimAs(repo, uid, key, now = T) {
    const fingerprint = submissionFingerprint(input, photos);
    const reportId = `rid-${uid}`;
    const claim = await repo.claimSubmission(uid, key, { fingerprint, now, reportId, reference: 'DR-PLTEST', leaseMs: LEASE });
    expect(claim.mode).toBe('run');
    return { reportId, generation: claim.generation };
  }

  it('a taken-over generation cannot reserve asset ids on the real emulator', async () => {
    const uid = uidFor('fence');
    const key = KEY('fence');
    const repo = createFirestoreRepo(db);
    const first = await claimAs(repo, uid, key, T);
    // The first worker's lease expires and a second worker takes the claim over (generation 2).
    const second = await repo.claimSubmission(uid, key, { fingerprint: submissionFingerprint(input, photos), now: T + LEASE + 1, reportId: 'rid-other', reference: 'DR-OTHER1', leaseMs: LEASE });
    expect(second.generation).toBe(2);
    const stale = await repo.reservePhotoAssets(uid, key, { generation: first.generation, reportId: first.reportId, assetIds: [newAssetId()], now: T + LEASE + 2 });
    expect(stale.mode).toBe('fenced');
  }, 30_000);

  it('a commit refuses an asset that cleanup abandoned on the real emulator, and writes no report', async () => {
    const uid = uidFor('abandoned');
    const key = KEY('abandoned');
    const repo = createFirestoreRepo(db);
    const { reportId, generation } = await claimAs(repo, uid, key, T);
    const assetId = newAssetId();
    await repo.reservePhotoAssets(uid, key, { generation, reportId, assetIds: [assetId], now: T });
    const at = T + UPLOAD_DEADLINE_MS;
    const claimed = await repo.claimPhotoAssetForCleanup(assetId, { owner: 'w1', now: at, leaseMs: 60_000 });
    expect(claimed).toMatchObject({ state: 'abandoned' });
    const report = { reference: 'DR-PLTEST', type: 'flood', description: 'x', status: 'Submitted', verified: false, priority: 'medium', location: {}, coarseLocation: {}, reporterId: uid, photos: [], createdAt: new Date() };
    const out = await repo.commitSubmission(uid, key, { generation, reportId, report, assetIds: [assetId], now: at });
    expect(out.mode).toBe('assets_unavailable');
    expect(await db.collection('reports').doc(reportId).get()).toMatchObject({ exists: false });
  }, 30_000);

  it('a committed asset is never claimed for cleanup on the real emulator', async () => {
    const uid = uidFor('committed');
    const key = KEY('committed');
    const repo = createFirestoreRepo(db);
    const { reportId, generation } = await claimAs(repo, uid, key, T);
    const assetId = newAssetId();
    await repo.reservePhotoAssets(uid, key, { generation, reportId, assetIds: [assetId], now: T });
    const report = { reference: 'DR-PLTEST', type: 'flood', description: 'x', status: 'Submitted', verified: false, priority: 'medium', location: {}, coarseLocation: {}, reporterId: uid, photos: [], createdAt: new Date() };
    expect((await repo.commitSubmission(uid, key, { generation, reportId, report, assetIds: [assetId], now: T })).mode).toBe('commit');
    expect(await ledgerDoc(assetId)).toMatchObject({ state: 'committed', nextAttemptAtMs: null });
    expect(await repo.claimPhotoAssetForCleanup(assetId, { owner: 'w1', now: T + 10 * UPLOAD_DEADLINE_MS, leaseMs: 60_000 })).toBeNull();
  }, 30_000);

  it('two concurrent cleanup claims on one asset yield exactly one owner on the real emulator', async () => {
    const uid = uidFor('race');
    const key = KEY('race');
    const repo = createFirestoreRepo(db);
    const { reportId, generation } = await claimAs(repo, uid, key, T);
    const assetId = newAssetId();
    await repo.reservePhotoAssets(uid, key, { generation, reportId, assetIds: [assetId], now: T });
    const at = T + UPLOAD_DEADLINE_MS;
    const [a, b] = await Promise.all([
      repo.claimPhotoAssetForCleanup(assetId, { owner: 'wa', now: at, leaseMs: 60_000 }),
      repo.claimPhotoAssetForCleanup(assetId, { owner: 'wb', now: at, leaseMs: 60_000 }),
    ]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
  }, 30_000);

  it('a not-found destroy keeps the row durable in reconciling on the real emulator, never deleted', async () => {
    const uid = uidFor('grace');
    const key = KEY('grace');
    const repo = createFirestoreRepo(db);
    const { reportId, generation } = await claimAs(repo, uid, key, T);
    const assetId = newAssetId();
    await repo.reservePhotoAssets(uid, key, { generation, reportId, assetIds: [assetId], now: T });
    const at = T + UPLOAD_DEADLINE_MS;
    await repo.claimPhotoAssetForCleanup(assetId, { owner: 'w1', now: at, leaseMs: 60_000 });
    expect(await repo.finishPhotoAssetCleanup(assetId, 'w1', 'not_found', at)).toBe(true);
    const doc = await ledgerDoc(assetId);
    expect(doc).toMatchObject({ state: 'reconciling', owner: null, reconcileSinceMs: at });
    expect(doc.nextAttemptAtMs).toBe(at + LATE_UPLOAD_GRACE_MS);
  }, 30_000);

  it('a reconciling row is leased again and deleted only by a confirmed destroy on the real emulator', async () => {
    const uid = uidFor('reconcile');
    const key = KEY('reconcile');
    const repo = createFirestoreRepo(db);
    const { reportId, generation } = await claimAs(repo, uid, key, T);
    const assetId = newAssetId();
    await repo.reservePhotoAssets(uid, key, { generation, reportId, assetIds: [assetId], now: T });
    const at = T + UPLOAD_DEADLINE_MS;
    await repo.claimPhotoAssetForCleanup(assetId, { owner: 'w1', now: at, leaseMs: 60_000 });
    await repo.finishPhotoAssetCleanup(assetId, 'w1', 'not_found', at);
    const due = (await ledgerDoc(assetId)).nextAttemptAtMs;
    const leased = await repo.claimPhotoAssetForCleanup(assetId, { owner: 'w2', now: due, leaseMs: 60_000 });
    expect(leased).toMatchObject({ state: 'reconciling', owner: 'w2' });
    expect(await repo.finishPhotoAssetCleanup(assetId, 'w2', 'ok', due)).toBe(true);
    expect(await ledgerDoc(assetId)).toMatchObject({ state: 'deleted', nextAttemptAtMs: null });
  }, 30_000);

  it('the reconciliation summary counts unresolved rows and reports the oldest age on the real emulator', async () => {
    const uid = uidFor('summary');
    const key = KEY('summary');
    const repo = createFirestoreRepo(db);
    const { reportId, generation } = await claimAs(repo, uid, key, T);
    const assetId = newAssetId();
    await repo.reservePhotoAssets(uid, key, { generation, reportId, assetIds: [assetId], now: T });
    const at = T + UPLOAD_DEADLINE_MS;
    await repo.claimPhotoAssetForCleanup(assetId, { owner: 'w1', now: at, leaseMs: 60_000 });
    await repo.finishPhotoAssetCleanup(assetId, 'w1', 'not_found', at);
    const summary = await repo.summarizePhotoReconciliation(at + 1_000);
    expect(summary.rows).toBeGreaterThanOrEqual(1);
    expect(summary.oldestAgeMs).toBeGreaterThanOrEqual(1_000);
    expect(Object.keys(summary).sort()).toEqual(['oldestAgeMs', 'rows']);
  }, 30_000);
});
