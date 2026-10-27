import 'dart:convert';

import 'package:http/http.dart' as http;

/// Talks to the API's sign-in lockout (api/src/routes/auth.js). The lockout is enforced by the server.
/// The check, failure and success calls need no session, so this client sends no token except on success.
/// If the server cannot be reached, sign-in is not blocked: the limit only applies when the server answers.
class SignInLockout {
  SignInLockout({required this.baseUrl, http.Client? client}) : _client = client ?? http.Client();

  final String baseUrl;
  final http.Client _client;
  static const _timeout = Duration(seconds: 10);

  Uri _uri(String action) {
    final base = baseUrl.replaceAll(RegExp(r'/+$'), '');
    return Uri.parse('$base/auth/sign-in/$action');
  }

  /// Seconds left on a lock for this email and this device's address, or 0 when sign-in may go ahead.
  Future<int> check(String email) async {
    final j = await _post('check', {'email': email});
    return _secondsIfLocked(j);
  }

  /// Records one failed sign-in and returns the seconds left on the lock it causes, or 0.
  Future<int> failure(String email) async {
    final j = await _post('failure', {'email': email});
    return _secondsIfLocked(j);
  }

  /// Clears the count after a verified sign-in. Best effort: a failure here never blocks the sign-in.
  Future<void> success(String idToken) async {
    try {
      await _client
          .post(_uri('success'), headers: {'Authorization': 'Bearer $idToken', 'Content-Type': 'application/json'}, body: '{}')
          .timeout(_timeout);
    } catch (_) {
      // Ignored on purpose; the server keeps the count until the next success or the lock ends.
    }
  }

  Future<Map<String, dynamic>?> _post(String action, Map<String, String> body) async {
    try {
      final r = await _client
          .post(_uri(action), headers: {'Content-Type': 'application/json'}, body: jsonEncode(body))
          .timeout(_timeout);
      if (r.statusCode != 200) return null;
      final decoded = jsonDecode(r.body);
      return decoded is Map<String, dynamic> ? decoded : null;
    } catch (_) {
      return null;
    }
  }

  int _secondsIfLocked(Map<String, dynamic>? j) {
    if (j == null || j['locked'] != true) return 0;
    final s = j['retryAfterSeconds'];
    return s is num && s > 0 ? s.ceil() : 1;
  }
}
