/// One update attempt whose outcome is not yet known. The key is reused for a retry of the same content,
/// so the server replays the first result instead of recording the update again.
class UpdateAttempt {
  const UpdateAttempt({required this.key, required this.signature});
  final String key;

  /// The content the key belongs to (status, people rescued and note). A changed entry needs a new key.
  final String signature;
}

/// In-memory memory of uncertain responder updates, per report. It is never written to device storage and it
/// is dropped whenever the signed-in account changes, so a retry can never reach another account's attempt.
///
/// Every unresolved attempt is kept until its own content is confirmed or definitely refused. Returning to an
/// earlier payload therefore reuses its original key, even after a different payload was tried. The number kept
/// per report is bounded: when it is full, a new payload is blocked instead of evicting a key.
class ResponderAttemptStore {
  ResponderAttemptStore({required this.currentUid});

  /// Unresolved payloads kept per report. Beyond this, new payloads are refused until the person checks the history.
  static const maxUnresolvedPerReport = 5;

  /// The signed-in account, or null when signed out.
  final String? Function() currentUid;
  final Map<String, List<UpdateAttempt>> _byReport = {};
  String? _owner;

  /// Unresolved attempts for this report, oldest first.
  List<UpdateAttempt> attemptsFor(String reportId) {
    _checkOwner();
    return List.unmodifiable(_byReport[reportId] ?? const <UpdateAttempt>[]);
  }

  /// The unresolved attempt for exactly this content, if one exists.
  UpdateAttempt? attemptFor(String reportId, String signature) {
    for (final a in attemptsFor(reportId)) {
      if (a.signature == signature) return a;
    }
    return null;
  }

  /// True when no further payload can be kept for this report.
  bool isFull(String reportId) =>
      attemptsFor(reportId).length >= maxUnresolvedPerReport;

  /// Keeps an uncertain attempt. Content that is already kept keeps its first key. Callers check [isFull] first.
  void remember(String reportId, UpdateAttempt attempt) {
    _checkOwner();
    final list = _byReport.putIfAbsent(reportId, () => []);
    if (list.any((a) => a.signature == attempt.signature)) return;
    if (list.length >= maxUnresolvedPerReport) {
      throw StateError('Too many unresolved updates for this report');
    }
    list.add(attempt);
  }

  /// Drops only this content's attempt, after a confirmed save or a definite refusal. Other payloads are kept.
  void forget(String reportId, String signature) {
    final list = _byReport[reportId];
    if (list == null) return;
    list.removeWhere((a) => a.signature == signature);
    if (list.isEmpty) _byReport.remove(reportId);
  }

  /// Drops every unresolved attempt for this report. Only for the person's explicit choice, after they checked the history.
  void forgetReport(String reportId) => _byReport.remove(reportId);

  /// Drops every attempt, for example on sign-out or an account, role or team change.
  void clear() => _byReport.clear();

  void _checkOwner() {
    final uid = currentUid();
    if (uid != _owner) {
      _byReport.clear();
      _owner = uid;
    }
  }
}
