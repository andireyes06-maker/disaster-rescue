import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from 'react';
import { onIdTokenChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { getFirebaseAuth } from '../firebase';
import type { Role } from '../types/domain';

export type AuthError = 'account_disabled' | 'auth_failed';

export interface AuthState {
  user: User | null;
  role: Role | null;
  team?: string | null;
  loading: boolean;
  error: AuthError | null;
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, role: null, loading: true, error: null });
  const seq = useRef(0);
  const refreshedUid = useRef<string | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
      const id = ++seq.current;
      const stale = () => id !== seq.current;

      if (!fbUser) {
        refreshedUid.current = null;
        setState((s) => ({ user: null, role: null, loading: false, error: s.error }));
        return;
      }
      try {
        // Force a refresh once per sign-in; later events already carry a fresh token.
        const force = refreshedUid.current !== fbUser.uid;
        refreshedUid.current = fbUser.uid;
        const claims: Record<string, unknown> = (await fbUser.getIdTokenResult(force)).claims;
        if (stale()) return;
        // Fail closed: the active claim must be exactly true.
        if (claims.active !== true || !claims.role) {
          // Set the error first: signOut fires a null event that bumps seq.
          setState({ user: null, role: null, loading: false, error: 'account_disabled' });
          await signOut(auth).catch(() => {});
          return;
        }
        // The role claim is set by the API's admin tooling; unknown values fall through to /forbidden.
        setState({
          user: fbUser,
          role: claims.role as Role,
          team: typeof claims.team === 'string' ? claims.team : null,
          loading: false,
          error: null,
        });
      } catch {
        if (stale()) return;
        setState({ user: null, role: null, loading: false, error: 'auth_failed' });
        await signOut(auth).catch(() => {});
      }
    });
    return () => {
      seq.current += 1;
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, error: null }));
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  }, []);

  const logout = useCallback(async () => {
    await signOut(getFirebaseAuth());
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ ...state, login, logout }), [state, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
