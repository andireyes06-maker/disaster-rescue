import 'dart:async';

import 'package:disaster_rescue/auth/auth_controller.dart';
import 'package:disaster_rescue/auth/auth_repository.dart';
import 'package:flutter_test/flutter_test.dart';

import 'fakes.dart';

const disabled = AuthUser(uid: 'u2', email: 'x@y.z', role: 'resident', team: null, active: false);

Future<void> pump() => Future<void>.delayed(Duration.zero);

void main() {
  late FakeAuthRepository repo;
  late AuthController c;
  setUp(() {
    repo = FakeAuthRepository();
    c = AuthController(repo);
  });
  tearDown(() => c.dispose());

  test('starts loading, then signed out on first null event', () async {
    expect(c.loading, isTrue);
    repo.events.add(null);
    await pump();
    expect(c.loading, isFalse);
    expect(c.user, isNull);
  });

  test('active user is exposed', () async {
    repo.events.add(residentUser);
    await pump();
    expect(c.user?.role, 'resident');
    expect(c.error, isNull);
  });

  test('missing active claim fails closed and error survives sign-out event', () async {
    repo.events.add(disabled);
    await pump();
    await pump();
    expect(repo.logoutCalls, 1);
    expect(c.user, isNull);
    expect(c.error, AuthFailure.accountDisabled);
  });

  test('claims lookup failure signs out and gives authFailed', () async {
    repo.events.addError(Exception('claims'));
    await pump();
    await pump();
    expect(repo.logoutCalls, 1);
    expect(c.user, isNull);
    expect(c.error, AuthFailure.authFailed);
  });

  test('sequence guard: newer event wins over slow older one', () async {
    repo.logoutGate = Completer<void>();
    repo.emitOnLogout = false;
    repo.events.add(disabled);
    await pump();
    repo.events.add(residentUser);
    await pump();
    repo.logoutGate!.complete();
    await pump();
    await pump();
    expect(c.user?.uid, 'u1');
    expect(c.error, isNull);
  });

  test('later successful login clears the error', () async {
    repo.events.add(disabled);
    await pump();
    await pump();
    expect(c.error, AuthFailure.accountDisabled);
    repo.loginResult = residentUser;
    await c.login('a@b.c', 'pw');
    await pump();
    expect(c.error, isNull);
    expect(c.user?.uid, 'u1');
    expect(c.busy, isFalse);
  });

  test('login failure sets error and clears loading', () async {
    repo.loginError = const AuthException(AuthFailure.invalidCredentials);
    await c.login('a@b.c', 'bad');
    expect(c.error, AuthFailure.invalidCredentials);
    expect(c.busy, isFalse);
  });

  test('register failure surfaces detail message', () async {
    repo.loginError = const AuthException(AuthFailure.registrationFailed, 'Phone required');
    await c.register(email: 'a@b.c', password: 'pw123456', name: 'N');
    expect(c.error, AuthFailure.registrationFailed);
    expect(c.errorDetail, 'Phone required');
  });
}
