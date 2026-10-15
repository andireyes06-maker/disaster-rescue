import 'dart:async';

import '../data/api_client.dart';
import 'auth_backend.dart';

enum AuthFailure {
  accountDisabled,
  authFailed,
  invalidCredentials,
  network,
  emailInUse,
  weakPassword,
  registrationFailed,
  registrationUncertain,
  registrationIncomplete,
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
  const AuthUser({
    required this.uid,
    this.email,
    this.role,
    this.team,
    required this.active,
  });
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
  FirebaseAuthRepository(this._backend, this._api, {this.beforeSignOut}) {
    _sub = _backend.authStateChanges().listen(_onBackendUser);
  }

  final AuthBackend _backend;
  final ApiClient Function() _api;

  /// Runs while the user is still signed in, so the API call can authenticate.
  final Future<void> Function()? beforeSignOut;
  final StreamController<AuthUser?> _out =
      StreamController<AuthUser?>.broadcast();
  StreamSubscription<BackendUser?>? _sub;
  bool _registering = false;
  int _seq = 0;

  bool _hasLast = false;
  AuthUser? _last;
  Object? _lastError;

  /// Replays the latest state to each new listener, so a listener that
  /// subscribes after the first event still sees it.
  @override
  Stream<AuthUser?> get authChanges {
    late StreamController<AuthUser?> c;
    StreamSubscription<AuthUser?>? sub;
    c = StreamController<AuthUser?>(
      onListen: () {
        if (_hasLast) {
          if (_lastError != null) {
            c.addError(_lastError!);
          } else {
            c.add(_last);
          }
        }
        sub = _out.stream.listen(c.add, onError: c.addError);
      },
      onCancel: () => sub?.cancel(),
    );
    return c.stream;
  }

  void _publish(AuthUser? u) {
    _hasLast = true;
    _last = u;
    _lastError = null;
    _out.add(u);
  }

  void _publishError(Object e) {
    _hasLast = true;
    _lastError = e;
    _out.addError(e);
  }

  @override
  Future<String?> idToken() async => _backend.currentUser?.idToken();

  Future<void> _onBackendUser(BackendUser? user) async {
    // A new account has no claims until the API has set them.
    if (_registering) return;
    await _emit(user, ++_seq);
  }

  bool _stale(int seq, BackendUser? user) =>
      seq != _seq || _backend.currentUser?.uid != user?.uid;

  Future<void> _emit(BackendUser? user, int seq) async {
    if (user == null) {
      _publish(null);
      return;
    }
    try {
      var c = await user.claims(refresh: true);
      if (_stale(seq, user)) return;
      if (!c.containsKey('role') && !c.containsKey('active')) {
        // Account exists but was never registered with the API. The
        // endpoint is idempotent, so register it and refresh once.
        await _api().send('POST', '/users/self', body: {});
        if (_stale(seq, user)) return;
        c = await user.claims(refresh: true);
        if (_stale(seq, user)) return;
      }
      _publish(
        AuthUser(
          uid: user.uid,
          email: user.email,
          role: c['role'] as String?,
          team: c['team'] as String?,
          active: c['active'] == true,
        ),
      );
    } catch (e) {
      if (_stale(seq, user)) return;
      _publishError(e);
    }
  }

  @override
  Future<void> login(String email, String password) async {
    await _backend.signIn(email, password);
  }

  @override
  Future<void> register({
    required String email,
    required String password,
    required String name,
    String? phone,
  }) async {
    _registering = true;
    BackendUser? created;
    try {
      created = await _backend.createUser(email, password);
      try {
        await _api().send(
          'POST',
          '/users/self',
          body: {
            'name': name.trim(),
            if (phone != null && phone.trim().isNotEmpty) 'phone': phone.trim(),
          },
        );
      } on ApiException catch (e) {
        if (e.status == 0) {
          // Unknown outcome: the server may have created the profile.
          await _signOutQuietly();
          throw const AuthException(AuthFailure.registrationUncertain);
        }
        if (await _deleteQuietly(created)) {
          throw AuthException(AuthFailure.registrationFailed, e.message);
        }
        await _signOutQuietly();
        throw const AuthException(AuthFailure.registrationIncomplete);
      }
      _registering = false;
      await _emit(created, ++_seq);
    } on AuthException {
      rethrow;
    } catch (_) {
      if (created != null) {
        if (!await _deleteQuietly(created)) {
          await _signOutQuietly();
          throw const AuthException(AuthFailure.registrationIncomplete);
        }
      }
      throw const AuthException(AuthFailure.registrationFailed);
    } finally {
      _registering = false;
    }
  }

  Future<bool> _deleteQuietly(BackendUser? user) async {
    try {
      await user?.delete();
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> _signOutQuietly() async {
    try {
      await _backend.signOut();
    } catch (_) {}
  }

  @override
  Future<void> logout() async {
    _seq++;
    try {
      await beforeSignOut?.call();
    } catch (_) {}
    await _backend.signOut();
  }

  Future<void> dispose() async {
    await _sub?.cancel();
    await _out.close();
  }
}
