// Real Firestore transactions for report submission. Runs only inside the emulator (npm run test:submission-emulator).
// Injected faults are labelled [injected]. Everything else is real emulator persistence and transaction behavior.
import { describe, it, expect, beforeAll } from 'vitest';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createFirestoreRepo, claimDocId } from '../../src/adapters/firestoreRepo.js';
import { create, submissionFingerprint } from '../../src/services/reportService.js';
import { parseReportInput } from '../../src/domain/validation.js';
import { createFakeUploader } from '../fakes/fakeUploader.js';

const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const LEASE = 120_000;
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xaa, 0xbb]);
const photo = { buffer: JPEG, mimetype: 'image/jpeg', size: JPEG.length, originalname: 'scene.jpg' };
const input = { type: 'flood', description: 'Emulator submission check', lat: '14.5870', lng: '120.9720', source: 'gps' };

describe.skipIf(!emulator)('report submission against the Firestore emulator', () => {
  let db;
  const uidFor = (label) => `emu-${label}-${Math.random().toString(36).slice(2, 10)}`;
  const KEY = (label) => `emu-key-${label}-${Math.random().toString(36).slice(2, 10)}`;

  beforeAll(() => {
    const app = getApps().length ? getApps()[0] : initializeApp({ projectId: 'demo-idem-test' });
    db = getFirestore(app);
  });

  const reportsBy = async (uid) => (await db.collection('reports').where('reporterId', '==', uid).get()).size;
  const claimOf = async (uid, key) => (await db.collection('submissions').doc(claimDocId(uid, key)).get()).data();
  const deps = (repo, uploader = createFakeUploader(), clock = { t: Date.now() }) => ({ repo, uploader, clock: () => clock.t });

  it('six concurrent matching requests produce one report and one reply id', async () => {
    const uid = uidFor('race');
    const key = KEY('race');
    const repo = createFirestoreRepo(db);
    const user = { uid, role: 'resident' };
    const results = await Promise.allSettled(Array.from({ length: 6 }, () => create(deps(repo), user, input, [photo], key)));
    const ok = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    for (const r of results.filter((x) => x.status === 'rejected')) expect(r.reason.status).toBe(409);
    expect(ok.length).toBeGreaterThanOrEqual(1);
    expect(new Set(ok.map((o) => o.id)).size).toBe(1);
    expect(await reportsBy(uid)).toBe(1);
  }, 30_000); // six contended transactions can take several seconds on the emulator

  it('[injected] commit throws before the transaction: no report, and the claim is released so a retry runs once', async () => {
    const uid = uidFor('precommit');
    const key = KEY('precommit');
    const repo = createFirestoreRepo(db);
    const realCommit = repo.commitSubmission;
    let fail = true;
    repo.commitSubmission = async (...args) => {
      if (fail) { fail = false; throw new Error('[injected] commit failed before the transaction ran'); }
      return realCommit(...args);
    };
    const user = { uid, role: 'resident' };
    await expect(create(deps(repo), user, input, [photo], key)).rejects.toThrow('[injected]');
    expect(await reportsBy(uid)).toBe(0);
    expect((await claimOf(uid, key)).leaseUntilMs).toBe(0);
    const retry = await create(deps(repo), user, input, [photo], key);
    expect(retry.id).toBeTruthy();
    expect(await reportsBy(uid)).toBe(1);
  });

  it('[injected] the transaction commits but the reply is lost: the request still returns the stored report, once', async () => {
    const uid = uidFor('lostreply');
    const key = KEY('lostreply');
    const repo = createFirestoreRepo(db);
    const realCommit = repo.commitSubmission;
    repo.commitSubmission = async (...args) => {
      await realCommit(...args);
      throw new Error('[injected] reply lost after the transaction committed');
    };
    const out = await create(deps(repo), { uid, role: 'resident' }, input, [photo], key);
    expect(await reportsBy(uid)).toBe(1);
    const claim = await claimOf(uid, key);
    expect(claim).toMatchObject({ state: 'done', result: { id: out.id, reference: out.reference } });
  });

  it('[injected expiry] a stale worker cannot commit after a takeover; the winner commits exactly one report', async () => {
    const uid = uidFor('fence');
    const reportId = `rid-fence-${uid}`;
    const key = KEY('fence');
    const repo = createFirestoreRepo(db);
    const fingerprint = submissionFingerprint(parseReportInput(input), [photo]);
    const t0 = Date.now();
    const stale = await repo.claimSubmission(uid, key, { fingerprint, now: t0, reportId, reference: 'DR-FENCE1', leaseMs: LEASE });
    expect(stale).toMatchObject({ mode: 'run', generation: 1 });
    // The lease expires while the stale worker is still "uploading". A retry takes over with the same reservation.
    const winner = await repo.claimSubmission(uid, key, { fingerprint, now: t0 + LEASE + 1, reportId: 'rid-fence-x', reference: 'DR-FENCEX', leaseMs: LEASE });
    expect(winner).toMatchObject({ mode: 'run', generation: 2, reportId, reference: 'DR-FENCE1' });
    const report = { reference: 'DR-FENCE1', type: 'flood', description: input.description, status: 'Submitted', verified: false, priority: 'medium', location: { lat: 14.587, lng: 120.972, source: 'gps' }, coarseLocation: { lat: 14.587, lng: 120.972 }, reporterId: uid, photos: [] };
    // The stale worker tries to commit first, then the winner commits.
    expect(await repo.commitSubmission(uid, key, { generation: 1, reportId, report })).toEqual({ mode: 'fenced' });
    expect(await db.collection('reports').doc(reportId).get()).toHaveProperty('exists', false);
    const committed = await repo.commitSubmission(uid, key, { generation: 2, reportId, report });
    expect(committed).toMatchObject({ mode: 'commit', result: { id: reportId, reference: 'DR-FENCE1' } });
    // A late stale worker now replays the winner's result and writes nothing.
    expect(await repo.commitSubmission(uid, key, { generation: 1, reportId, report })).toMatchObject({ mode: 'replay', result: { id: reportId } });
    expect(await reportsBy(uid)).toBe(1);
  });

  it('a new server instance after completion replays the same report (restart)', async () => {
    const uid = uidFor('restart');
    const key = KEY('restart');
    const user = { uid, role: 'resident' };
    const first = await create(deps(createFirestoreRepo(db)), user, input, [photo], key);
    const afterRestart = await create(deps(createFirestoreRepo(db)), user, input, [photo], key);
    expect(afterRestart).toEqual(first);
    expect(await reportsBy(uid)).toBe(1);
  });

  it('a reused key with different content is refused after the lease expired, and the claim is not rebound', async () => {
    const uid = uidFor('rebind');
    const key = KEY('rebind');
    const repo = createFirestoreRepo(db);
    const clock = { t: Date.now() };
    const user = { uid, role: 'resident' };
    await create(deps(repo, createFakeUploader(), clock), user, input, [photo], key);
    clock.t += 10 * LEASE;
    await expect(create(deps(repo, createFakeUploader(), clock), user, { ...input, description: 'Different content' }, [photo], key))
      .rejects.toMatchObject({ status: 409, code: 'idempotency_conflict' });
    expect(await reportsBy(uid)).toBe(1);
  });

  it('a legacy pending claim with no reserved id is reported unresolved after expiry and nothing is created', async () => {
    const uid = uidFor('legacy');
    const key = KEY('legacy');
    const fingerprint = submissionFingerprint(parseReportInput(input), [photo]);
    // A legacy claim, written with the old "uid__key" address.
    await db.collection('submissions').doc(`${uid}__${key}`).set({ state: 'pending', fingerprint, startedAtMs: Date.now() - 10 * LEASE, uid });
    const repo = createFirestoreRepo(db);
    await expect(create(deps(repo), { uid, role: 'resident' }, input, [photo], key))
      .rejects.toMatchObject({ status: 409, code: 'submission_unresolved' });
    expect(await reportsBy(uid)).toBe(0);
  });
});
