import 'package:firebase_auth/firebase_auth.dart';

import 'auth_repository.dart';

/// Thin seam over FirebaseAuth so the repository can be tested without Firebase.
abstract class BackendUser {
  String get uid;
  String? get email;
  Future<Map<String, dynamic>> claims({required bool refresh});
  Future<String?> idToken();
  Future<void> delete();
}

abstract class AuthBackend {
  Stream<BackendUser?> authStateChanges();
  BackendUser? get currentUser;
  Future<BackendUser> signIn(String email, String password);
  Future<BackendUser> createUser(String email, String password);
  Future<void> signOut();
}

class _FirebaseUser implements BackendUser {
  _FirebaseUser(this._u);
  final User _u;

  @override
  String get uid => _u.uid;
  @override
  String? get email => _u.email;

  @override
  Future<Map<String, dynamic>> claims({required bool refresh}) async {
    final r = await _u.getIdTokenResult(refresh);
    return r.claims ?? const <String, dynamic>{};
  }

  @override
  Future<String?> idToken() => _u.getIdToken();

  @override
  Future<void> delete() => _u.delete();
}

class FirebaseAuthBackend implements AuthBackend {
  FirebaseAuthBackend(this._auth);
  final FirebaseAuth _auth;

  @override
  Stream<BackendUser?> authStateChanges() =>
      _auth.authStateChanges().map((u) => u == null ? null : _FirebaseUser(u));

  @override
  BackendUser? get currentUser {
    final u = _auth.currentUser;
    return u == null ? null : _FirebaseUser(u);
  }

  @override
  Future<BackendUser> signIn(String email, String password) async {
    try {
      final c = await _auth.signInWithEmailAndPassword(email: email.trim(), password: password);
      return _FirebaseUser(c.user!);
    } on FirebaseAuthException catch (e) {
      throw AuthException(_map(e));
    }
  }

  @override
  Future<BackendUser> createUser(String email, String password) async {
    try {
      final c = await _auth.createUserWithEmailAndPassword(email: email.trim(), password: password);
      return _FirebaseUser(c.user!);
    } on FirebaseAuthException catch (e) {
      throw AuthException(_map(e));
    }
  }

  @override
  Future<void> signOut() => _auth.signOut();

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
