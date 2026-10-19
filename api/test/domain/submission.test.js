import { describe, it, expect } from 'vitest';
import { decideClaim, decideCommit, decideRelease } from '../../src/domain/submission.js';

const LEASE = 120_000;
const T0 = 1_000_000;
const base = { fingerprint: 'fp-A', now: T0, reportId: 'rid-1', reference: 'DR-AAAAAA', leaseMs: LEASE };
const live = (over = {}) => ({ state: 'pending', fingerprint: 'fp-A', reportId: 'rid-1', reference: 'DR-AAAAAA', generation: 1, leaseUntilMs: T0 + LEASE, ...over });

describe('decideClaim', () => {
  it('a new key runs as generation 1 with the reserved id and reference', () => {
    const d = decideClaim(null, base);
    expect(d.mode).toBe('run');
    expect(d).toMatchObject({ generation: 1, reportId: 'rid-1', reference: 'DR-AAAAAA' });
    expect(d.claim).toMatchObject({ state: 'pending', fingerprint: 'fp-A', generation: 1, leaseUntilMs: T0 + LEASE });
  });

  it('a live lease refuses a second attempt with the same content', () => {
    expect(decideClaim(live(), { ...base, now: T0 + 1000 }).mode).toBe('pending');
  });

  it('an expired lease with the same content takes over: next generation, same reserved id and reference', () => {
    const d = decideClaim(live(), { ...base, now: T0 + LEASE + 1 });
    expect(d.mode).toBe('run');
    expect(d).toMatchObject({ generation: 2, reportId: 'rid-1', reference: 'DR-AAAAAA' });
    expect(d.claim.leaseUntilMs).toBe(T0 + LEASE + 1 + LEASE);
  });

  it('different content is refused for a live claim, and for an expired one (expiry never rebinds a key)', () => {
    expect(decideClaim(live(), { ...base, fingerprint: 'fp-B', now: T0 + 1 }).mode).toBe('conflict');
    expect(decideClaim(live(), { ...base, fingerprint: 'fp-B', now: T0 + LEASE * 5 }).mode).toBe('conflict');
  });

  it('a completed claim replays its result for the same content and conflicts for other content', () => {
    const done = { state: 'done', fingerprint: 'fp-A', result: { id: 'rid-1', reference: 'DR-AAAAAA', status: 'Submitted' } };
    expect(decideClaim(done, { ...base, now: T0 + 5 * LEASE })).toEqual({ mode: 'replay', result: done.result });
    expect(decideClaim(done, { ...base, fingerprint: 'fp-B' }).mode).toBe('conflict');
  });

  it('a legacy pending claim with no reserved id is pending while live and unresolved after, never run again', () => {
    const legacy = { state: 'pending', fingerprint: 'fp-A', startedAtMs: T0 };
    expect(decideClaim(legacy, { ...base, now: T0 + 1000 }).mode).toBe('pending');
    const late = decideClaim(legacy, { ...base, now: T0 + LEASE + 1 });
    expect(late.mode).toBe('unresolved');
    expect(late.claim).toBeUndefined();
  });

  it('a legacy completed claim with the same fingerprint replays', () => {
    const legacyDone = { state: 'done', fingerprint: 'fp-A', result: { id: 'r9', reference: 'DR-OLD000', status: 'Submitted' } };
    expect(decideClaim(legacyDone, base).mode).toBe('replay');
  });

  it('a legacy claim without a fingerprint is refused for any content (as before)', () => {
    expect(decideClaim({ state: 'done', result: { id: 'r9' } }, base).mode).toBe('conflict');
  });
});

describe('decideCommit and decideRelease', () => {
  it('the current generation commits; an older generation is fenced and writes nothing', () => {
    expect(decideCommit(live({ generation: 2 }), 2)).toEqual({ mode: 'commit' });
    expect(decideCommit(live({ generation: 2 }), 1)).toEqual({ mode: 'fenced' });
  });

  it('a claim already completed by someone replays instead of committing again', () => {
    const done = { state: 'done', result: { id: 'rid-1' } };
    expect(decideCommit(done, 1)).toEqual({ mode: 'replay', result: { id: 'rid-1' } });
    expect(decideCommit(done, 2)).toEqual({ mode: 'replay', result: { id: 'rid-1' } });
  });

  it('a missing claim is fenced, never committed', () => {
    expect(decideCommit(null, 1)).toEqual({ mode: 'fenced' });
  });

  it('release expires only the claim held by this generation, so an immediate retry can run', () => {
    const r = decideRelease(live({ generation: 1 }), 1);
    expect(r.write).toMatchObject({ state: 'pending', generation: 1, leaseUntilMs: 0 });
    expect(decideRelease(live({ generation: 2 }), 1).write).toBeNull();
    expect(decideRelease({ state: 'done', result: {} }, 1).write).toBeNull();
  });
});
