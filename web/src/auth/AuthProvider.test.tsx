import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';

type TokenListener = (user: unknown) => unknown;
let authCallback: TokenListener = () => undefined;
const signIn = vi.fn((..._args: unknown[]) => undefined);
const signOutFn = vi.fn(async (..._args: unknown[]) => {});
vi.mock('firebase/auth', () => ({
  onIdTokenChanged: (_auth: unknown, cb: TokenListener) => {
    authCallback = cb;
    return () => {};
  },
  signInWithEmailAndPassword: (...a: unknown[]) => signIn(...a),
  signOut: (...a: unknown[]) => signOutFn(...a),
}));
vi.mock('../firebase', () => ({ getFirebaseAuth: () => ({}) }));
import { AuthProvider, useAuth } from './AuthProvider';

function Probe() {
  const { user, role, loading, error } = useAuth();
  return (
    <div>
      <span data-testid="s">{loading ? 'loading' : user ? `in:${role}` : 'out'}</span>
      <span data-testid="e">{error || ''}</span>
    </div>
  );
}

const fbUser = (claims: Record<string, unknown>) => ({
  uid: 'u1',
  email: 'a@b.c',
  getIdTokenResult: async () => ({ claims }),
});

describe('AuthProvider', () => {
  beforeEach(() => signOutFn.mockClear());
  const flush = () => new Promise((r) => setTimeout(r, 0));

  it('reads role from claims', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(async () => authCallback(fbUser({ role: 'dispatcher', active: true })));
    await waitFor(() => expect(screen.getByTestId('s')).toHaveTextContent('in:dispatcher'));
  });

  it('missing active claim means signed out with account_disabled', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(async () => authCallback(fbUser({ role: 'dispatcher' })));
    await waitFor(() => expect(screen.getByTestId('s')).toHaveTextContent('out'));
    expect(screen.getByTestId('e')).toHaveTextContent('account_disabled');
    expect(signOutFn).toHaveBeenCalled();
  });

  it('signed out when no user', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(async () => authCallback(null));
    await waitFor(() => expect(screen.getByTestId('s')).toHaveTextContent('out'));
  });

  it('revalidates on token change: dropped active signs out', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(async () => authCallback(fbUser({ role: 'dispatcher', active: true })));
    await waitFor(() => expect(screen.getByTestId('s')).toHaveTextContent('in:dispatcher'));
    await act(async () => authCallback(fbUser({ role: 'dispatcher', active: false })));
    await waitFor(() => expect(screen.getByTestId('s')).toHaveTextContent('out'));
    expect(screen.getByTestId('e')).toHaveTextContent('account_disabled');
  });

  it('forces a token refresh when reading claims', async () => {
    const spy = vi.fn(async (_force?: boolean) => ({ claims: { role: 'dmo', active: true } }));
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(async () => authCallback({ uid: 'u', getIdTokenResult: spy }));
    expect(spy).toHaveBeenCalledWith(true);
  });

  it('signs out and sets auth_failed when claims lookup throws', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(async () =>
      authCallback({ uid: 'u', getIdTokenResult: async () => { throw new Error('x'); } }));
    await waitFor(() => expect(screen.getByTestId('s')).toHaveTextContent('out'));
    expect(screen.getByTestId('e')).toHaveTextContent('auth_failed');
    expect(signOutFn).toHaveBeenCalled();
  });

  it('an older async callback never overwrites newer state', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    let releaseFirst: () => void = () => undefined;
    const slow = {
      uid: 'a',
      getIdTokenResult: () => new Promise<{ claims: Record<string, unknown> }>((r) => {
        releaseFirst = () => r({ claims: { role: 'dmo', active: true } });
      }),
    };
    let p1: unknown;
    await act(async () => { p1 = authCallback(slow); });
    await act(async () => authCallback(fbUser({ role: 'responder', active: true })));
    await waitFor(() => expect(screen.getByTestId('s')).toHaveTextContent('in:responder'));
    await act(async () => { releaseFirst(); await flush(); });
    expect(screen.getByTestId('s')).toHaveTextContent('in:responder');
  });

  it('keeps account_disabled when signOut fires the null token event', async () => {
    signOutFn.mockImplementationOnce(async () => { await authCallback(null); });
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(async () => authCallback(fbUser({ role: 'dispatcher', active: false })));
    await waitFor(() => expect(screen.getByTestId('s')).toHaveTextContent('out'));
    expect(screen.getByTestId('e')).toHaveTextContent('account_disabled');
  });

  it('keeps auth_failed when signOut fires the null token event', async () => {
    signOutFn.mockImplementationOnce(async () => { await authCallback(null); });
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(async () =>
      authCallback({ uid: 'u', getIdTokenResult: async () => { throw new Error('x'); } }));
    await waitFor(() => expect(screen.getByTestId('s')).toHaveTextContent('out'));
    expect(screen.getByTestId('e')).toHaveTextContent('auth_failed');
  });

  it('a later successful sign in clears the error', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(async () => authCallback(fbUser({ role: 'dmo', active: false })));
    await waitFor(() => expect(screen.getByTestId('e')).toHaveTextContent('account_disabled'));
    await act(async () => authCallback(fbUser({ role: 'dmo', active: true })));
    await waitFor(() => expect(screen.getByTestId('s')).toHaveTextContent('in:dmo'));
    expect(screen.getByTestId('e')).toBeEmptyDOMElement();
  });
});
