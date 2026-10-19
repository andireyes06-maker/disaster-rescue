// Retry keys for report sends that were not confirmed (IDEMPOTENCY-REPAIR-SPEC.md, browser requirements).
//
// What is kept, and only in this tab's sessionStorage:
//   { v: 1, attempts: [{ digest, key }] }   at most ATTEMPT_LIMIT entries, one per unconfirmed content version.
// A digest is a SHA-256 of the normalized fields and of each photo's bytes, in order. It is not the report.
// Nothing else is kept: no description, contact data, coordinates, photos, names, tokens or passwords.
//
// Lifetime and limits (CODEX-REPAIR-REVIEW R1 and R3):
// - An entry is removed only when the server confirms the report, when the server refuses this content (400, or 409 for a
//   reused key), or when the person explicitly chooses to send as a new report or to forget unconfirmed sends. A failed, lost
//   or unclear send keeps its entry.
// - Entries are never evicted to make room. When ATTEMPT_LIMIT unconfirmed versions are held, a new version is blocked until
//   the person resolves them (check My reports, or forget them deliberately). The original payload always keeps its key.
// - There is no time-based expiry.
// - Entries are scoped to the signed-in account, the Firebase project and the API address, so another account or environment
//   never reuses them.
// - If sessionStorage is unavailable, full or corrupt, the same bookkeeping works in memory for the page's lifetime only.
//   `persisted` says whether the last write reached storage. The form tells the person when it did not.
// - A removal that cannot be written leaves its entry in storage. A later successful write drops it, because memory no longer
//   holds it. If no later write succeeds, a later identical send is answered with the original report and the form asks the
//   person to choose (the server marks such answers as replays).

export const ATTEMPT_LIMIT = 5;
const VERSION = 1;
const KEY_RE = /^[A-Za-z0-9_-]{16,100}$/;
const DIGEST_RE = /^[0-9a-f]{64}$/;

export interface Attempt { digest: string; key: string }
export interface AttemptScope { uid: string; project: string; apiBase: string }
export interface SubmissionFields {
  type: string;
  description: string;
  lat: number;
  lng: number;
  source: string;
  addressText?: string;
  contactName?: string;
  contactPhone?: string;
}
// key is null only when blocked. persisted is false when the entry could not be written to storage.
export interface KeyChoice { key: string | null; blocked: boolean; persisted: boolean }
export interface WriteResult { persisted: boolean }
export interface AttemptStore {
  keyFor(digest: string): KeyChoice;
  // The server confirmed this content's report.
  confirm(digest: string): WriteResult;
  // The server refused this content, or the person chose to send it as a new report.
  forget(digest: string): WriteResult;
  // The person chose to drop every unconfirmed send held in this tab.
  forgetAll(): WriteResult;
  unresolvedCount(): number;
}

export function storageKeyFor(scope: AttemptScope): string {
  return `dr.report-attempts.v${VERSION}:${scope.uid}:${scope.project}:${scope.apiBase}`;
}

export function newRetryKey(): string {
  return globalThis.crypto.randomUUID();
}

async function sha256Hex(bytes: ArrayBuffer | Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes as ArrayBuffer);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

// Stable across reloads and reselection: depends only on normalized values and actual bytes, never on File identity.
export async function digestSubmission(fields: SubmissionFields, photos: readonly Blob[]): Promise<string> {
  const normalized = {
    type: fields.type,
    description: fields.description,
    lat: String(fields.lat),
    lng: String(fields.lng),
    source: fields.source,
    addressText: fields.addressText ?? '',
    contactName: fields.contactName ?? '',
    contactPhone: fields.contactPhone ?? '',
  };
  const photoDigests: string[] = [];
  for (const photo of photos) photoDigests.push(await sha256Hex(await photo.arrayBuffer()));
  const canonical = JSON.stringify({ v: VERSION, fields: normalized, photos: photoDigests.map((d, i) => [d, photos[i].size]) });
  return sha256Hex(new TextEncoder().encode(canonical));
}

function safeSessionStorage(): Storage | null {
  try { return globalThis.sessionStorage ?? null; } catch { return null; }
}

// Accepts only well-formed entries. Anything else is dropped, so a corrupt value cannot send a wrong key.
function readAttempts(storage: Storage, storageKey: string): Attempt[] {
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { v?: unknown; attempts?: unknown };
    if (parsed?.v !== VERSION || !Array.isArray(parsed.attempts)) return [];
    return parsed.attempts
      .filter((a): a is Attempt => typeof a === 'object' && a !== null
        && typeof (a as Attempt).digest === 'string' && DIGEST_RE.test((a as Attempt).digest)
        && typeof (a as Attempt).key === 'string' && KEY_RE.test((a as Attempt).key))
      .slice(0, ATTEMPT_LIMIT);
  } catch {
    return [];
  }
}

export function createAttemptStore(scope: AttemptScope | null, storage: Storage | null = safeSessionStorage()): AttemptStore {
  const storageKey = scope ? storageKeyFor(scope) : null;
  let attempts: Attempt[] = scope && storage && storageKey ? readAttempts(storage, storageKey) : [];
  // A store that can read its entries from storage starts out persisted; the first failed write clears this.
  let lastWriteOk = Boolean(scope && storage && storageKey);

  // Writes the whole list. Memory is always updated, so the page keeps working when storage refuses the write.
  const save = (): boolean => {
    if (!storage || !storageKey) { lastWriteOk = false; return false; }
    try {
      storage.setItem(storageKey, JSON.stringify({ v: VERSION, attempts }));
      lastWriteOk = true;
    } catch {
      lastWriteOk = false;
    }
    return lastWriteOk;
  };

  const remove = (digest: string): WriteResult => {
    const before = attempts.length;
    attempts = attempts.filter((a) => a.digest !== digest);
    if (attempts.length === before) return { persisted: lastWriteOk };
    return { persisted: save() };
  };

  return {
    keyFor(digest) {
      const existing = attempts.find((a) => a.digest === digest);
      if (existing) return { key: existing.key, blocked: false, persisted: lastWriteOk };
      if (attempts.length >= ATTEMPT_LIMIT) return { key: null, blocked: true, persisted: lastWriteOk };
      const key = newRetryKey();
      attempts = [...attempts, { digest, key }];
      return { key, blocked: false, persisted: save() };
    },
    confirm: remove,
    forget: remove,
    forgetAll() {
      attempts = [];
      return { persisted: save() };
    },
    unresolvedCount() {
      return attempts.length;
    },
  };
}
