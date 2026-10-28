import { useSyncExternalStore } from 'react';

// Unsent and unconfirmed responder updates, kept in memory only. Nothing here is written to browser storage,
// and nothing is submitted automatically. Everything is dropped when the signed-in identity changes (sign-out,
// account change, team or role change, deactivation).

export interface DraftAttempt {
  // Idempotency-Key of an uncertain POST. A retry with the same content reuses it so the server can replay the result.
  key: string;
  fingerprint: string;
  // Status the uncertain POST was sent with. The retry is offered for this status only.
  status: string;
}

export interface Draft {
  reportId: string;
  status: string;
  peopleRescued: string;
  note: string;
  attempt: DraftAttempt | null;
  attempts?: DraftAttempt[];
  // Set by the assignment page once the report has left the open list but the responder still has access to it.
  closed?: { type: string; reference: string; status: string };
}

type Patch = Partial<Omit<Draft, 'reportId'>>;

const drafts = new Map<string, Draft>();
let snapshot: ReadonlyMap<string, Draft> = new Map();
const listeners = new Set<() => void>();
// undefined until the first identity is seen. A later change to a different identity clears every draft.
let identity: string | null | undefined;
let sessionGeneration = 0;
const reportGenerations = new Map<string, number>();

export function draftGeneration(reportId: string): string {
  return `${sessionGeneration}:${reportGenerations.get(reportId) ?? 0}`;
}

export const MAX_UNCONFIRMED_UPDATES = 5;
export function unresolvedAttempts(draft: Draft | undefined): DraftAttempt[] {
  const all = [...(draft?.attempts ?? []), ...(draft?.attempt ? [draft.attempt] : [])];
  return [...new Map(all.map(attempt => [attempt.key, attempt])).values()];
}

// Reserve before sending; a pending or uncertain attempt must never be silently evicted.
export function reserveAttempt(reportId: string, fingerprint: string, status: string): DraftAttempt | null {
  const attempts = unresolvedAttempts(getDraft(reportId));
  const existing = attempts.find(attempt => attempt.fingerprint === fingerprint);
  if (existing) { saveDraft(reportId, { attempt: existing }); return existing; }
  if (attempts.length >= MAX_UNCONFIRMED_UPDATES) return null;
  const attempt = { key: crypto.randomUUID(), fingerprint, status };
  saveDraft(reportId, { attempts: [...attempts, attempt], attempt });
  return attempt;
}

export function settleAttempt(reportId: string, key: string): void {
  const draft = getDraft(reportId);
  if (!draft) return;
  const attempts = unresolvedAttempts(draft).filter(attempt => attempt.key !== key);
  saveDraft(reportId, { attempts, attempt: attempts.at(-1) ?? null });
}

export function forgetAttempts(reportId: string): void {
  if (getDraft(reportId)) saveDraft(reportId, { attempts: [], attempt: null });
}

function publish(): void {
  snapshot = new Map(drafts);
  listeners.forEach((fn) => fn());
}

// True when a draft has something the responder would lose: typed text, a count, or an uncertain attempt.
export function hasContent(d: Draft): boolean {
  return d.note.trim() !== '' || (d.peopleRescued !== '' && d.peopleRescued !== '0') || unresolvedAttempts(d).length > 0;
}

export function getDraft(reportId: string): Draft | undefined {
  return drafts.get(reportId);
}

// Creates or updates a draft. A draft stays until it is cleared, so an open form never loses its fields.
export function saveDraft(reportId: string, patch: Patch): void {
  const current = drafts.get(reportId) ?? { reportId, status: '', peopleRescued: '0', note: '', attempt: null };
  drafts.set(reportId, { ...current, ...patch, reportId });
  publish();
}

export function clearDraft(reportId: string): void {
  reportGenerations.set(reportId, (reportGenerations.get(reportId) ?? 0) + 1);
  if (drafts.delete(reportId)) publish();
}

export function clearAllDrafts(): void {
  sessionGeneration++;
  if (drafts.size === 0) return;
  drafts.clear();
  publish();
}

// Called with the signed-in identity (for example "uid|role|team") or null when signed out.
export function setIdentity(next: string | null): void {
  if (identity !== undefined && identity !== next) clearAllDrafts();
  identity = next;
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// Every draft, keyed by report id. The map is replaced on each change so React sees the update.
export function useDrafts(): ReadonlyMap<string, Draft> {
  return useSyncExternalStore(subscribe, () => snapshot);
}

// The draft for one report, re-rendered on any change.
export function useDraft(reportId: string): Draft | undefined {
  return useSyncExternalStore(subscribe, () => snapshot.get(reportId));
}

// Test helper: resets the module between tests.
export function resetDraftStoreForTests(): void {
  drafts.clear();
  snapshot = new Map();
  identity = undefined;
  sessionGeneration++;
  reportGenerations.clear();
  listeners.clear();
}
