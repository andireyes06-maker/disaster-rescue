// Pure decisions for the abandoned-photo ledger (spec: PHOTO-CLEANUP-SPEC.md, items 1 to 5).
import { describe, it, expect } from 'vitest';
import {
  newAssetId, decideReserve, decideAttach, planAbandon, planDestroyOutcome, retryDelayMs,
  UPLOAD_DEADLINE_MS, LATE_UPLOAD_GRACE_MS, RECONCILE_MAX_MS, reconcileDelayMs,
} from '../../src/domain/photoLedger.js';

const T0 = 1_000_000;
const pendingClaim = (over = {}) => ({ state: 'pending', generation: 1, reportId: 'rid-1', reference: 'DR-AAAAAA', leaseUntilMs: T0 + 120_000, ...over });
const entry = (over = {}) => ({
  assetId: 'disaster-rescue/a', claimId: 'c1', uid: 'u1', generation: 1, reportId: 'rid-1', state: 'reserved',
  reservedAtMs: T0, nextAttemptAtMs: T0 + UPLOAD_DEADLINE_MS, attempts: 0, owner: null, leaseUntilMs: 0, abandonedAtMs: null, ...over,
});

describe('asset identity', () => {
  it('uploaded asset ids are unique and never reused across reservations', () => {
    const ids = new Set(Array.from({ length: 2000 }, () => newAssetId()));
    expect(ids.size).toBe(2000);
    for (const id of ids) expect(id.startsWith('disaster-rescue/')).toBe(true);
  });
});

describe('reservation fence', () => {
  it('reserving asset ids is allowed for the generation that holds a live claim', () => {
    expect(decideReserve(pendingClaim(), { generation: 1, reportId: 'rid-1' })).toEqual({ mode: 'reserve' });
  });
  it('a worker whose generation was taken over cannot reserve asset ids', () => {
    expect(decideReserve(pendingClaim({ generation: 2 }), { generation: 1, reportId: 'rid-1' })).toEqual({ mode: 'fenced' });
  });
  it('a missing claim cannot reserve asset ids', () => {
    expect(decideReserve(null, { generation: 1, reportId: 'rid-1' })).toEqual({ mode: 'fenced' });
  });
  it('a claim that already completed replays its result instead of reserving', () => {
    const result = { id: 'rid-1', status: 'Submitted', reference: 'DR-AAAAAA' };
    expect(decideReserve({ state: 'done', result, generation: 1, reportId: 'rid-1' }, { generation: 1, reportId: 'rid-1' })).toEqual({ mode: 'replay', result });
  });
});

describe('attach fence (report commit)', () => {
  const owner = { claimId: 'c1', generation: 1, reportId: 'rid-1' };
  it('an asset reserved by the committing generation attaches to its own report', () => {
    expect(decideAttach(entry(), owner)).toBe('attach');
    expect(decideAttach(entry({ state: 'accepted' }), owner)).toBe('attach');
  });
  it('an asset reserved for one report cannot attach to a different report', () => {
    expect(decideAttach(entry({ reportId: 'rid-other' }), owner)).toBe('refuse');
  });
  it('an asset of a fenced (older) generation cannot attach', () => {
    expect(decideAttach(entry({ generation: 1 }), { ...owner, generation: 2 })).toBe('refuse');
  });
  it('an asset that cleanup abandoned cannot be attached by its original worker', () => {
    expect(decideAttach(entry({ state: 'abandoned' }), owner)).toBe('refuse');
  });
  it('an asset already committed or deleted cannot be attached again', () => {
    expect(decideAttach(entry({ state: 'committed' }), owner)).toBe('refuse');
    expect(decideAttach(entry({ state: 'deleted' }), owner)).toBe('refuse');
  });
  it('a missing ledger row cannot be attached', () => {
    expect(decideAttach(null, owner)).toBe('refuse');
  });
});

