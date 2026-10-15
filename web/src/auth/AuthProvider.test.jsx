import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';

let authCallback;
const signIn = vi.fn();
const signOutFn = vi.fn(async () => {});
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth, cb) => {
    authCallback = cb;
    return () => {};
  },
  signInWithEmailAndPassword: (...a) => signIn(...a),
  signOut: (...a) => signOutFn(...a),
}));
vi.mock('../firebase.js', () => ({ getFirebaseAuth: () => ({}) }));
import { AuthProvider, useAuth } from './AuthProvider.jsx';

function Probe() {
  const { user, role, loading, error } = useAuth();
  return (
    <div>
      <span data-testid="s">{loading ? 'loading' : user ? `in:${role}` : 'out'}</span>
      <span data-testid="e">{error || ''}</span>
    </div>
  );
}

const fbUser = (claims) => ({
  uid: 'u1',
  email: 'a@b.c',
  getIdTokenResult: async () => ({ claims }),
});

describe('AuthProvider', () => {
  beforeEach(() => signOutFn.mockClear());

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
});
