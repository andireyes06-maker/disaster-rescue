import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';

import '../data/api_client.dart';

enum AuthFailure {
  accountDisabled,
  authFailed,
  invalidCredentials,
  network,
  emailInUse,
  weakPassword,
  registrationFailed,
}

class AuthException implements Exception {
  final AuthFailure failure;
  final String? message;
  const AuthException(this.failure, [this.message]);
}

class AuthUser {
  final String uid;
  final String? email;
  final String? role;
  final String? team;
  final bool active;
  const AuthUser({required this.uid, this.email, this.role, this.team, required this.active});
}

abstract class AuthRepository {
  /// Emits the signed-in user with claims, or null when signed out.
  /// A claims lookup failure arrives as a stream error.
  Stream<AuthUser?> get authChanges;
  Future<String?> idToken();
  Future<void> login(String email, String password);
  Future<void> register({
    required String email,
    required String password,
    required String name,
    String? phone,
  });
  Future<void> logout();
}

class FirebaseAuthRepository implements AuthRepository {
  FirebaseAuthRepository(this._auth, this._api) {
    _sub = _auth.authStateChanges().listen(_onFirebaseUser);
  }

  final FirebaseAuth _auth;
  final ApiClient Function() _api;
  final StreamController<AuthUser?> _out = StreamController<AuthUser?>.broadcast();
  StreamSubscription<User?>? _sub;
  bool _registering = false;

  @override
  Stream<AuthUser?> get authChanges => _out.stream;

  @override
  Future<String?> idToken() async => _auth.currentUser?.getIdToken();

  Future<void> _onFirebaseUser(User? user) async {
    // A new account has no claims until the API has set them.
    if (_registering) return;
    await _emit(user);
  }

  Future<void> _emit(User? user) async {
    if (user == null) {
      _out.add(null);
      return;
    }
    try {
      final r = await user.getIdTokenResult(true);
      final c = r.claims ?? const <String, dynamic>{};
      _out.add(AuthUser(
        uid: user.uid,
        email: user.email,
        role: c['role'] as String?,
        team: c['team'] as String?,
        active: c['active'] == true,
      ));
    } catch (e) {
      _out.addError(e);
    }
  }

  @override
  Future<void> login(String email, String password) async {
    try {
      await _auth.signInWithEmailAndPassword(email: email.trim(), password: password);
    } on FirebaseAuthException catch (e) {
      throw AuthException(_map(e));
    }
  }

  @override
  Future<void> register({
    required String email,
    required String password,
    required String name,
    String? phone,
  }) async {
    _registering = true;
    User? created;
    try {
      final cred = await _auth.createUserWithEmailAndPassword(email: email.trim(), password: password);
      created = cred.user;
      await _api().send('POST', '/users/self', body: {
        'name': name.trim(),
        if (phone != null && phone.trim().isNotEmpty) 'phone': phone.trim(),
      });
      _registering = false;
      await _emit(_auth.currentUser);
    } on FirebaseAuthException catch (e) {
      _registering = false;
      throw AuthException(_map(e));
    } on ApiException catch (e) {
      await _discard(created);
      throw AuthException(AuthFailure.registrationFailed, e.message);
    } catch (_) {
      await _discard(created);
      throw const AuthException(AuthFailure.registrationFailed);
    } finally {
      _registering = false;
    }
  }

  Future<void> _discard(User? user) async {
    try {
      await user?.delete();
    } catch (_) {
      try {
        await _auth.signOut();
      } catch (_) {}
    }
  }

  @override
  Future<void> logout() => _auth.signOut();

  Future<void> dispose() async {
    await _sub?.cancel();
    await _out.close();
  }

  AuthFailure _map(FirebaseAuthException e) {
    switch (e.code) {
      case 'invalid-credential':
      case 'wrong-password':
      case 'user-not-found':
      case 'invalid-email':
        return AuthFailure.invalidCredentials;
      case 'user-disabled':
        return AuthFailure.accountDisabled;
      case 'network-request-failed':
        return AuthFailure.network;
      case 'email-already-in-use':
        return AuthFailure.emailInUse;
      case 'weak-password':
        return AuthFailure.weakPassword;
      default:
        return AuthFailure.authFailed;
    }
  }
}
