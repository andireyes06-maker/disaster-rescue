import 'package:disaster_rescue/auth/profile_sync.dart';
import 'package:flutter_test/flutter_test.dart';

const resident = ClaimsView(active: true, role: 'resident');
const profileResident = ProfileValue(active: true, role: 'resident');

void main() {
  test('a loading profile holds the session', () {
    final d = decideProfileSync(profile: const ProfileLoading(), claims: resident, refreshedFor: null);
    expect(d, isA<SyncHoldFor>());
    expect((d as SyncHoldFor).reason, SyncHold.profileLoading);
  });

  test('matching profile and claims are in sync', () {
    final d = decideProfileSync(profile: profileResident, claims: resident, refreshedFor: null);
    expect(d, isA<SyncInSync>());
  });

  test('a team change in the profile asks for one refresh', () {
    final d = decideProfileSync(
      profile: const ProfileValue(active: true, role: 'responder', team: 'Harbor'),
      claims: const ClaimsView(active: true, role: 'responder'),
      refreshedFor: null,
    );
    expect(d, isA<SyncRefresh>());
  });

  test('after one refresh that did not help, the hold waits for a new profile version', () {
    final p = const ProfileValue(active: true, role: 'responder', team: 'Harbor');
    final key = profileKey(p);
    final d = decideProfileSync(
      profile: p,
      claims: const ClaimsView(active: true, role: 'responder'),
      refreshedFor: key,
    );
    expect(d, isA<SyncHoldFor>());
    expect((d as SyncHoldFor).reason, SyncHold.claimsNotUpdated);
  });

  test('a deactivated profile signs out as an account change', () {
    final d = decideProfileSync(
      profile: const ProfileValue(active: false, role: 'resident'),
      claims: resident,
      refreshedFor: null,
    );
    expect((d as SyncSignOut).reason, SyncEnd.accountDisabled);
  });

  test('a refused profile read is not reported as a deactivated account', () {
    final d = decideProfileSync(profile: const ProfileDenied(), claims: resident, refreshedFor: null);
    expect((d as SyncSignOut).reason, SyncEnd.profileUnreadable);
  });

  test('a missing profile ends the session, except while a new account is being set up', () {
    final ended = decideProfileSync(profile: const ProfileMissing(), claims: resident, refreshedFor: null);
    expect((ended as SyncSignOut).reason, SyncEnd.sessionEnded);
    final provisioning = decideProfileSync(
      profile: const ProfileMissing(),
      claims: resident,
      refreshedFor: null,
      provisioning: true,
    );
    expect((provisioning as SyncHoldFor).reason, SyncHold.profileLoading);
  });

  test('a role change under a running session ends it instead of refreshing', () {
    final d = decideProfileSync(
      profile: const ProfileValue(active: true, role: 'responder'),
      claims: const ClaimsView(active: true, role: 'resident'),
      refreshedFor: null,
      sessionRole: 'resident',
    );
    expect((d as SyncSignOut).reason, SyncEnd.sessionEnded);
  });

  test('a pending API claim write holds without refreshing', () {
    final d = decideProfileSync(
      profile: const ProfileValue(active: true, role: 'responder', authSyncPending: true),
      claims: const ClaimsView(active: true, role: 'resident'),
      refreshedFor: null,
    );
    expect((d as SyncHoldFor).reason, SyncHold.authSyncPending);
  });

  test('only the listed auth codes end the session on refresh failure', () {
    expect(isSessionEndingRefreshError('user-disabled'), isTrue);
    expect(isSessionEndingRefreshError('network-request-failed'), isFalse);
    expect(isSessionEndingRefreshError(null), isFalse);
  });
}
