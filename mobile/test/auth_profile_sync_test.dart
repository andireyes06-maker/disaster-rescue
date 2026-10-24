import 'dart:async';

import 'package:disaster_rescue/auth/auth_repository.dart';
import 'package:disaster_rescue/auth/profile_source.dart';
import 'package:disaster_rescue/auth/profile_sync.dart';
import 'package:disaster_rescue/data/api_client.dart';
import 'package:disaster_rescue/features/auth/auth_widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/testing.dart';

import 'fake_backend.dart';

/// Test profile source. Each uid has a broadcast stream the test pushes profile states into.
class FakeProfiles implements ProfileSource {
  final _controllers = <String, StreamController<ProfileState>>{};

  @override
  Stream<ProfileState> watch(String uid) =>
      (_controllers[uid] ??= StreamController<ProfileState>.broadcast()).stream;

  void send(String uid, ProfileState state) => _controllers[uid]!.add(state);
}

class FakeAuthError implements Exception {
  FakeAuthError(this.code);
  final String code;
}

Future<void> settle() async {
  for (var i = 0; i < 5; i++) {
    await Future<void>.delayed(Duration.zero);
  }
}

Map<String, dynamic> claimsOf(String role, {bool active = true}) => {'role': role, 'active': active};

List<AuthUser?> events = [];

AuthUser? get last => events.isEmpty ? null : events.last;

void main() {
  late FakeBackend backend;
  late FakeProfiles profiles;
  late FirebaseAuthRepository repo;

  setUp(() {
    backend = FakeBackend();
    profiles = FakeProfiles();
    final api = ApiClient(
      baseUrl: 'http://h/api',
      tokenProvider: () async => 'tok',
      client: MockClient((r) async => throw StateError('no API call expected')),
    );
    // No automatic claim retries, so each test controls when a check happens.
    repo = FirebaseAuthRepository(backend, () => api, profiles: profiles, retryDelays: const []);
    events = [];
    repo.authChanges.listen(events.add);

  });

  tearDown(() async {
    await repo.dispose();
  });

  test('a matching profile publishes the user as in sync', () async {
    backend.emit(FakeUser('u1', (_) async => claimsOf('resident')));
    await settle();
    profiles.send('u1', const ProfileValue(active: true, role: 'resident'));
    await settle();
    expect(last?.uid, 'u1');
    expect(last?.syncing, isFalse);
    expect(last?.endReason, isNull);
  });

  test('a profile without the claims refreshes once and then agrees', () async {
    var claims = claimsOf('resident');
    final user = FakeUser('u1', (_) async => claims);
    backend.emit(user);
    await settle();
    expect(last?.syncing, isTrue, reason: 'the profile has not answered yet');

    claims = claimsOf('responder');
    profiles.send('u1', const ProfileValue(active: true, role: 'responder'));
    await settle();

    expect(last?.syncing, isFalse);
    expect(last?.role, 'responder');
    // One sign-in check and one refresh. No loop.
    expect(user.claimCalls.length, 2);
  });

  test('a refused profile read signs the person out with the unreadable reason, not account-disabled', () async {
    backend.emit(FakeUser('u1', (_) async => claimsOf('resident')));
    await settle();
    profiles.send('u1', const ProfileDenied());
    await settle();
    expect(last?.endReason, AuthFailure.profileUnreadable);
  });

  test('a refused profile read shows its own message, never the account-disabled one', () {
    final unreadable = failureMessage(AuthFailure.profileUnreadable, null);
    expect(unreadable, contains('cannot read your account'));
    expect(unreadable, isNot(failureMessage(AuthFailure.accountDisabled, null)));
  });

  test('a role change under a running session ends it with the session-ended reason', () async {
    backend.emit(FakeUser('u1', (_) async => claimsOf('resident')));
    await settle();
    profiles.send('u1', const ProfileValue(active: true, role: 'resident'));
    await settle();
    expect(last?.syncing, isFalse);

    profiles.send('u1', const ProfileValue(active: true, role: 'responder'));
    await settle();
    expect(last?.endReason, AuthFailure.sessionEnded);
  });

  test('a profile that never answers holds the session and says why', () async {
    backend.emit(FakeUser('u1', (_) async => claimsOf('resident')));
    await settle();
    expect(last?.syncing, isTrue);
    expect(last?.syncNote, SyncHold.profileLoading);
    expect(last?.retryAvailable, isFalse, reason: 'the wait has not elapsed yet');
  });

  test('a session-ending refresh error signs the person out', () async {
    var refreshing = false;
    backend.emit(FakeUser('u1', (refresh) async {
      if (refresh && refreshing) throw FakeAuthError('user-disabled');
      return claimsOf('resident');
    }));
    await settle();
    refreshing = true;
    profiles.send('u1', const ProfileValue(active: true, role: 'responder'));
    await settle();
    expect(last?.endReason, AuthFailure.sessionEnded);
  });

  // A refresh started in one sign-in must not affect a later sign-in, even of the same account.
  // The first refresh is held open with a gate; the gate completes after the new session is established.
  Future<void> startStaleRefresh(String uid, Completer<Map<String, dynamic>> gate) async {
    var n = 0;
    backend.emit(FakeUser(uid, (refresh) {
      n++;
      return n == 1 ? Future.value(claimsOf('resident')) : gate.future;
    }));
    await settle();
    profiles.send(uid, const ProfileValue(active: true, role: 'responder'));
    await settle();
  }

  test('an old refresh that fails after a same-account sign-in does not end the new session', () async {
    final gate = Completer<Map<String, dynamic>>();
    await startStaleRefresh('u1', gate);
    expect(last?.syncing, isTrue);

    backend.signOut();
    await settle();
    backend.emit(FakeUser('u1', (_) async => claimsOf('responder')));
    await settle();
    profiles.send('u1', const ProfileValue(active: true, role: 'responder'));
    await settle();
    expect(last?.syncing, isFalse);
    expect(last?.role, 'responder');

    gate.completeError(FakeAuthError('user-token-expired'));
    await settle();
    expect(last?.endReason, isNull, reason: 'the old refresh must not end the new session');
    expect(last?.syncing, isFalse);
    expect(last?.role, 'responder');
  });

  test('an old refresh that succeeds after a same-account sign-in does not change the new session', () async {
    final gate = Completer<Map<String, dynamic>>();
    await startStaleRefresh('u1', gate);

    backend.signOut();
    await settle();
    backend.emit(FakeUser('u1', (_) async => claimsOf('resident')));
    await settle();
    profiles.send('u1', const ProfileValue(active: true, role: 'resident'));
    await settle();
    expect(last?.role, 'resident');

    gate.complete(claimsOf('responder'));
    await settle();
    expect(last?.role, 'resident', reason: 'the old claims must not reach the new session');
    expect(last?.syncing, isFalse);
  });

  test('a refresh that fails while another account is current does not end that account', () async {
    final gate = Completer<Map<String, dynamic>>();
    await startStaleRefresh('u1', gate);

    backend.emit(FakeUser('u2', (_) async => claimsOf('resident')));
    await settle();
    profiles.send('u2', const ProfileValue(active: true, role: 'resident'));
    await settle();
    expect(last?.uid, 'u2');

    gate.completeError(FakeAuthError('user-token-expired'));
    await settle();
    expect(last?.uid, 'u2');
    expect(last?.endReason, isNull);
  });
}
