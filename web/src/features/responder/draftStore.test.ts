import { describe, it, expect, beforeEach } from 'vitest';
import { getDraft, saveDraft, clearDraft, clearAllDrafts, setIdentity, hasContent, resetDraftStoreForTests, reserveAttempt, settleAttempt, forgetAttempts, unresolvedAttempts, draftGeneration } from './draftStore';

describe('draft store', () => {
  beforeEach(() => resetDraftStoreForTests());

  it('keeps a draft in memory until it is cleared, and merges later patches', () => {
    saveDraft('r1', { note: 'Crew at the door', status: 'Rescue in Progress' });
    saveDraft('r1', { peopleRescued: '2' });
    expect(getDraft('r1')).toMatchObject({ note: 'Crew at the door', peopleRescued: '2', status: 'Rescue in Progress' });
    clearDraft('r1');
    expect(getDraft('r1')).toBeUndefined();
  });

  it('keeps a draft even when its fields are emptied, so an open form never loses its fields', () => {
    saveDraft('r1', { note: 'x' });
    saveDraft('r1', { note: '', peopleRescued: '0' });
    expect(getDraft('r1')).toBeDefined();
    expect(hasContent(getDraft('r1')!)).toBe(false);
  });

  it('counts an uncertain attempt as content', () => {
    saveDraft('r1', { attempt: { key: 'k-1', fingerprint: 'f', status: 'Resolved' } });
    expect(hasContent(getDraft('r1')!)).toBe(true);
  });

  it('clears every draft when the identity changes, but not when it is first set', () => {
    setIdentity('ana|responder|alpha');
    saveDraft('r1', { note: 'Ana note' });
    setIdentity('ana|responder|alpha');
    expect(getDraft('r1')).toBeDefined();
    setIdentity('ana|responder|bravo');
    expect(getDraft('r1')).toBeUndefined();
  });

  it('clears every draft on sign-out (identity becomes null)', () => {
    setIdentity('ana|responder|alpha');
    saveDraft('r1', { note: 'Ana note' });
    setIdentity(null);
    expect(getDraft('r1')).toBeUndefined();
  });

  it('clearAllDrafts removes every draft', () => {
    saveDraft('r1', { note: 'one' });
    saveDraft('r2', { note: 'two' });
    clearAllDrafts();
    expect(getDraft('r1')).toBeUndefined();
    expect(getDraft('r2')).toBeUndefined();
  });
});


describe('unconfirmed update identities', () => {
  beforeEach(resetDraftStoreForTests);
  it('keeps A across B success, and clears only the confirmed payload', () => {
    const a = reserveAttempt('r', 'A', 'Rescue in Progress')!;
    const b = reserveAttempt('r', 'B', 'Rescue in Progress')!;
    settleAttempt('r', b.key);
    expect(reserveAttempt('r', 'A', 'Rescue in Progress')?.key).toBe(a.key);
    expect(unresolvedAttempts(getDraft('r'))).toHaveLength(1);
  });
  it('blocks a sixth payload without eviction, permits retries at the bound, and requires explicit forgetting', () => {
    const first = reserveAttempt('r', '0', 'Resolved')!;
    for (let i = 1; i < 5; i++) reserveAttempt('r', String(i), 'Resolved');
    expect(reserveAttempt('r', 'sixth', 'Resolved')).toBeNull();
    expect(reserveAttempt('r', '0', 'Resolved')?.key).toBe(first.key);
    expect(unresolvedAttempts(getDraft('r'))).toHaveLength(5);
    forgetAttempts('r');
    expect(unresolvedAttempts(getDraft('r'))).toHaveLength(0);
    expect(reserveAttempt('r', 'sixth', 'Resolved')).not.toBeNull();
  });
  it('invalidates pending actions on access loss even if the report has no draft', () => {
    const before = draftGeneration('r');
    clearDraft('r');
    expect(draftGeneration('r')).not.toBe(before);
  });
  it('invalidates same-account session actions across sign-out and sign-in', () => {
    setIdentity('a|responder|team');
    const before = draftGeneration('r');
    setIdentity(null); setIdentity('a|responder|team');
    expect(draftGeneration('r')).not.toBe(before);
  });
});
