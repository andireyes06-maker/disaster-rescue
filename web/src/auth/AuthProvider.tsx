import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from 'react';
import { onIdTokenChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebaseAuth } from '../firebase-auth';
import { getFirebaseDb } from '../firebase';
import type { Role } from '../types/domain';
import { isProvisioning } from './provisioning';
import { decideSync, classifyRefreshError, CLAIM_RETRY_DELAYS_MS, type ProfileDoc, type ProfileState, type SyncHold } from './profileSync';
import { setIdentity } from '../features/responder/draftStore';

// 'session_ended': the profile or token is no longer valid, so the user must sign in again (for example after a role change).
export type AuthError = 'account_disabled' | 'auth_failed' | 'session_ended';

export interface AuthState {
  user: User | null;
  role: Role | null;
  team?: string | null;
  loading: boolean;
  error: AuthError | null;
  // True while the canonical profile and the token claims disagree. Protected views are hidden until they agree.
  syncing: boolean;
  syncNote: SyncHold | null;
  // True when the person can ask for another access check (the automatic retries are used up, or the refresh failed).
  retryAvailable: boolean;
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  retryAccessCheck: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// How long the profile may take before the person is offered Retry access check.
const PROFILE_WAIT_MS = 15000;

const INITIAL: AuthState = { user: null, role: null, loading: true, error: null, syncing: false, syncNote: null, retryAvailable: false };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(INITIAL);
  // The profile is tagged with its uid, so a value from a previous account is never used for the current one.
  const [profile, setProfile] = useState<{ uid: string; value: ProfileState }>({ uid: '', value: 'loading' });
  const [tick, setTick] = useState(0);
  // Bumped by Retry access check to attach a fresh profile listener.
  const [profileAttempt, setProfileAttempt] = useState(0);
  // Shows Retry access check when the profile has not arrived after a while (for example offline with no cached profile).
  const profileWait = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);
  const refreshedUid = useRef<string | null>(null);
  // "uid#profileKey" of the last refresh asked for. Cleared after a network failure so the next change can retry.
  const refreshedFor = useRef<string | null>(null);
  // The role this session started with, for the account it was started by.
  const sessionRole = useRef<{ uid: string; role: string } | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
      const id = ++seq.current;
      const stale = () => id !== seq.current;

      if (!fbUser) {
        refreshedUid.current = null;
        sessionRole.current = null;
        setState((s) => ({ ...s, user: null, role: null, loading: false, syncing: false, syncNote: null, retryAvailable: false, error: s.error }));
        return;
      }
      try {
        // Force a refresh once per sign-in; later events already carry a fresh token.
        const force = refreshedUid.current !== fbUser.uid;
        refreshedUid.current = fbUser.uid;
        const claims: Record<string, unknown> = (await fbUser.getIdTokenResult(force)).claims;
        if (stale()) return;
        // A new resident account has no claims until the API writes its profile. Keep loading instead
        // of signing out; the claims check runs again when the token refreshes after provisioning.
        if ((claims.active !== true || !claims.role) && isProvisioning()) {
          setState((s) => ({ ...s, user: null, role: null, loading: true, error: null, syncing: false, syncNote: null, retryAvailable: false }));
          return;
        }
        // Fail closed: the active claim must be exactly true.
        if (claims.active !== true || !claims.role) {
          // Set the error first: signOut fires a null event that bumps seq.
          setState({ ...INITIAL, loading: false, error: 'account_disabled' });
          await signOut(auth).catch(() => {});
          return;
        }
        // The role claim is set by the API's admin tooling; unknown values fall through to /forbidden.
        setState((s) => ({
          ...s,
          user: fbUser,
          role: claims.role as Role,
          team: typeof claims.team === 'string' ? claims.team : null,
          loading: false,
          error: null,
        }));
        // Every token event is a new claims reading, even when the values did not change, so re-check against the profile.
        setTick((t) => t + 1);
      } catch {
        if (stale()) return;
        setState({ ...INITIAL, loading: false, error: 'auth_failed' });
        await signOut(auth).catch(() => {});
      }
    });
    return () => {
      seq.current += 1;
      unsubscribe();
    };
  }, []);

  const uid = state.user?.uid ?? null;

  // Watch the canonical profile of the signed-in account. Each snapshot is handled by the decision effect below.
  useEffect(() => {
    if (!uid) return;
    let alive = true;
    const unsubscribe = onSnapshot(
      doc(getFirebaseDb(), 'users', uid),
      (snap) => {
        if (!alive) return;
        // An empty answer from the local cache (offline, profile not cached) is not proof the profile is missing.
        if (!snap.exists() && snap.metadata?.fromCache) { setProfile({ uid, value: 'loading' }); return; }
        setProfile({ uid, value: snap.exists() ? (snap.data() as ProfileDoc) : 'missing' });
      },
      (error) => {
        if (!alive) return;
        // The rules refuse the profile once the account is deactivated. Other errors (offline, unavailable) keep the last state.
        if (error.code === 'permission-denied') setProfile({ uid, value: 'denied' });
      },
    );
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [uid, profileAttempt]);

  const endSession = useCallback((reason: AuthError) => {
    // Set the error first: signOut fires a null event that keeps it.
    setState({ ...INITIAL, loading: false, error: reason });
    signOut(getFirebaseAuth()).catch(() => {});
  }, []);

  // retryAvailable: the automatic retries are used up or the refresh failed, so the person can ask again.
  const setSync = useCallback((syncing: boolean, syncNote: SyncHold | null, retryAvailable = false) => {
    setState((s) => (s.syncing === syncing && s.syncNote === syncNote && s.retryAvailable === retryAvailable
      ? s
      : { ...s, syncing, syncNote, retryAvailable }));
  }, []);
  // Only one token refresh is in flight. A decision that needs another refresh while one runs is remembered, not run twice.
  const refreshInFlight = useRef(false);
  const pendingRefresh = useRef(false);

  // Bounded retries for claims that lag behind the profile. Cancelled as soon as the session is decided.
  const claimRetry = useRef<{ key: string; count: number; timer: ReturnType<typeof setTimeout> | null }>({ key: '', count: 0, timer: null });
  const cancelClaimRetry = useCallback(() => {
    if (claimRetry.current.timer) clearTimeout(claimRetry.current.timer);
    claimRetry.current.timer = null;
    if (profileWait.current) clearTimeout(profileWait.current);
    profileWait.current = null;
    profileElapsed.current = false;
  }, []);
  // True once PROFILE_WAIT_MS has passed without a profile.
  const profileElapsed = useRef(false);
  useEffect(() => cancelClaimRetry, [cancelClaimRetry]);

  // Decide what the profile means for the session. Re-runs when the profile, the claims or the network change.
  useEffect(() => {
    if (!uid || !state.user) return;
    const current = profile.uid === uid ? profile.value : 'loading';
    const prefix = `${uid}#`;
    const lastRefresh = refreshedFor.current?.startsWith(prefix) ? refreshedFor.current.slice(prefix.length) : null;
    const sessionRoleNow = sessionRole.current && sessionRole.current.uid === uid ? sessionRole.current.role : null;
    const decision = decideSync(current, { active: true, role: state.role, team: state.team ?? null }, lastRefresh, isProvisioning(), sessionRoleNow);

    if (decision.action === 'in-sync') {
      cancelClaimRetry();
      claimRetry.current.count = 0;
      // The role this session started with. Recorded only once the profile and the claims agree.
      if (!sessionRole.current || sessionRole.current.uid !== uid) sessionRole.current = { uid, role: state.role ?? '' };
      setSync(false, null);
      return;
    }
    if (decision.action === 'hold') {
      if (decision.reason === 'claims-not-updated' && lastRefresh !== null) {
        // The refresh came back without the new claims. Try again a few times, then wait for a person or a new profile version.
        if (claimRetry.current.key !== lastRefresh) claimRetry.current = { key: lastRefresh, count: 0, timer: null };
        const r = claimRetry.current;
        if (!r.timer && r.count < CLAIM_RETRY_DELAYS_MS.length) {
          r.timer = setTimeout(() => {
            r.timer = null;
            refreshedFor.current = null;
            setTick((t) => t + 1);
          }, CLAIM_RETRY_DELAYS_MS[r.count]);
          r.count += 1;
        }
        const exhausted = !r.timer && r.count >= CLAIM_RETRY_DELAYS_MS.length;
        setSync(true, decision.reason, exhausted);
        return;
      }
      if (decision.reason === 'profile-loading') {
        if (!profileWait.current && !profileElapsed.current) {
          profileWait.current = setTimeout(() => {
            profileWait.current = null;
            profileElapsed.current = true;
            setSync(true, 'profile-loading', true);
          }, PROFILE_WAIT_MS);
        }
        setSync(true, 'profile-loading', profileElapsed.current);
        return;
      }
      setSync(true, decision.reason);
      return;
    }
    cancelClaimRetry();
    if (decision.action === 'sign-out') { endSession(decision.reason === 'account_disabled' ? 'account_disabled' : 'session_ended'); return; }

    if (refreshInFlight.current) { pendingRefresh.current = true; return; }
    const auth = getFirebaseAuth();
    if (!auth.currentUser) return;
    const refreshUser = auth.currentUser;
    const refreshSequence = seq.current;
    // One refresh for this profile version. The claims update arrives through onIdTokenChanged above.
    refreshInFlight.current = true;
    refreshedFor.current = `${uid}#${decision.key}`;
    setSync(true, 'claims-not-updated');
    refreshUser.getIdToken(true)
      .catch((err: { code?: string }) => {
        // A refresh belongs to the session that requested it. Its delayed failure must never
        // sign out a newer account or replace that account's access state with an old error.
        if (seq.current !== refreshSequence || auth.currentUser?.uid !== refreshUser.uid) return;
        if (classifyRefreshError(err?.code) === 'session_ended') {
          endSession('session_ended');
          return;
        }
        // Network or server trouble: no loop. Retry on the next profile change, when the connection returns, or on request.
        refreshedFor.current = null;
        setSync(true, 'refresh-failed', true);
      })
      .finally(() => {
        refreshInFlight.current = false;
        if (pendingRefresh.current) {
          pendingRefresh.current = false;
          setTick((t) => t + 1);
        }
      });
  }, [profile, uid, state.user, state.role, state.team, tick, endSession, setSync, cancelClaimRetry]);

  // The person asked for another check (after the automatic retries). One refresh now, with the counters reset.
  const retryAccessCheck = useCallback(() => {
    cancelClaimRetry();
    claimRetry.current = { key: '', count: 0, timer: null };
    refreshedFor.current = null;
    setTick((t) => t + 1);
    setProfileAttempt((n) => n + 1);
  }, [cancelClaimRetry]);

  useEffect(() => {
    // The connection returning is a reason to ask for the claims once more, even after the bounded retries are used up.
    const onOnline = () => {
      refreshedFor.current = null;
      setTick((t) => t + 1);
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, error: null }));
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  }, []);

  const logout = useCallback(async () => {
    await signOut(getFirebaseAuth());
  }, []);

  // Unsent responder drafts are cleared whenever the identity changes, ends, or is being re-checked (syncing).
  const identityKey = state.user && !state.syncing ? `${state.user.uid}|${state.role ?? ''}|${state.team ?? ''}` : null;
  useEffect(() => { setIdentity(identityKey); }, [identityKey]);
  const value = useMemo<AuthContextValue>(() => ({ ...state, login, logout, retryAccessCheck }), [state, login, logout, retryAccessCheck]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

// The signed-in UID, or null outside a provider. Lets a page scope per-account browser state without requiring the provider.
export function useOptionalUid(): string | null {
  return useContext(AuthContext)?.user?.uid ?? null;
}
