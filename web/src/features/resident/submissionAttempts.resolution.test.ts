// CODEX-REPAIR-REVIEW R1 and R3 at the store level. Storage faults are injected explicitly.
import { describe, it, expect } from 'vitest';
import { ATTEMPT_LIMIT, createAttemptStore, storageKeyFor } from './submissionAttempts';

const scope = { uid: 'uid-resolution', project: 'demo-project', apiBase: 'http://localhost:3000/api' };
const d = (c: string) => c.repeat(64);

function memoryStorage(opts: { setThrows?: () => boolean } = {}) {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (k: string) => data.get(k) ?? null,
    setItem(k: string, v: string) { if (opts.setThrows?.()) throw new Error('[injected] storage write denied'); data.set(k, v); },
    removeItem(k: string) { data.delete(k); },
    clear() { data.clear(); },
    raw: (k: string) => data.get(k) ?? null,
  } as Storage & { raw: (k: string) => string | null };
}

describe('R1: capacity pressure never evicts an unresolved retry key', () => {
  it('a new version beyond the capacity is blocked, not given a new key for an existing one', () => {
    const storage = memoryStorage();
    const store = createAttemptStore(scope, storage);
    const original = store.keyFor(d('a'));
    for (let i = 1; i < ATTEMPT_LIMIT; i++) store.keyFor(d(String.fromCharCode(97 + i)));
    const sixth = store.keyFor(d('z'));
    expect(sixth.blocked).toBe(true);
    expect(sixth.key).toBeNull();
    // The original payload keeps its key, so retrying it cannot create a second report.
    expect(store.keyFor(d('a')).key).toBe(original.key);
    expect(store.keyFor(d('a')).blocked).toBe(false);
  });

  it('a blocked version is not stored, and nothing is dropped to make room', () => {
    const storage = memoryStorage();
    const store = createAttemptStore(scope, storage);
    for (let i = 0; i < ATTEMPT_LIMIT; i++) store.keyFor(d(String.fromCharCode(97 + i)));
    const before = storage.raw(storageKeyFor(scope));
    store.keyFor(d('z'));
    expect(storage.raw(storageKeyFor(scope))).toBe(before);
  });

  it('forgetAll is an explicit user decision and clears only when called', () => {
    const storage = memoryStorage();
    const store = createAttemptStore(scope, storage);
    store.keyFor(d('a'));
    store.keyFor(d('b'));
    expect(createAttemptStore(scope, storage).keyFor(d('a')).blocked).toBe(false);
    store.forgetAll();
    const fresh = createAttemptStore(scope, storage);
    expect(fresh.keyFor(d('a')).key).not.toBeNull();
  });
});

describe('R3: clearing a confirmed key is observable and never hides other unresolved entries', () => {
  it('confirm reports whether the removal reached storage', () => {
    const storage = memoryStorage();
    const store = createAttemptStore(scope, storage);
    store.keyFor(d('a'));
    expect(store.confirm(d('a'))).toEqual({ persisted: true });
  });

  it('[injected] when the removal cannot be written, confirm says so instead of failing silently', () => {
    let deny = false;
    const storage = memoryStorage({ setThrows: () => deny });
    const store = createAttemptStore(scope, storage);
    store.keyFor(d('a'));
    deny = true;
    expect(store.confirm(d('a'))).toEqual({ persisted: false });
  });

  it('[injected] a failed removal keeps other unresolved entries in memory and in storage', () => {
    let deny = false;
    const storage = memoryStorage({ setThrows: () => deny });
    const store = createAttemptStore(scope, storage);
    const b = store.keyFor(d('b')).key;
    store.keyFor(d('a'));
    deny = true;
    store.confirm(d('a'));
    deny = false;
    expect(store.keyFor(d('b')).key).toBe(b);
    expect(createAttemptStore(scope, storage).keyFor(d('b')).key).toBe(b);
  });

  it('[injected] the next successful write removes a confirmed entry whose removal had failed', () => {
    let deny = false;
    const storage = memoryStorage({ setThrows: () => deny });
    const store = createAttemptStore(scope, storage);
    store.keyFor(d('a'));
    deny = true;
    store.confirm(d('a'));
    deny = false;
    store.keyFor(d('c'));
    const stored = JSON.parse(storage.raw(storageKeyFor(scope)) ?? '{}') as { attempts: { digest: string }[] };
    expect(stored.attempts.map((x) => x.digest)).not.toContain(d('a'));
  });
});
