import { describe, it, expect } from 'vitest';
import { ATTEMPT_LIMIT, createAttemptStore, digestSubmission, storageKeyFor, type SubmissionFields } from './submissionAttempts';

const fields: SubmissionFields = {
  type: 'flood', description: 'Water across the road near the bridge', lat: 14.587, lng: 120.972, source: 'gps',
  addressText: 'Near the bridge', contactName: 'Maria Santos', contactPhone: '09170000001',
};
const bytes = (s: string) => new Blob([s], { type: 'image/jpeg' });
const scope = { uid: 'uid-1', project: 'demo-project', apiBase: 'http://localhost:3000/api' };
const digest = (f = fields, photos: Blob[] = []) => digestSubmission(f, photos);

// A Storage that behaves like sessionStorage, with switches for failures.
function memoryStorage(opts: { getThrows?: boolean; setThrows?: boolean; seed?: Record<string, string> } = {}) {
  const data = new Map<string, string>(Object.entries(opts.seed ?? {}));
  return {
    get length() { return data.size; },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem(k: string) { if (opts.getThrows) throw new Error('denied'); return data.get(k) ?? null; },
    setItem(k: string, v: string) { if (opts.setThrows) throw new Error('quota'); data.set(k, v); },
    removeItem(k: string) { data.delete(k); },
    clear() { data.clear(); },
    dump: () => [...data.values()].join('\n'),
  } as Storage & { dump: () => string };
}

describe('digestSubmission', () => {
  it('is stable for the same content, even when the File objects differ (reselection after reload)', async () => {
    const a = await digest(fields, [bytes('photo-one')]);
    const b = await digest(fields, [bytes('photo-one')]);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes when any normalized field changes, and when photo bytes change even at equal size', async () => {
    const base = await digest(fields, [bytes('aaaa')]);
    expect(await digest({ ...fields, description: 'Different' }, [bytes('aaaa')])).not.toBe(base);
    expect(await digest({ ...fields, contactPhone: '09170000002' }, [bytes('aaaa')])).not.toBe(base);
    expect(await digest(fields, [bytes('bbbb')])).not.toBe(base);
  });

  it('depends on photo order', async () => {
    const one = await digest(fields, [bytes('first'), bytes('second')]);
    const two = await digest(fields, [bytes('second'), bytes('first')]);
    expect(one).not.toBe(two);
  });
});

describe('createAttemptStore', () => {
  it('returns the same key for the same digest, and a new key for new content', () => {
    const store = createAttemptStore(scope, memoryStorage());
    const first = store.keyFor('d1'.padEnd(64, '0'));
    expect(store.keyFor('d1'.padEnd(64, '0')).key).toBe(first.key);
    expect(store.keyFor('d2'.padEnd(64, '0')).key).not.toBe(first.key);
    expect(first.key).toMatch(/^[A-Za-z0-9_-]{16,100}$/);
  });

  it('keeps the key across a reload (a new store reads the same tab storage)', () => {
    const storage = memoryStorage();
    const d = 'a'.repeat(64);
    const before = createAttemptStore(scope, storage).keyFor(d).key;
    const afterReload = createAttemptStore(scope, storage).keyFor(d);
    expect(afterReload.key).toBe(before);
    expect(afterReload.persisted).toBe(true);
  });

  it('forgets an entry only on confirm or forget', () => {
    const storage = memoryStorage();
    const d = 'b'.repeat(64);
    const store = createAttemptStore(scope, storage);
    const key = store.keyFor(d).key;
    store.forget(d);
    expect(createAttemptStore(scope, storage).keyFor(d).key).not.toBe(key);
  });

  it('stores only digests and keys: no description, contact, coordinates or photo bytes', () => {
    const storage = memoryStorage();
    const store = createAttemptStore(scope, storage);
    store.keyFor('c'.repeat(64));
    const stored = storage.dump();
    for (const secret of ['Water across', 'Maria', '09170000001', '14.587', '120.972', 'Near the bridge', 'photo-one']) {
      expect(stored).not.toContain(secret);
    }
    expect(JSON.parse(stored)).toMatchObject({ v: 1, attempts: [{ digest: 'c'.repeat(64) }] });
  });

  it('is bounded: a sixth unconfirmed version is blocked, never given a key that evicts another', () => {
    const store = createAttemptStore(scope, memoryStorage());
    const digests = Array.from({ length: ATTEMPT_LIMIT }, (_, i) => String(i).padStart(64, 'e'));
    const keys = digests.map((x) => store.keyFor(x).key);
    const sixth = store.keyFor('f'.repeat(64));
    expect(sixth.blocked).toBe(true);
    expect(sixth.key).toBeNull();
    expect(store.keyFor(digests[0]).key).toBe(keys[0]); // nothing was dropped
    expect(store.keyFor(digests[ATTEMPT_LIMIT - 1]).key).toBe(keys[ATTEMPT_LIMIT - 1]);
  });

  it('isolates accounts and deployments: another uid or API address never reuses the key', () => {
    const storage = memoryStorage();
    const d = 'd'.repeat(64);
    const key = createAttemptStore(scope, storage).keyFor(d).key;
    expect(createAttemptStore({ ...scope, uid: 'uid-2' }, storage).keyFor(d).key).not.toBe(key);
    expect(createAttemptStore({ ...scope, apiBase: 'https://api.example.test/api' }, storage).keyFor(d).key).not.toBe(key);
    expect(storageKeyFor(scope)).not.toBe(storageKeyFor({ ...scope, uid: 'uid-2' }));
  });

  it('a corrupt stored value is ignored and never sends a malformed key', () => {
    const key = storageKeyFor(scope);
    const storage = memoryStorage({ seed: { [key]: '{not json' } });
    const store = createAttemptStore(scope, storage);
    expect(store.keyFor('e'.repeat(64)).key).toMatch(/^[A-Za-z0-9_-]{16,100}$/);
  });

  it('drops malformed entries and keeps well-formed ones', () => {
    const key = storageKeyFor(scope);
    const good = { digest: 'a'.repeat(64), key: 'valid-key-000000000001' };
    const bad = [{ digest: 'nothex', key: 'valid-key-000000000002' }, { digest: 'b'.repeat(64), key: 'short' }];
    const storage = memoryStorage({ seed: { [key]: JSON.stringify({ v: 1, attempts: [...bad, good] }) } });
    expect(createAttemptStore(scope, storage).keyFor('a'.repeat(64)).key).toBe(good.key);
  });

  it('unavailable storage (read or write denied): the same bookkeeping works in memory and says it was not persisted', () => {
    const store = createAttemptStore(scope, memoryStorage({ setThrows: true }));
    const first = store.keyFor('g'.repeat(64));
    expect(first.persisted).toBe(false);
    expect(store.keyFor('g'.repeat(64)).key).toBe(first.key);
    const readDenied = createAttemptStore(scope, memoryStorage({ getThrows: true }));
    expect(readDenied.keyFor('g'.repeat(64)).key).toMatch(/^[A-Za-z0-9_-]{16,100}$/);
  });

  it('with no account scope nothing is written to storage', () => {
    const storage = memoryStorage();
    const store = createAttemptStore(null, storage);
    const choice = store.keyFor('h'.repeat(64));
    expect(choice.persisted).toBe(false);
    expect(storage.dump()).toBe('');
    expect(store.keyFor('h'.repeat(64)).key).toBe(choice.key);
  });
});
