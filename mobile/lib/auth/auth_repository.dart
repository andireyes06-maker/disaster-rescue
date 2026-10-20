import 'dart:async';

import '../data/api_client.dart';
import 'auth_backend.dart';
import 'profile_source.dart';
import 'profile_sync.dart';

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
  /// The profile or the token is no longer valid (for example after a role change). Sign in again.
  sessionEnded,
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

  /// True while the canonical profile and the token claims disagree. Protected views stay hidden until they agree.
  final bool syncing;
  final SyncHold? syncNote;

  /// True when the person may ask for another check (the automatic retries are used up, or the profile is late).
  final bool retryAvailable;

  /// Set when the session must end. The controller signs out with this reason.
  final AuthFailure? endReason;

  const AuthUser({
    required this.uid,
    this.email,
    this.role,
    this.team,
    required this.active,
    this.syncing = false,
    this.syncNote,
    this.retryAvailable = false,
    this.endReason,
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
  Future<void> requestPasswordReset(String email);

  /// Asks for another access check after the automatic retries have run out. Does nothing by default.
  void retryAccessCheck() {}
}

class FirebaseAuthRepository implements AuthRepository {
  FirebaseAuthRepository(
    this._backend,
    this._api, {
    this.beforeSignOut,
    this.profiles,
    this.retryDelays = claimRetryDelays,
  }) {
    _sub = _backend.authStateChanges().listen(_onBackendUser);
  }

  final AuthBackend _backend;
  final ApiClient Function() _api;

  /// Runs while the user is still signed in, so the API call can authenticate.
  final Future<void> Function()? beforeSignOut;

  /// The canonical profile. When null (tests, or no Firestore), the claims alone decide, as before.
  final ProfileSource? profiles;
  final List<Duration> retryDelays;

  final StreamController<AuthUser?> _out = StreamController<AuthUser?>.broadcast();
  StreamSubscription<BackendUser?>? _sub;
  bool _registering = false;
  int _seq = 0;

  bool _hasLast = false;
  AuthUser? _last;
  Object? _lastError;

  BackendUser? _currentUser;
  ClaimsView? _claims;
  String? _profileUid;
  ProfileState _profile = const ProfileLoading();
  StreamSubscription<ProfileState>? _profileSub;

  // The role this session started with. A later role change ends the session.
  String? _sessionUid;
  String? _sessionRole;

  // "uid#profileKey" of the last refresh asked for. Cleared after a network failure, so a later change can retry.
  String? _refreshedFor;
  bool _refreshing = false;
  bool _pendingRefresh = false;
  // Identifies the current profile session. Replaced whenever the watch stops (sign-out, account change or a
  // new sign-in, even with the same uid). A refresh that completes under an older token changes nothing.
  Object _session = Object();

  // How long a profile may take before the person is offered a retry (for example offline with no cached profile).
  static const Duration profileWait = Duration(seconds: 15);
  Timer? _profileWaitTimer;
  bool _profileWaitElapsed = false;

  // Bounded retries for claims that lag behind the profile.
  Timer? _retryTimer;
  String? _retryKey;
  int _retryCount = 0;

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
      _stopProfile();
      _currentUser = null;
      _sessionUid = null;
      _sessionRole = null;
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
      _currentUser = user;
      final claims = ClaimsView(
        active: c['active'] == true,
        role: c['role'] as String?,
        team: c['team'] as String?,
      );
      if (profiles == null) {
        _publish(AuthUser(
          uid: user.uid,
          email: user.email,
          role: claims.role,
          team: claims.team,
          active: claims.active,
        ));
        return;
      }
      // Watch first: starting a new watch clears the claims, so they are stored after it.
      _watchProfile(user.uid);
      _claims = claims;
      _evaluate();
    } catch (e) {
      if (_stale(seq, user)) return;
      _publishError(e);
    }
  }

  // ---- Canonical profile synchronization -------------------------------------------------------------------------

  void _watchProfile(String uid) {
    if (_profileUid == uid) return;
    _stopProfile();
    _profileUid = uid;
    _profile = const ProfileLoading();
    _profileSub = profiles!.watch(uid).listen(
      (p) {
        // A late callback from an account that is no longer current is ignored.
        if (_profileUid != uid) return;
        _profile = p;
        _evaluate();
      },
      onError: (Object _) {},
    );
  }

  /// Ends the profile listener and forgets everything tied to it. The session role is kept until sign-out.
  void _stopProfile() {
    _session = Object();
    _cancelProfileWait();
    _profileSub?.cancel();
    _profileSub = null;
    _profileUid = null;
    _profile = const ProfileLoading();
    _claims = null;
    _refreshedFor = null;
    _refreshing = false;
    _pendingRefresh = false;
    _cancelRetry();
    _retryKey = null;
    _retryCount = 0;
  }

  String? _refreshedKey(String uid) {
    final v = _refreshedFor;
    if (v == null || !v.startsWith('$uid#')) return null;
    return v.substring(uid.length + 1);
  }

  void _cancelRetry() {
    _retryTimer?.cancel();
    _retryTimer = null;
  }

  void _evaluate() {
    final user = _currentUser;
    final claims = _claims;
    final uid = _profileUid;
    if (user == null || claims == null || uid == null || uid != user.uid) return;
    final decision = decideProfileSync(
      profile: _profile,
      claims: claims,
      refreshedFor: _refreshedKey(uid),
      provisioning: _registering,
      sessionRole: _sessionUid == uid ? _sessionRole : null,
    );
    switch (decision) {
      case SyncInSync():
        _cancelRetry();
        _cancelProfileWait();
        _retryKey = null;
        _retryCount = 0;
        // The role this session started with. Recorded only once the profile and the claims agree.
        if (_sessionUid != uid) {
          _sessionUid = uid;
          _sessionRole = claims.role;
        }
        _publishFor(user, claims, syncing: false);
      case SyncHoldFor(:final reason):
        if (reason == SyncHold.profileLoading) {
          _scheduleProfileWait();
        } else {
          _cancelProfileWait();
        }
        if (reason == SyncHold.claimsNotUpdated) _scheduleClaimRetry(uid);
        _publishFor(user, claims, syncing: true, note: reason, retryAvailable: _retryAvailableFor(reason, uid));
      case SyncRefresh(:final key):
        _refresh(user, uid, key, claims);
      case SyncSignOut(:final reason):
        _cancelRetry();
        _cancelProfileWait();
        _publishEnded(
          user,
          reason == SyncEnd.accountDisabled ? AuthFailure.accountDisabled : AuthFailure.sessionEnded,
        );
    }
  }

  /// One refresh for this profile version. Only one runs at a time; a request made during it is remembered.
  void _refresh(BackendUser user, String uid, String key, ClaimsView claims) {
    final session = _session;
    _refreshedFor = '$uid#$key';
    if (_refreshing) {
      _pendingRefresh = true;
      _publishFor(user, claims, syncing: true, note: SyncHold.claimsNotUpdated);
      return;
    }
    _refreshing = true;
    _cancelRetry();
    _publishFor(user, claims, syncing: true, note: SyncHold.claimsNotUpdated);
    user.claims(refresh: true).then(
      (c) {
        // An obsolete callback (another account, or an earlier sign-in of this account) changes nothing.
        if (!identical(session, _session) || _profileUid != uid || _currentUser?.uid != uid) return;
        _claims = ClaimsView(
          active: c['active'] == true,
          role: c['role'] as String?,
          team: c['team'] as String?,
        );
        _evaluate();
      },
      onError: (Object e) {
        if (!identical(session, _session) || _profileUid != uid || _currentUser?.uid != uid) return;
        if (isSessionEndingRefreshError(_errorCode(e))) {
          _publishEnded(user, AuthFailure.sessionEnded);
          return;
        }
        // Network or server trouble: no loop. Retry on the next profile change or on request.
        _refreshedFor = null;
        _publishFor(user, claims, syncing: true, note: SyncHold.refreshFailed, retryAvailable: true);
      },
    ).whenComplete(() {
      if (!identical(session, _session)) return;
      _refreshing = false;
      if (_pendingRefresh) {
        _pendingRefresh = false;
        _evaluate();
      }
    });
  }

  void _scheduleClaimRetry(String uid) {
    final key = _refreshedKey(uid);
    if (key == null) return;
    if (_retryKey != key) {
      _retryKey = key;
      _retryCount = 0;
    }
    if (_retryTimer != null || _retryCount >= retryDelays.length) return;
    final delay = retryDelays[_retryCount];
    _retryCount++;
    _retryTimer = Timer(delay, () {
      _retryTimer = null;
      if (_profileUid != uid) return;
      _refreshedFor = null;
      _evaluate();
    });
  }

  /// The person asked for another check. One refresh now, with the automatic counters reset.
  @override
  void retryAccessCheck() {
    _cancelRetry();
    _cancelProfileWait();
    _retryKey = null;
    _retryCount = 0;
    _refreshedFor = null;
    _evaluate();
  }

  void _scheduleProfileWait() {
    if (_profileWaitTimer != null || _profileWaitElapsed) return;
    _profileWaitTimer = Timer(profileWait, () {
      _profileWaitTimer = null;
      _profileWaitElapsed = true;
      _evaluate();
    });
  }

  void _cancelProfileWait() {
    _profileWaitTimer?.cancel();
    _profileWaitTimer = null;
    _profileWaitElapsed = false;
  }

  bool _retryAvailableFor(SyncHold reason, String uid) {
    switch (reason) {
      case SyncHold.profileLoading:
        return _profileWaitElapsed;
      case SyncHold.claimsNotUpdated:
        return _retryTimer == null && _retryCount >= retryDelays.length;
      case SyncHold.refreshFailed:
        return true;
      case SyncHold.authSyncPending:
        return false;
    }
  }

  void _publishFor(
    BackendUser user,
    ClaimsView c, {
    required bool syncing,
    SyncHold? note,
    bool retryAvailable = false,
  }) {
    _publish(AuthUser(
      uid: user.uid,
      email: user.email,
      role: c.role,
      team: c.team,
      active: c.active,
      syncing: syncing,
      syncNote: note,
      retryAvailable: retryAvailable,
    ));
  }

  void _publishEnded(BackendUser user, AuthFailure reason) {
    _cancelRetry();
    _publish(AuthUser(uid: user.uid, email: user.email, active: false, endReason: reason));
  }

  /// The error code of a refresh failure. FirebaseAuthException carries one; other errors carry none.
  String? _errorCode(Object e) {
    try {
      return (e as dynamic).code as String?;
    } catch (_) {
      return null;
    }
  }

  // ---- Sign-in, registration and sign-out -----------------------------------------------------------------------

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
    _stopProfile();
    try {
      await beforeSignOut?.call();
    } catch (_) {}
    await _backend.signOut();
  }

  @override
  Future<void> requestPasswordReset(String email) => _backend.sendPasswordReset(email.trim());

  Future<void> dispose() async {
    _stopProfile();
    await _sub?.cancel();
    await _out.close();
  }
}