describe('abandonment plan (cleanup may lease only when nothing can still commit the asset)', () => {
  it('does not abandon an asset while its upload deadline is still running', () => {
    const plan = planAbandon(entry(), pendingClaim({ leaseUntilMs: 0 }), T0 + UPLOAD_DEADLINE_MS - 1);
    expect(plan).toEqual({ action: 'recheck', nextAttemptAtMs: T0 + UPLOAD_DEADLINE_MS });
  });
  it('does not abandon an asset whose pending claim still holds a live lease', () => {
    const plan = planAbandon(entry(), pendingClaim({ leaseUntilMs: T0 + UPLOAD_DEADLINE_MS + 500 }), T0 + UPLOAD_DEADLINE_MS);
    expect(plan.action).toBe('recheck');
  });
  it('abandons an asset of a pending claim whose lease expired after the deadline', () => {
    expect(planAbandon(entry(), pendingClaim({ leaseUntilMs: 0 }), T0 + UPLOAD_DEADLINE_MS)).toEqual({ action: 'abandon' });
  });
  it('abandons an asset of a generation that a takeover has fenced, once the deadline has passed', () => {
    expect(planAbandon(entry({ generation: 1 }), pendingClaim({ generation: 2, leaseUntilMs: T0 + 9_999_999 }), T0 + UPLOAD_DEADLINE_MS)).toEqual({ action: 'abandon' });
  });
  it('abandons an uncommitted asset of a claim that already completed with a winning report', () => {
    const done = { state: 'done', generation: 2, reportId: 'rid-win', result: { id: 'rid-win' } };
    expect(planAbandon(entry({ generation: 1 }), done, T0 + UPLOAD_DEADLINE_MS)).toEqual({ action: 'abandon' });
  });
  it('abandons an asset whose claim document is missing', () => {
    expect(planAbandon(entry(), null, T0 + UPLOAD_DEADLINE_MS)).toEqual({ action: 'abandon' });
  });
  it('never abandons an asset that a report has committed', () => {
    expect(planAbandon(entry({ state: 'committed' }), pendingClaim(), T0 + 10 * UPLOAD_DEADLINE_MS)).toEqual({ action: 'skip' });
  });
  it('never abandons an asset that is already abandoned or deleted', () => {
    expect(planAbandon(entry({ state: 'abandoned' }), pendingClaim(), T0 + 10 * UPLOAD_DEADLINE_MS)).toEqual({ action: 'skip' });
    expect(planAbandon(entry({ state: 'deleted' }), pendingClaim(), T0 + 10 * UPLOAD_DEADLINE_MS)).toEqual({ action: 'skip' });
  });
});

describe('destroy outcome (uncertain results are not final early)', () => {
  const abandoned = entry({ state: 'abandoned', abandonedAtMs: T0 + UPLOAD_DEADLINE_MS, owner: 'w1', leaseUntilMs: T0 + 99_999, attempts: 0 });
  const at = T0 + UPLOAD_DEADLINE_MS;

  it('a successful destroy records the asset as deleted', () => {
    expect(planDestroyOutcome(abandoned, 'ok', at)).toMatchObject({ state: 'deleted', nextAttemptAtMs: null, deletedAtMs: at });
  });
  it('a not-found destroy is durable reconciliation, never a terminal deletion', () => {
    const patch = planDestroyOutcome(abandoned, 'not_found', at);
    expect(patch.state).toBe('reconciling');
    expect(patch.nextAttemptAtMs).toBe(at + reconcileDelayMs(1));
    expect(patch.reconcileSinceMs).toBe(at);
    expect(patch.owner).toBeNull();
  });
  it('a not-found result after any grace still does not delete the row', () => {
    const later = planDestroyOutcome({ ...abandoned, state: 'reconciling', attempts: 9, reconcileSinceMs: at }, 'not_found', at + RECONCILE_MAX_MS * 3);
    expect(later.state).toBe('reconciling');
    expect(later.nextAttemptAtMs).toBe(at + RECONCILE_MAX_MS * 3 + RECONCILE_MAX_MS);
    expect(later.reconcileSinceMs).toBe(at);
  });
  it('reconciliation backoff starts at the late-upload grace and is capped', () => {
    expect(reconcileDelayMs(1)).toBe(LATE_UPLOAD_GRACE_MS);
    expect(reconcileDelayMs(2)).toBe(LATE_UPLOAD_GRACE_MS * 2);
    expect(reconcileDelayMs(50)).toBe(RECONCILE_MAX_MS);
  });
  it('only a confirmed destroy deletes a row, including one already reconciling', () => {
    const reconciling = { ...abandoned, state: 'reconciling', attempts: 3, reconcileSinceMs: at };
    expect(planDestroyOutcome(reconciling, 'ok', at + 1)).toMatchObject({ state: 'deleted', outcome: 'destroyed' });
  });
  it('a failed destroy stays pending with a retry time and a counted attempt', () => {
    const patch = planDestroyOutcome(abandoned, 'error', at);
    expect(patch.state).toBe('abandoned');
    expect(patch.attempts).toBe(1);
    expect(patch.nextAttemptAtMs).toBe(at + retryDelayMs(1));
    expect(patch.owner).toBeNull();
  });
  it('retry delays grow and stay bounded', () => {
    const delays = [1, 2, 3, 4, 5, 6, 20].map(retryDelayMs);
    expect(delays[1]).toBeGreaterThan(delays[0]);
    expect(Math.max(...delays)).toBeLessThanOrEqual(15 * 60_000);
  });
});
