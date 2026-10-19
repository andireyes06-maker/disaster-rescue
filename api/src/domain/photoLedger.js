// Pure decisions for the abandoned-photo ledger (design: PHOTO-CLEANUP-SPEC.md). Repositories call these inside the
// same transaction that reads the ledger row and the submission claim, so the fake repo and the Firestore adapter
// cannot disagree. Nothing here reads the clock or the network.
//
// Ledger row states:
//   reserved   - asset id reserved for a claim generation before any bytes are sent
//   accepted   - the provider confirmed the upload (metadata recorded)
//   committed  - attached to a report by the winning generation's commit (terminal, never destroyed by cleanup)
//   abandoned   - cleanup leased the row for deletion; the original attempt can no longer attach it; a destroy will be retried
//   reconciling - the provider reported "not found". That does not prove no upload will land later (the provider cannot be
//                 asked to cancel one), so the row stays durable and is re-checked on a capped backoff, never expired
//   deleted     - a destroy returned "ok": the asset is confirmed removed (terminal)
//
// No timer proves cancellation. The re-check interval bounds the cost of reconciliation, not the risk: a late upload is
// removed when a later check finds it. Real provider behaviour is a gate (see the completion ledger).

import { randomBytes } from 'node:crypto';

// No upload for a reserved id may still be in flight after this. Cleanup waits for it before it abandons a row.
export const UPLOAD_DEADLINE_MS = 10 * 60_000;
// First re-check after a "not found" result, then doubling up to RECONCILE_MAX_MS.
export const LATE_UPLOAD_GRACE_MS = 15 * 60_000;
export const RECONCILE_MAX_MS = 24 * 60 * 60_000;
// While a live lease protects an attempt, cleanup re-checks the row at this interval.
export const LIVE_RECHECK_MS = 60_000;
const RETRY_BASE_MS = 30_000;
const RETRY_MAX_MS = 15 * 60_000;

export const OPEN_STATES = ['reserved', 'accepted'];
// Rows cleanup may lease for a destroy attempt. Both wait for a provider result, neither can attach to a report.
export const DESTROYABLE_STATES = ['abandoned', 'reconciling'];

// Unique, never reused: 18 random bytes per id, under the same folder as before.
export function newAssetId() {
  return `disaster-rescue/${randomBytes(18).toString('base64url')}`;
}

// A reservation is allowed only for the generation that holds a pending claim, for the same reserved report.
export function decideReserve(claim, { generation, reportId }) {
  if (!claim) return { mode: 'fenced' };
  if (claim.state === 'done') return { mode: 'replay', result: claim.result };
  if (claim.state === 'pending' && claim.generation === generation && claim.reportId === reportId) return { mode: 'reserve' };
  return { mode: 'fenced' };
}

// Initial ledger row. Holds ids and states only: never photo bytes, urls, descriptions or contact details.
export function reservedRow({ assetId, claimId, uid, generation, reportId, now }) {
  return {
    assetId, claimId, uid, generation, reportId, state: 'reserved',
    reservedAtMs: now, nextAttemptAtMs: now + UPLOAD_DEADLINE_MS, attempts: 0, owner: null, leaseUntilMs: 0, abandonedAtMs: null,
    sizeBytes: null, mimeType: null,
  };
}

// Recording a provider acceptance applies only to a row that is still reserved for this same owner.
export function decideAccepted(row, { claimId, generation, reportId }) {
  if (!row || row.state !== 'reserved') return 'refuse';
  return row.claimId === claimId && row.generation === generation && row.reportId === reportId ? 'accept' : 'refuse';
}

// A commit may attach an asset only when the row is still open and was reserved by this generation for this report.
export function decideAttach(row, { claimId, generation, reportId }) {
  if (!row) return 'refuse';
  if (!OPEN_STATES.includes(row.state)) return 'refuse';
  if (row.claimId !== claimId || row.generation !== generation || row.reportId !== reportId) return 'refuse';
  return 'attach';
}

// Cleanup may abandon an open row only when nothing can still attach it:
//   - the upload deadline has passed (no bytes can still be in flight), and
//   - the claim is not held by a live attempt of the same generation.
// A completed claim, a claim taken over by a newer generation, or a missing claim cannot attach the row any more.
export function planAbandon(row, claim, now) {
  if (!row || !OPEN_STATES.includes(row.state)) return { action: 'skip' };
  const deadline = row.reservedAtMs + UPLOAD_DEADLINE_MS;
  if (now < deadline) return { action: 'recheck', nextAttemptAtMs: deadline };
  if (!claim) return { action: 'abandon' };
  if (claim.state === 'done') return { action: 'abandon' };
  if (claim.generation > row.generation) return { action: 'abandon' };
  if (claim.generation < row.generation) return { action: 'skip' };
  if ((claim.leaseUntilMs ?? 0) > now) return { action: 'recheck', nextAttemptAtMs: now + LIVE_RECHECK_MS };
  return { action: 'abandon' };
}

// Backoff for failed or not-yet-final destroys. Bounded so a stuck row is retried at least every 15 minutes.
export function retryDelayMs(attempts) {
  return Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** Math.max(0, attempts - 1));
}

// Re-check delay for a row the provider reports as not found. Doubles from LATE_UPLOAD_GRACE_MS up to RECONCILE_MAX_MS.
export function reconcileDelayMs(attempts) {
  return Math.min(RECONCILE_MAX_MS, LATE_UPLOAD_GRACE_MS * 2 ** Math.max(0, attempts - 1));
}

// Row patch after a destroy attempt. `outcome` is 'ok', 'not_found' or 'error'.
// Only 'ok' is terminal. 'not_found' keeps the row durable in `reconciling`, because a provider upload that is still
// in flight could land after any grace period: the row is re-checked until a destroy confirms removal.
export function planDestroyOutcome(row, outcome, now) {
  const base = { owner: null, leaseUntilMs: 0 };
  if (outcome === 'ok') {
    return { ...base, state: 'deleted', nextAttemptAtMs: null, deletedAtMs: now, outcome: 'destroyed' };
  }
  const attempts = (row.attempts ?? 0) + 1;
  if (outcome === 'not_found') {
    return {
      ...base, state: 'reconciling', attempts, nextAttemptAtMs: now + reconcileDelayMs(attempts),
      reconcileSinceMs: row.reconcileSinceMs ?? now, lastOutcome: outcome,
    };
  }
  return { ...base, state: 'abandoned', attempts, nextAttemptAtMs: now + retryDelayMs(attempts), lastOutcome: outcome };
}
