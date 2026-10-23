// Decides how the signed-in session reacts to the canonical profile (users/{uid}) and the token claims.
// Pure: no Firebase calls here, so every case is unit-tested. AuthProvider performs the action it returns.

export interface ProfileDoc {
  active?: unknown;
  role?: unknown;
  team?: unknown;
  authSyncPending?: unknown;
}

export interface ClaimsSnapshot {
  active?: unknown;
  role?: unknown;
  team?: unknown;
}

// 'denied' means the profile listener was refused. The rules refuse it once the account is deactivated.
export type ProfileState = ProfileDoc | 'loading' | 'missing' | 'denied';

export type SyncHold = 'profile-loading' | 'auth-sync-pending' | 'claims-not-updated' | 'refresh-failed';

export type SyncDecision =
  | { action: 'in-sync' }
  | { action: 'hold'; reason: SyncHold }
  | { action: 'refresh'; key: string }
  | { action: 'sign-out'; reason: 'account_disabled' | 'session_ended' };

const teamOf = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

// When the claims lag behind the profile (the API writes them just after the profile), the app refreshes again after
// these delays. Three attempts at most; after that it waits for a new profile version, the connection returning, or sign-in.
export const CLAIM_RETRY_DELAYS_MS = [2000, 5000, 15000];

// The part of the profile the claims must match. A new key means the profile changed and one refresh is due.
export function profileKey(p: ProfileDoc): string {
  return `${String(p.role ?? '')}|${teamOf(p.team) ?? ''}`;
}

// sessionRole is the role this session started with. A different role is never an ordinary change: the session ends.
export function decideSync(
  profile: ProfileState,
  claims: ClaimsSnapshot,
  refreshedFor: string | null,
  provisioning = false,
  sessionRole: string | null = null,
): SyncDecision {
  if (profile === 'loading') return { action: 'hold', reason: 'profile-loading' };
  if (profile === 'denied') return { action: 'sign-out', reason: 'account_disabled' };
  // A missing profile for a signed-in account is a broken or ended session, except while a new account is still being set up.
  if (profile === 'missing') return provisioning ? { action: 'hold', reason: 'profile-loading' } : { action: 'sign-out', reason: 'session_ended' };
  if (profile.active !== true) return { action: 'sign-out', reason: 'account_disabled' };
  if (sessionRole !== null && profile.role !== sessionRole) return { action: 'sign-out', reason: 'session_ended' };
  // The API marks the window while it writes the claims. The profile is the canonical copy, so wait and do not refresh.
  if (profile.authSyncPending === true) return { action: 'hold', reason: 'auth-sync-pending' };
  const inSync = claims.active === true
    && typeof claims.role === 'string'
    && claims.role === profile.role
    && teamOf(claims.team) === teamOf(profile.team);
  if (inSync) return { action: 'in-sync' };
  const key = profileKey(profile);
  // One refresh per profile version. If the claims still disagree after it, wait for a new profile version instead of looping.
  if (refreshedFor === key) return { action: 'hold', reason: 'claims-not-updated' };
  return { action: 'refresh', key };
}

// A refresh failure either ends the session (the account or token is no longer valid) or is retried later (network, server).
export function classifyRefreshError(code: string | undefined): 'session_ended' | 'retry' {
  const ended = [
    'auth/user-disabled',
    'auth/user-token-expired',
    'auth/user-not-found',
    'auth/invalid-user-token',
    'auth/id-token-revoked',
    'auth/invalid-refresh-token',
    'auth/requires-recent-login',
  ];
  return ended.includes(code ?? '') ? 'session_ended' : 'retry';
}
