import { describe, it, expect } from 'vitest';
import { decideSync, classifyRefreshError, profileKey } from './profileSync';

const profile = (over: Record<string, unknown> = {}) => ({ active: true, role: 'responder', team: 'demo-team-alpha', authSyncPending: false, ...over });
const claims = (over: Record<string, unknown> = {}) => ({ active: true, role: 'responder', team: 'demo-team-alpha', ...over });

describe('decideSync', () => {
  it('is in sync when the profile and the claims agree', () => {
    expect(decideSync(profile(), claims(), null)).toEqual({ action: 'in-sync' });
  });

  it('holds while the profile is still loading, and never signs out on a loading profile', () => {
    expect(decideSync('loading', claims(), null)).toEqual({ action: 'hold', reason: 'profile-loading' });
  });

  it('signs out when the profile is missing, except during provisioning', () => {
    expect(decideSync('missing', claims(), null)).toEqual({ action: 'sign-out', reason: 'session_ended' });
    expect(decideSync('missing', claims(), null, true)).toEqual({ action: 'hold', reason: 'profile-loading' });
  });

  it('a refused profile read means the account was disabled', () => {
    expect(decideSync('denied', claims(), null)).toEqual({ action: 'sign-out', reason: 'account_disabled' });
  });

  it('signs out for a deactivated profile, whatever the claims say', () => {
    expect(decideSync(profile({ active: false }), claims(), null)).toEqual({ action: 'sign-out', reason: 'account_disabled' });
    expect(decideSync(profile({ active: false }), claims({ active: false }), null)).toEqual({ action: 'sign-out', reason: 'account_disabled' });
  });

  it('holds during the authSyncPending window and does not ask for a refresh', () => {
    expect(decideSync(profile({ team: 'demo-team-bravo', authSyncPending: true }), claims(), null))
      .toEqual({ action: 'hold', reason: 'auth-sync-pending' });
  });

  it('asks for one refresh when a changed profile is not yet in the claims', () => {
    const d = decideSync(profile({ team: 'demo-team-bravo' }), claims(), null);
    expect(d).toEqual({ action: 'refresh', key: 'responder|demo-team-bravo' });
  });

  it('does not ask again for the same profile version (no refresh loop)', () => {
    const p = profile({ team: 'demo-team-bravo' });
    const first = decideSync(p, claims(), null);
    expect(first.action).toBe('refresh');
    const key = first.action === 'refresh' ? first.key : '';
    expect(decideSync(p, claims(), key)).toEqual({ action: 'hold', reason: 'claims-not-updated' });
  });

  it('asks again when the profile moves to a new version', () => {
    const key = profileKey(profile({ team: 'demo-team-bravo' }));
    expect(decideSync(profile({ team: 'demo-team-charlie' }), claims(), key))
      .toEqual({ action: 'refresh', key: 'responder|demo-team-charlie' });
  });

  it('a role change inside a session ends the session, even while the claims are being written', () => {
    expect(decideSync(profile({ role: 'dispatcher', authSyncPending: true }), claims(), null, false, 'responder'))
      .toEqual({ action: 'sign-out', reason: 'session_ended' });
    expect(decideSync(profile({ role: 'dispatcher' }), claims(), null, false, 'responder'))
      .toEqual({ action: 'sign-out', reason: 'session_ended' });
  });

  it('a role change with no session role recorded yet is treated as a claims change', () => {
    expect(decideSync(profile({ role: 'dispatcher' }), claims(), null)).toEqual({ action: 'refresh', key: 'dispatcher|demo-team-alpha' });
  });

  it('a team change keeps the session (the session role is unchanged)', () => {
    expect(decideSync(profile({ team: 'demo-team-bravo' }), claims(), null, false, 'responder'))
      .toEqual({ action: 'refresh', key: 'responder|demo-team-bravo' });
  });

  it('treats a missing team and an empty team the same', () => {
    expect(decideSync(profile({ team: null }), claims({ team: undefined }), null)).toEqual({ action: 'in-sync' });
    expect(decideSync(profile({ team: '' }), claims({ team: '' }), null)).toEqual({ action: 'in-sync' });
  });

  it('claims that are not active are never in sync', () => {
    expect(decideSync(profile(), claims({ active: false }), null)).toEqual({ action: 'refresh', key: 'responder|demo-team-alpha' });
  });
});

describe('classifyRefreshError', () => {
  it('ends the session for revoked, disabled or invalid tokens', () => {
    for (const code of ['auth/user-disabled', 'auth/user-token-expired', 'auth/id-token-revoked', 'auth/invalid-user-token', 'auth/user-not-found']) {
      expect(classifyRefreshError(code)).toBe('session_ended');
    }
  });

  it('retries network and server failures without ending the session', () => {
    expect(classifyRefreshError('auth/network-request-failed')).toBe('retry');
    expect(classifyRefreshError('auth/internal-error')).toBe('retry');
    expect(classifyRefreshError(undefined)).toBe('retry');
  });
});
