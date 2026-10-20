import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';

// Fake Firebase: token listener, a user whose refresh returns the "server" claims, and profile listeners.
interface FakeUser {
  uid: string;
  serverClaims: Record<string, unknown>;
  claims: Record<string, unknown>;
  getIdTokenResult: () => Promise<{ claims: Record<string, unknown> }>;
  getIdToken: ReturnType<typeof vi.fn>;
}
const h = vi.hoisted(() => ({
  tokenCb: null as null | ((u: unknown) => unknown),
  snaps: [] as Array<{ path: string; ok: (s: unknown) => void; err: (e: unknown) => void; unsub: ReturnType<typeof vi.fn> }>,
  user: null as null | FakeUser,
  signOut: vi.fn(async (..._a: unknown[]) => {}),
  refreshError: null as null | { code: string },
  refreshDelay: 0,
  inFlight: 0,
  maxInFlight: 0,
}));
vi.mock('firebase/auth', () => ({
  onIdTokenChanged: (_a: unknown, cb: (u: unknown) => unknown) => { h.tokenCb = cb; return () => {}; },
  signInWithEmailAndPassword: vi.fn(),
  signOut: (...a: unknown[]) => h.signOut(...a),
}));
vi.mock('../firebase-auth', () => ({ getFirebaseAuth: () => ({ currentUser: h.user }) }));
vi.mock('../firebase', () => ({ getFirebaseDb: () => ({}) }));
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, col: string, id: string) => ({ path: `${col}/${id}` }),
  onSnapshot: (ref: { path: string }, ok: (s: unknown) => void, err: (e: unknown) => void) => {
    const unsub = vi.fn();
    h.snaps.push({ path: ref.path, ok, err, unsub });
    return unsub;
  },
}));
// Short retry delays so the bounded retries run inside a test.
vi.mock('./profileSync', async (importOriginal) => ({ ...(await importOriginal<typeof import('./profileSync')>()), CLAIM_RETRY_DELAYS_MS: [20, 30, 40] }));

import { AuthProvider, useAuth } from './AuthProvider';
import { saveDraft, getDraft, resetDraftStoreForTests } from '../features/responder/draftStore';

function Probe() {
  const { user, role, team, syncing, syncNote, error, retryAvailable, retryAccessCheck } = useAuth();
  return (
    <div>
      <span data-testid="state">{user ? `in:${role}:${team ?? ''}` : 'out'}</span>
      <span data-testid="sync">{syncing ? `syncing:${syncNote}` : 'in-sync'}</span>
      <span data-testid="error">{error ?? ''}</span>
      <span data-testid="retry">{retryAvailable ? 'yes' : 'no'}</span>
      <button type="button" onClick={retryAccessCheck}>retry</button>
    </div>
  );
}

// A signed-in user. Its refresh returns the server's claims (serverClaims) and reports them to the token listener.
function makeUser(uid: string, claims: Record<string, unknown>): FakeUser {
  const u: FakeUser = {
    uid, serverClaims: { ...claims }, claims: { ...claims },
    getIdTokenResult: async () => ({ claims: u.claims }),
    getIdToken: vi.fn(async () => {
      h.inFlight += 1;
      h.maxInFlight = Math.max(h.maxInFlight, h.inFlight);
      try {
        if (h.refreshDelay) await new Promise((r) => setTimeout(r, h.refreshDelay));
        if (h.refreshError) throw h.refreshError;
        u.claims = { ...u.serverClaims };
        await act(async () => { await h.tokenCb?.(u); });
        return 'token';
      } finally {
        h.inFlight -= 1;
      }
    }),
  };
  return u;
}

const claims = (team: string | null, over: Record<string, unknown> = {}) => ({ active: true, role: 'responder', ...(team ? { team } : {}), ...over });
const profileDoc = (team: string | null, over: Record<string, unknown> = {}) => ({ active: true, role: 'responder', team, authSyncPending: false, ...over });

const profileListener = (uid: string) => h.snaps.filter((s) => s.path === `users/${uid}`).at(-1)!;
function emitProfile(uid: string, data: Record<string, unknown> | 'missing') {
  act(() => { profileListener(uid).ok({ exists: () => data !== 'missing', data: () => (data === 'missing' ? undefined : data) }); });
}
async function signIn(uid: string, team: string | null, over: Record<string, unknown> = {}) {
  h.user = makeUser(uid, claims(team));
  await act(async () => { await h.tokenCb?.(h.user); });
  emitProfile(uid, profileDoc(team, over));
}
const sync = () => screen.getByTestId('sync').textContent;
const stateText = () => screen.getByTestId('state').textContent;

