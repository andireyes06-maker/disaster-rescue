import { describe, it, expect } from 'vitest';
import { REPO_METHODS } from '../../src/ports/repo.js';
import { createMemoryRepo } from '../fakes/memoryRepo.js';
import { createFirestoreRepo } from '../../src/adapters/firestoreRepo.js';

function fakeDb() {
  const calls = { runTransaction: 0 };
  const snap = { exists: true, data: () => ({ status: 'Submitted' }) };
  const ref = { id: 'r1' };
  const tx = { get: async () => snap, update: (r, p) => { calls.update = p; } };
  const db = {
    calls,
    collection: () => ({ doc: () => ref }),
    runTransaction: async (fn) => { calls.runTransaction++; return fn(tx); },
  };
  return db;
}

describe('port parity', () => {
  it('memory repo and firestore adapter expose every REPO_METHODS name', () => {
    const impls = { memory: createMemoryRepo(), firestore: createFirestoreRepo(fakeDb()) };
    for (const [name, repo] of Object.entries(impls)) {
      for (const m of REPO_METHODS) expect(typeof repo[m], `${name}.${m}`).toBe('function');
    }
  });
});

describe('firestoreRepo.updateReportIf', () => {
  it('uses runTransaction and applies patch when status matches', async () => {
    const db = fakeDb();
    const repo = createFirestoreRepo(db);
    expect(await repo.updateReportIf('r1', 'Submitted', { status: 'Verified', x: undefined })).toBe(true);
    expect(db.calls.runTransaction).toBe(1);
    expect(db.calls.update.status).toBe('Verified');
    expect('x' in db.calls.update).toBe(false);
    expect(db.calls.update.updatedAt).toBeInstanceOf(Date);
  });
  it('returns false when status differs', async () => {
    const repo = createFirestoreRepo(fakeDb());
    expect(await repo.updateReportIf('r1', 'Closed', { status: 'X' })).toBe(false);
  });
});
