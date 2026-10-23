import 'dart:async';

import 'package:flutter/foundation.dart';

import 'auth_repository.dart';

class AuthController extends ChangeNotifier {
  AuthController(this._repo) {
    _sub = _repo.authChanges.listen(_onUser, onError: _onClaimsError);
  }

  final AuthRepository _repo;
  StreamSubscription<AuthUser?>? _sub;
  int _seq = 0;
  bool _disposed = false;

  AuthUser? user;
  /// True until the first auth event arrives.
  bool loading = true;

  /// True while a login or register call is in flight.
  bool busy = false;
  AuthFailure? error;
  String? errorDetail;

  void _set({AuthUser? user, bool? loading, AuthFailure? error, String? detail, bool keepError = false}) {
    if (_disposed) return;
    this.user = user;
    if (loading != null) this.loading = loading;
    if (!keepError) {
      this.error = error;
      errorDetail = detail;
    }
    notifyListeners();
  }

  Future<void> _onUser(AuthUser? u) async {
    final seq = ++_seq;
    if (u == null) {
      // A sign-out never erases an error that caused it.
      _set(user: null, loading: false, keepError: true);
      return;
    }
    // The session must end (for example after a role change). Sign out with that reason.
    if (u.endReason != null) {
      await _failClosed(seq, u.endReason!);
      return;
    }
    // The profile and the claims disagree. The person stays signed in, but protected views wait (see RoleGate).
    if (u.syncing) {
      _set(user: u, loading: false);
      return;
    }
    if (!u.active) {
      await _failClosed(seq, AuthFailure.accountDisabled);
      return;
    }
    _set(user: u, loading: false);
  }

  Future<void> _onClaimsError(Object _) async {
    await _failClosed(++_seq, AuthFailure.authFailed);
  }

  /// Error is set BEFORE signing out so the sign-out event cannot erase it.
  /// The sequence is captured before the await and checked after it, so a
  /// newer event that arrived meanwhile is not overwritten.
  Future<void> _failClosed(int seq, AuthFailure failure) async {
    _set(user: null, loading: false, error: failure);
    try {
      await _repo.logout();
    } catch (_) {}
    if (seq != _seq) return;
    _set(user: null, loading: false, error: failure);
  }

  Future<void> login(String email, String password) => _run(() => _repo.login(email, password));

  Future<void> register({
    required String email,
    required String password,
    required String name,
    String? phone,
  }) =>
      _run(() => _repo.register(email: email, password: password, name: name, phone: phone));

  Future<void> _run(Future<void> Function() action) async {
    busy = true;
    error = null;
    errorDetail = null;
    notifyListeners();
    try {
      await action();
    } on AuthException catch (e) {
      error = e.failure;
      errorDetail = e.message;
    } catch (_) {
      error = AuthFailure.authFailed;
    }
    busy = false;
    if (!_disposed) notifyListeners();
  }

  Future<void> logout() => _repo.logout();

  /// Asks for another access check after the automatic retries have run out.
  void retryAccessCheck() => _repo.retryAccessCheck();
  Future<void> requestPasswordReset(String email) => _repo.requestPasswordReset(email);

  @override
  void dispose() {
    _disposed = true;
    _sub?.cancel();
    super.dispose();
  }
}
