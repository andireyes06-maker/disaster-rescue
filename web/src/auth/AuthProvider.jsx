import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { onIdTokenChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirebaseAuth } from '../firebase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, role: null, loading: true, error: null });
  const seq = useRef(0);
  const refreshedUid = useRef(null);

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
        const { claims } = await fbUser.getIdTokenResult(force);
        if (stale()) return;
        // Fail closed: the active claim must be exactly true.
        if (claims.active !== true || !claims.role) {
          // Set the error first: signOut fires a null event that bumps seq.
          setState({ user: null, role: null, loading: false, error: 'account_disabled' });
          await signOut(auth).catch(() => {});
          return;
        }
        setState({ user: fbUser, role: claims.role, team: typeof claims.team === 'string' ? claims.team : null, loading: false, error: null });
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

  const login = useCallback(async (email, password) => {
    setState((s) => ({ ...s, error: null }));
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  }, []);

  const logout = useCallback(async () => {
    await signOut(getFirebaseAuth());
  }, []);

  const value = useMemo(() => ({ ...state, login, logout }), [state, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