describe('profile and claims synchronization', () => {
  beforeEach(() => {
    h.snaps.length = 0; h.user = null; h.refreshError = null; h.signOut.mockClear();
    h.refreshDelay = 0; h.inFlight = 0; h.maxInFlight = 0;
    h.tokenCb = null;
    resetDraftStoreForTests();
  });

  it('is in sync when the profile and the claims agree, and makes no refresh', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn('u1', 'alpha');
    expect(sync()).toBe('in-sync');
    expect(stateText()).toBe('in:responder:alpha');
    expect(h.user!.getIdToken).not.toHaveBeenCalled();
  });

  it('a team change hides the session at once, clears drafts, then refreshes the claims once and resumes', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn('u1', 'alpha');
    saveDraft('r1', { note: 'Unsent before the change' });
    h.user!.serverClaims = claims('bravo');
    emitProfile('u1', profileDoc('bravo'));
    // Checked before the refresh completes: the draft is already gone.
    expect(getDraft('r1')).toBeUndefined();
    await waitFor(() => expect(sync()).toBe('in-sync'));
    expect(stateText()).toBe('in:responder:bravo');
    expect(h.user!.getIdToken).toHaveBeenCalledTimes(1);
  });

  it('holds during the authSyncPending window without refreshing, then refreshes once the window closes', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn('u1', 'alpha');
    h.user!.serverClaims = claims('bravo');
    emitProfile('u1', profileDoc('bravo', { authSyncPending: true }));
    expect(sync()).toBe('syncing:auth-sync-pending');
    emitProfile('u1', profileDoc('bravo', { authSyncPending: true }));
    await new Promise((r) => setTimeout(r, 60));
    expect(h.user!.getIdToken).not.toHaveBeenCalled();
    expect(sync()).toBe('syncing:auth-sync-pending');
    emitProfile('u1', profileDoc('bravo'));
    await waitFor(() => expect(sync()).toBe('in-sync'));
    expect(h.user!.getIdToken).toHaveBeenCalledTimes(1);
  });

  it('delayed claims: retries a few times, then stops (no loop), and resumes when the claims arrive', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn('u1', 'alpha');
    // The profile moves, but the claims are still behind (the API has not written them yet).
    emitProfile('u1', profileDoc('bravo'));
    await waitFor(() => expect(h.user!.getIdToken.mock.calls.length).toBeGreaterThanOrEqual(2));
    expect(sync()).toBe('syncing:claims-not-updated');
    // Bounded: 1 refresh for the change plus at most 3 retries.
    await new Promise((r) => setTimeout(r, 250));
    const calls = h.user!.getIdToken.mock.calls.length;
    expect(calls).toBeLessThanOrEqual(4);
    await new Promise((r) => setTimeout(r, 120));
    expect(h.user!.getIdToken.mock.calls.length).toBe(calls);
    // The claims arrive late; the next refresh (or the connection returning) picks them up.
    h.user!.serverClaims = claims('bravo');
    act(() => { window.dispatchEvent(new Event('online')); });
    await waitFor(() => expect(sync()).toBe('in-sync'));
    expect(stateText()).toBe('in:responder:bravo');
  });

  it('a refresh that fails on the network holds the session without signing out, and retries only when the connection returns', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn('u1', 'alpha');
    h.refreshError = { code: 'auth/network-request-failed' };
    h.user!.serverClaims = claims('bravo');
    emitProfile('u1', profileDoc('bravo'));
    await waitFor(() => expect(sync()).toBe('syncing:refresh-failed'));
    expect(h.signOut).not.toHaveBeenCalled();
    expect(stateText()).toBe('in:responder:alpha');
    await new Promise((r) => setTimeout(r, 150));
    expect(h.user!.getIdToken).toHaveBeenCalledTimes(1);
    h.refreshError = null;
    act(() => { window.dispatchEvent(new Event('online')); });
    await waitFor(() => expect(sync()).toBe('in-sync'));
    expect(stateText()).toBe('in:responder:bravo');
  });

  it('a refresh refused for an invalid session ends the session', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn('u1', 'alpha');
    h.refreshError = { code: 'auth/user-token-expired' };
    emitProfile('u1', profileDoc('bravo', { role: 'dispatcher' }));
    await waitFor(() => expect(h.signOut).toHaveBeenCalled());
    expect(screen.getByTestId('error').textContent).toBe('session_ended');
    expect(stateText()).toBe('out');
  });

  it('deactivation signs out with account_disabled', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn('u1', 'alpha');
    emitProfile('u1', profileDoc('alpha', { active: false }));
    await waitFor(() => expect(h.signOut).toHaveBeenCalled());
    expect(screen.getByTestId('error').textContent).toBe('account_disabled');
  });

  it('a refused profile read (rules after deactivation) signs out with account_disabled', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn('u1', 'alpha');
    act(() => { profileListener('u1').err({ code: 'permission-denied' }); });
    await waitFor(() => expect(h.signOut).toHaveBeenCalled());
    expect(screen.getByTestId('error').textContent).toBe('account_disabled');
  });

  it('an empty answer from the local cache is not a missing profile (offline, not cached)', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn('u1', 'alpha');
    act(() => { profileListener('u1').ok({ exists: () => false, data: () => undefined, metadata: { fromCache: true } }); });
    await new Promise((r) => setTimeout(r, 60));
    expect(h.signOut).not.toHaveBeenCalled();
    expect(sync()).toBe('syncing:profile-loading');
    emitProfile('u1', profileDoc('alpha'));
    await waitFor(() => expect(sync()).toBe('in-sync'));
  });

  it('a role change inside a session ends it with session_ended, even when the claims would follow', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn('u1', 'alpha');
    h.user!.serverClaims = claims('alpha', { role: 'dispatcher' });
    emitProfile('u1', profileDoc('alpha', { role: 'dispatcher' }));
    await waitFor(() => expect(h.signOut).toHaveBeenCalled());
    expect(screen.getByTestId('error').textContent).toBe('session_ended');
    expect(stateText()).toBe('out');
  });

  it('a profile that no longer exists ends the session', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn('u1', 'alpha');
    emitProfile('u1', 'missing');
    await waitFor(() => expect(h.signOut).toHaveBeenCalled());
    expect(screen.getByTestId('error').textContent).toBe('session_ended');
  });

  it('a late profile callback from the previous account cannot change the current one', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn('u1', 'alpha');
    const stale = profileListener('u1');
    await act(async () => { await h.tokenCb?.(null); });
    await signIn('u2', 'alpha');
    act(() => { stale.ok({ exists: () => true, data: () => profileDoc('bravo') }); });
    expect(sync()).toBe('in-sync');
    expect(stateText()).toBe('in:responder:alpha');
    expect(h.user!.getIdToken).not.toHaveBeenCalled();
  });

  it('a rejected refresh from a previous account cannot sign out the current account', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn('u1', 'alpha');
    let rejectRefresh!: (error: { code: string }) => void;
    h.user!.getIdToken.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectRefresh = reject; }));
    emitProfile('u1', profileDoc('bravo'));
    await waitFor(() => expect(rejectRefresh).toBeDefined());
    await act(async () => { await h.tokenCb?.(null); });
    await signIn('u2', 'alpha');
    await act(async () => { rejectRefresh({ code: 'auth/user-token-expired' }); });
    expect(h.signOut).not.toHaveBeenCalled();
    expect(stateText()).toBe('in:responder:alpha');
    expect(sync()).toBe('in-sync');
  });

  it('a network failure from a previous account cannot put the current account on hold', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn('u1', 'alpha');
    let rejectRefresh!: (error: { code: string }) => void;
    h.user!.getIdToken.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectRefresh = reject; }));
    emitProfile('u1', profileDoc('bravo'));
    await waitFor(() => expect(rejectRefresh).toBeDefined());
    await act(async () => { await h.tokenCb?.(null); });
    await signIn('u2', 'alpha');
    await act(async () => { rejectRefresh({ code: 'auth/network-request-failed' }); });
    expect(sync()).toBe('in-sync');
    expect(screen.getByTestId('retry').textContent).toBe('no');
    expect(h.signOut).not.toHaveBeenCalled();
  });

  it('after the automatic retries run out, Retry access check refreshes once more and resumes when the claims agree', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn('u1', 'alpha');
    emitProfile('u1', profileDoc('bravo'));
    await waitFor(() => expect(screen.getByTestId('retry').textContent).toBe('yes'));
    const calls = h.user!.getIdToken.mock.calls.length;
    await new Promise((r) => setTimeout(r, 150));
    expect(h.user!.getIdToken.mock.calls.length).toBe(calls);   // no loop once exhausted
    h.user!.serverClaims = claims('bravo');
    fireEvent.click(screen.getByRole('button', { name: 'retry' }));
    await waitFor(() => expect(sync()).toBe('in-sync'));
    expect(stateText()).toBe('in:responder:bravo');
    expect(screen.getByTestId('retry').textContent).toBe('no');
  });

  it('refresh failure on the network also offers Retry access check', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn('u1', 'alpha');
    h.refreshError = { code: 'auth/network-request-failed' };
    emitProfile('u1', profileDoc('bravo'));
    await waitFor(() => expect(screen.getByTestId('retry').textContent).toBe('yes'));
    expect(h.signOut).not.toHaveBeenCalled();
  });

  it('never runs two token refreshes at once, even when the profile changes during one', async () => {
    h.refreshDelay = 60;
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn('u1', 'alpha');
    h.user!.serverClaims = claims('bravo');
    emitProfile('u1', profileDoc('bravo'));
    // A second profile version arrives while the first refresh is still running.
    emitProfile('u1', profileDoc('charlie'));
    h.user!.serverClaims = claims('charlie');
    await waitFor(() => expect(stateText()).toBe('in:responder:charlie'), { timeout: 3000 });
    expect(h.maxInFlight).toBe(1);
  });

  it('a stale refresh from an earlier profile version cannot end a newer hold', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn('u1', 'alpha');
    h.user!.serverClaims = claims('bravo');
    emitProfile('u1', profileDoc('bravo'));
    await waitFor(() => expect(sync()).toBe('in-sync'));
    emitProfile('u1', profileDoc('charlie'));
    await waitFor(() => expect(sync()).toBe('syncing:claims-not-updated'));
    h.user!.serverClaims = claims('charlie');
    act(() => { window.dispatchEvent(new Event('online')); });
    await waitFor(() => expect(stateText()).toBe('in:responder:charlie'));
  });
});
