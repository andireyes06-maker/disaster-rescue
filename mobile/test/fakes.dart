import 'dart:async';

import 'package:disaster_rescue/auth/auth_repository.dart';

class FakeAuthRepository implements AuthRepository {
  final StreamController<AuthUser?> events = StreamController<AuthUser?>.broadcast();
  int logoutCalls = 0;
  AuthException? loginError;
  Completer<void>? logoutGate;
  bool emitOnLogout = true;

  /// What a successful login emits, if set.
  AuthUser? loginResult;

  @override
  Stream<AuthUser?> get authChanges => events.stream;

  @override
  Future<String?> idToken() async => 'token';

  @override
  Future<void> login(String email, String password) async {
    if (loginError != null) throw loginError!;
    if (loginResult != null) events.add(loginResult);
  }

  @override
  Future<void> register({
    required String email,
    required String password,
    required String name,
    String? phone,
  }) async {
    if (loginError != null) throw loginError!;
    if (loginResult != null) events.add(loginResult);
  }

  @override
  Future<void> logout() async {
    logoutCalls++;
    if (logoutGate != null) await logoutGate!.future;
    if (emitOnLogout) events.add(null);
  }
}

const residentUser = AuthUser(uid: 'u1', email: 'a@b.c', role: 'resident', team: null, active: true);
