import { describe, it, expect, beforeEach } from 'vitest';
import { getDraft, saveDraft, clearDraft, clearAllDrafts, setIdentity, hasContent, resetDraftStoreForTests } from './draftStore';

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
