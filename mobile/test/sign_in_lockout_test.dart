import 'dart:convert';

import 'package:disaster_rescue/auth/auth_backend.dart';
import 'package:disaster_rescue/auth/auth_repository.dart';
import 'package:disaster_rescue/auth/sign_in_lockout.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'fake_backend.dart';

/// A stand-in for the API's lockout: five failures per email lock it for five minutes.
class _LockoutServer {
  final failures = <String, int>{};
  final locked = <String, int>{};
  final successes = <String>[];

  MockClient get client => MockClient((r) async {
        final action = r.url.pathSegments.last;
        if (action == 'success') {
          successes.add(r.headers['Authorization'] ?? '');
          return http.Response('{"ok":true}', 200);
        }
        final email = (jsonDecode(r.body) as Map)['email'] as String;
        if (action == 'failure') {
          failures[email] = (failures[email] ?? 0) + 1;
          if (failures[email]! >= 5) {
            locked[email] = 300;
            failures[email] = 0;
          }
        }
        final wait = locked[email] ?? 0;
        return http.Response(jsonEncode({'locked': wait > 0, 'retryAfterSeconds': wait}), 200);
      });
}

/// Fails every sign-in with the given failure, and records how many times it was tried.
class _RejectingBackend extends FakeBackend {
  _RejectingBackend(this.failure);
  final AuthFailure failure;
  int attempts = 0;

  @override
  Future<BackendUser> signIn(String email, String password) async {
    attempts++;
    throw AuthException(failure);
  }
}

/// Runs the sign-in and returns the error it throws, failing the test if it succeeds.
Future<AuthException> refusal(Future<void> signIn) async {
  try {
    await signIn;
  } on AuthException catch (e) {
    return e;
  }
  throw TestFailure('sign-in was expected to fail');
}

void main() {
  test('five wrong passwords lock the email, and the sixth attempt never reaches Firebase', () async {
    final server = _LockoutServer();
    final backend = _RejectingBackend(AuthFailure.invalidCredentials);
    final repo = FirebaseAuthRepository(backend, () => throw StateError('no API'), retryDelays: const [], lockout: SignInLockout(baseUrl: 'https://api.test/api', client: server.client));

    for (var i = 0; i < 4; i++) {
      expect((await refusal(repo.login('ana@example.com', 'wrong'))).failure, AuthFailure.invalidCredentials);
    }
    // The fifth wrong password is the one that locks the email.
    final locking = await refusal(repo.login('ana@example.com', 'wrong'));
    expect(locking.failure, AuthFailure.lockedOut);
    expect(locking.message, contains('Try again in 5 minutes'));
    // While locked, the next attempt is refused before Firebase is called.
    final refused = await refusal(repo.login('ana@example.com', 'wrong'));
    expect(refused.failure, AuthFailure.lockedOut);
    expect(backend.attempts, 5);
  });

  test('a network failure does not count toward the lock', () async {
    final server = _LockoutServer();
    final backend = _RejectingBackend(AuthFailure.network);
    final repo = FirebaseAuthRepository(backend, () => throw StateError('no API'), retryDelays: const [], lockout: SignInLockout(baseUrl: 'https://api.test/api', client: server.client));

    for (var i = 0; i < 6; i++) {
      expect((await refusal(repo.login('ana@example.com', 'pw'))).failure, AuthFailure.network);
    }
    expect(server.failures['ana@example.com'] ?? 0, 0);
  });

  test('a successful sign-in clears the count with the new session token', () async {
    final server = _LockoutServer();
    final backend = FakeBackend()..nextSignIn = FakeUser('uid-1', (_) async => {'role': 'admin', 'active': true});
    final repo = FirebaseAuthRepository(backend, () => throw StateError('no API'), retryDelays: const [], lockout: SignInLockout(baseUrl: 'https://api.test/api', client: server.client));

    await repo.login('ana@example.com', 'right');
    expect(server.successes, hasLength(1));
    expect(server.successes.single, startsWith('Bearer '));
  });

  test('if the lockout server cannot be reached, sign-in is not blocked', () async {
    final unreachable = SignInLockout(baseUrl: 'https://api.test/api', client: MockClient((_) async => throw http.ClientException('offline')));
    final backend = FakeBackend()..nextSignIn = FakeUser('uid-2', (_) async => {'role': 'admin', 'active': true});
    final repo = FirebaseAuthRepository(backend, () => throw StateError('no API'), retryDelays: const [], lockout: unreachable);

    await repo.login('ana@example.com', 'right');
    expect(backend.current?.uid, 'uid-2');
  });
}
