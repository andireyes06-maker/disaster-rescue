// Claim identity (CODEX-REPAIR-REVIEW R2) against the real Firestore emulator. Runs only inside the emulator
// (npm run test:submission-emulator). Injected faults are labelled [injected]. Everything else is real persistence.
import { describe, it, expect, beforeAll } from 'vitest';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createFirestoreRepo } from '../../src/adapters/firestoreRepo.js';
import { create, submissionFingerprint } from '../../src/services/reportService.js';
import { parseReportInput } from '../../src/domain/validation.js';
import { createFakeUploader } from '../fakes/fakeUploader.js';

const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const input = { type: 'flood', description: 'Identity check payload', lat: '14.5870', lng: '120.9720', source: 'gps', area: 'Quezon City' };
const fingerprint = submissionFingerprint(parseReportInput(input), []);

describe.skipIf(!emulator)('claim identity against the Firestore emulator', () => {
  let db;
  beforeAll(() => {
    const app = getApps().length ? getApps()[0] : initializeApp({ projectId: 'demo-idem-test' });
    db = getFirestore(app);
  });

  // Two different accounts whose old "uid__key" text is identical: account "X__extra" with key "1234567890123456",
  // and account "X" with key "extra__1234567890123456". Random base keeps each test isolated.
  const pairs = () => {
    const base = `acct-${Math.random().toString(36).slice(2, 10)}`;
    return {
      pair1: { uid: base, key: 'extra__1234567890123456' },
      pair2: { uid: `${base}__extra`, key: '1234567890123456' },
    };
  };
  const run = (repo, pair, clock = Date.now()) => create(
    { repo, uploader: createFakeUploader(), clock: () => clock },
    { uid: pair.uid, role: 'resident' }, input, [], pair.key,
  );
  const reporterOf = async (id) => (await db.collection('reports').doc(id).get()).data()?.reporterId;
  const legacyId = (pair) => `${pair.uid}__${pair.key}`;
  const seedLegacy = (pair, doc) => db.collection('submissions').doc(legacyId(pair)).set(doc);

  it('the same payload under colliding account/key pairs never shares a result', async () => {
    const { pair1, pair2 } = pairs();
    const repo = createFirestoreRepo(db);
    const second = await run(repo, pair2);
    const first = await run(repo, pair1);
    expect(first.id).not.toBe(second.id);
    expect(await reporterOf(first.id)).toBe(pair1.uid);
    expect(await reporterOf(second.id)).toBe(pair2.uid);
  });

  it('concurrent requests from the two pairs each produce their own report', async () => {
    const { pair1, pair2 } = pairs();
    const repo = createFirestoreRepo(db);
    const [a, b] = await Promise.all([run(repo, pair1), run(repo, pair2)]);
    expect(a.id).not.toBe(b.id);
    expect(await reporterOf(a.id)).toBe(pair1.uid);
    expect(await reporterOf(b.id)).toBe(pair2.uid);
  });

  it('[injected legacy record] a legacy completed claim owned by the other account is not read as ours', async () => {
    const { pair1, pair2 } = pairs();
    await seedLegacy(pair1, { uid: pair2.uid, state: 'done', fingerprint, result: { id: 'legacy-of-pair2', status: 'Submitted', reference: 'DR-OTHER1' } });
    const repo = createFirestoreRepo(db);
    const out = await run(repo, pair1);
    expect(out.id).not.toBe('legacy-of-pair2');
    expect(await reporterOf(out.id)).toBe(pair1.uid);
  });

  it('a legacy completed claim owned by the caller still replays its stored result', async () => {
    const { pair1 } = pairs();
    await seedLegacy(pair1, { uid: pair1.uid, state: 'done', fingerprint, result: { id: 'legacy-own', status: 'Submitted', reference: 'DR-OWN001' } });
    const repo = createFirestoreRepo(db);
    expect(await run(repo, pair1)).toEqual({ id: 'legacy-own', status: 'Submitted', reference: 'DR-OWN001' });
  });

  it('[injected legacy record] a stale legacy pending claim owned by the other account is not reported as this caller\'s unresolved submission', async () => {
    const { pair1, pair2 } = pairs();
    await seedLegacy(pair1, { uid: pair2.uid, state: 'pending', fingerprint, startedAtMs: Date.now() - 10 * 120_000 });
    const repo = createFirestoreRepo(db);
    const out = await run(repo, pair1);
    expect(await reporterOf(out.id)).toBe(pair1.uid);
  });

  it('a stale legacy pending claim owned by the caller is refused as unresolved, never recreated', async () => {
    const { pair1 } = pairs();
    await seedLegacy(pair1, { uid: pair1.uid, state: 'pending', fingerprint, startedAtMs: Date.now() - 10 * 120_000 });
    const repo = createFirestoreRepo(db);
    await expect(run(repo, pair1)).rejects.toMatchObject({ status: 409, code: 'submission_unresolved' });
  });
});
