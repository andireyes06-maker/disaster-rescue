// Decides how the signed-in session reacts to the canonical profile (users/{uid}) and the token claims.
// Pure Dart: no Firebase calls, so every rule is unit-tested. It mirrors web/src/auth/profileSync.ts.

/// What the profile listener currently knows.
sealed class ProfileState {
  const ProfileState();
}

/// Not yet answered by the server (or only an empty cache answer so far).
class ProfileLoading extends ProfileState {
  const ProfileLoading();
}

/// The server says the profile document does not exist.
class ProfileMissing extends ProfileState {
  const ProfileMissing();
}

/// The rules refused the profile read. Usually the account is deactivated, but a refusal can also come from other rule or auth problems.
class ProfileDenied extends ProfileState {
  const ProfileDenied();
}

/// The profile document, as the server returned it.
class ProfileValue extends ProfileState {
  const ProfileValue({required this.active, required this.role, this.team, this.authSyncPending = false});
  final bool active;
  final String? role;
  final String? team;

  /// True while the API is writing the claims for this profile change. Hold; do not refresh.
  final bool authSyncPending;
}

/// The token claims the session currently holds.
class ClaimsView {
  const ClaimsView({required this.active, this.role, this.team});
  final bool active;
  final String? role;
  final String? team;
}

enum SyncHold { profileLoading, authSyncPending, claimsNotUpdated, refreshFailed }

sealed class SyncDecision {
  const SyncDecision();
}

class SyncInSync extends SyncDecision {
  const SyncInSync();
}

class SyncHoldFor extends SyncDecision {
  const SyncHoldFor(this.reason);
  final SyncHold reason;
}

/// One refresh is due for this profile version.
class SyncRefresh extends SyncDecision {
  const SyncRefresh(this.key);
  final String key;
}

class SyncSignOut extends SyncDecision {
  const SyncSignOut(this.reason);

  /// accountDisabled or sessionEnded. The repository maps this onto the sign-in failure.
  final SyncEnd reason;
}

/// profileUnreadable: the profile read was refused. Only [accountDisabled] means the account is actually inactive.
enum SyncEnd { accountDisabled, sessionEnded, profileUnreadable }

String? _teamOf(String? v) => (v == null || v.isEmpty) ? null : v;

/// The part of the profile the claims must match. A new key means the profile changed and one refresh is due.
String profileKey(ProfileValue p) => '${p.role ?? ''}|${_teamOf(p.team) ?? ''}';

/// [sessionRole] is the role this session started with. A different role is never an ordinary change: the session ends.
SyncDecision decideProfileSync({
  required ProfileState profile,
  required ClaimsView claims,
  required String? refreshedFor,
  bool provisioning = false,
  String? sessionRole,
}) {
  switch (profile) {
    case ProfileLoading():
      return const SyncHoldFor(SyncHold.profileLoading);
    case ProfileDenied():
      return const SyncSignOut(SyncEnd.profileUnreadable);
    case ProfileMissing():
      // A missing profile is a broken or ended session, except while a new account is still being set up.
      return provisioning
          ? const SyncHoldFor(SyncHold.profileLoading)
          : const SyncSignOut(SyncEnd.sessionEnded);
    case ProfileValue():
      break;
  }
  final p = profile;
  if (!p.active) return const SyncSignOut(SyncEnd.accountDisabled);
  if (sessionRole != null && p.role != sessionRole) return const SyncSignOut(SyncEnd.sessionEnded);
  if (p.authSyncPending) return const SyncHoldFor(SyncHold.authSyncPending);
  final inSync = claims.active && claims.role != null && claims.role == p.role && _teamOf(claims.team) == _teamOf(p.team);
  if (inSync) return const SyncInSync();
  final key = profileKey(p);
  // One refresh per profile version. If the claims still disagree after it, wait for a new profile version.
  if (refreshedFor == key) return const SyncHoldFor(SyncHold.claimsNotUpdated);
  return SyncRefresh(key);
}

/// A refresh failure either ends the session (the account or token is no longer valid) or is retried later.
bool isSessionEndingRefreshError(String? code) {
  const ended = {
    'user-disabled',
    'user-token-expired',
    'user-not-found',
    'invalid-user-token',
    'id-token-revoked',
    'invalid-refresh-token',
    'requires-recent-login',
  };
  return ended.contains(code);
}

/// Bounded retries for claims that lag behind the profile (the API writes them just after the profile).
/// After the last one the person can press "Retry access check", or a new profile version arrives.
const List<Duration> claimRetryDelays = [Duration(seconds: 2), Duration(seconds: 5), Duration(seconds: 15)];
