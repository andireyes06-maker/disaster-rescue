import 'dart:convert';

import 'package:http/http.dart' as http;

/// Sends a "contact an admin" password help request (api/src/routes/auth.js). No sign-in is needed.
/// The server answers the same way for any email, so the reply tells nobody whether an account exists.
class PasswordHelp {
  PasswordHelp({required this.baseUrl, http.Client? client}) : _client = client ?? http.Client();

  final String baseUrl;
  final http.Client _client;

  Future<void> request(String email) async {
    final base = baseUrl.replaceAll(RegExp(r'/+$'), '');
    final res = await _client
        .post(
          Uri.parse('$base/auth/reset-help'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'email': email}),
        )
        .timeout(const Duration(seconds: 10));
    if (res.statusCode != 202) throw PasswordHelpException(res.statusCode);
  }
}

class PasswordHelpException implements Exception {
  PasswordHelpException(this.status);
  final int status;
}
