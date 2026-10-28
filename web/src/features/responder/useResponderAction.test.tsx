import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ auth: { currentUser: null as null | { getIdToken: () => Promise<string> } } }));
vi.mock('../../firebase-auth', () => ({ getFirebaseAuth: () => state.auth }));
import { useResponderAction } from './useResponderAction';
import { clearDraft, resetDraftStoreForTests, setIdentity } from './draftStore';

describe('responder action lifetime', () => {
  beforeEach(() => { resetDraftStoreForTests(); state.auth.currentUser = { getIdToken: async () => 'synthetic' }; });
  it('does not return a token when the account changes during token retrieval', async () => {
    let finish!: (token: string) => void;
    state.auth.currentUser = { getIdToken: () => new Promise(resolve => { finish = resolve; }) };
    const { result } = renderHook(() => useResponderAction('r'));
    const action = result.current();
    const rejected = expect(action.getToken()).rejects.toThrow('Responder action ended');
    state.auth.currentUser = { getIdToken: async () => 'different-session' };
    finish('old-session');
    await rejected;
    expect(action.isCurrent()).toBe(false);
  });
  it('rejects old callbacks after unmount and after a same-account new session', async () => {
    setIdentity('a|responder|team');
    const { result, unmount } = renderHook(() => useResponderAction('r'));
    const action = result.current();
    act(() => { setIdentity(null); setIdentity('a|responder|team'); });
    expect(action.isCurrent()).toBe(false);
    const next = result.current();
    unmount();
    expect(next.isCurrent()).toBe(false);
    await expect(next.getToken()).rejects.toThrow();
  });
  it('invalidates actions when report access or the view scope changes', () => {
    const { result, rerender } = renderHook(({ scope }) => useResponderAction('r', scope), { initialProps: { scope: 'team-a' } });
    const action = result.current();
    act(() => clearDraft('r'));
    expect(action.isCurrent()).toBe(false);
    const next = result.current();
    rerender({ scope: 'team-b' });
    expect(next.isCurrent()).toBe(false);
  });
});
