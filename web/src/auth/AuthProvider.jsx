import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirebaseAuth } from '../firebase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, role: null, loading: true, error: null });

  useEffect(() => {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setState((s) => ({ user: null, role: null, loading: false, error: s.error }));
        return;
      }
      try {
        const { claims } = await fbUser.getIdTokenResult();
        // Fail closed: the active claim must be exactly true.
        if (claims.active !== true || !claims.role) {
          await signOut(auth).catch(() => {});
          setState({ user: null, role: null, loading: false, error: 'account_disabled' });
          return;
        }
        setState({ user: fbUser, role: claims.role, loading: false, error: null });
      } catch {
        setState({ user: null, role: null, loading: false, error: 'auth_failed' });
      }
    });
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
