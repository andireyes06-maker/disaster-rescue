import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

class ApiException implements Exception {
  final int status;
  final String code;
  final String message;
  const ApiException(this.status, this.code, this.message);

  @override
  String toString() => 'ApiException($status, $code, $message)';
}

class ApiClient {
  ApiClient({
    required this.baseUrl,
    required this.tokenProvider,
    http.Client? client,
    this.timeout = const Duration(seconds: 20),
  }) : _client = client ?? http.Client();

  final String baseUrl;
  final Future<String?> Function() tokenProvider;
  final Duration timeout;
  final http.Client _client;

  Uri _uri(String path) {
    final base = baseUrl.replaceAll(RegExp(r'/+$'), '');
    final p = path.replaceAll(RegExp(r'^/+'), '');
    return Uri.parse('$base/$p');
  }

  Future<String> _token() async {
    try {
      final t = await tokenProvider();
      if (t != null && t.isNotEmpty) return t;
    } catch (_) {}
    throw const ApiException(0, 'auth', 'You are signed out. Please log in again.');
  }

  Future<Map<String, dynamic>?> send(String method, String path, {Map<String, dynamic>? body}) async {
    final token = await _token();
    final req = http.Request(method, _uri(path))
      ..headers['Authorization'] = 'Bearer $token'
      ..headers['Accept'] = 'application/json';
    if (body != null) {
      req.headers['Content-Type'] = 'application/json';
      req.body = jsonEncode(body);
    }
    return _run(() async => http.Response.fromStream(await _client.send(req)));
  }

  Future<Map<String, dynamic>?> sendMultipart(
    String method,
    String path, {
    Map<String, String> fields = const {},
    List<http.MultipartFile> files = const [],
    Map<String, String> headers = const {},
  }) async {
    final token = await _token();
    final req = http.MultipartRequest(method, _uri(path))
      ..headers['Authorization'] = 'Bearer $token'
      ..headers['Accept'] = 'application/json'
      ..headers.addAll(headers)
      ..fields.addAll(fields)
      ..files.addAll(files);
    return _run(() async => http.Response.fromStream(await _client.send(req)));
  }

  Future<Map<String, dynamic>?> _run(Future<http.Response> Function() call) async {
    final http.Response res;
    try {
      res = await call().timeout(timeout);
    } on ApiException {
      rethrow;
    } on TimeoutException {
      throw const ApiException(0, 'network', 'The server took too long to answer. Check your connection and try again.');
    } on IOException {
      throw const ApiException(0, 'network', 'Cannot reach the server. Check your connection and try again.');
    } on http.ClientException {
      throw const ApiException(0, 'network', 'Cannot reach the server. Check your connection and try again.');
    }

    final text = res.body.trim();
    dynamic decoded;
    var isJson = false;
    if (text.isNotEmpty) {
      try {
        decoded = jsonDecode(text);
        isJson = true;
      } catch (_) {}
    }

    if (res.statusCode < 200 || res.statusCode >= 300) {
      if (isJson && decoded is Map && decoded['error'] is String) {
        final msg = decoded['message'];
        throw ApiException(
          res.statusCode,
          decoded['error'] as String,
          msg is String && msg.isNotEmpty ? msg : 'The request failed (${res.statusCode}).',
        );
      }
      throw ApiException(res.statusCode, 'http_error', 'Something went wrong (${res.statusCode}). Please try again.');
    }
    if (res.statusCode == 204 || text.isEmpty) return null;
    if (!isJson) {
      throw ApiException(res.statusCode, 'bad_response', 'The server sent an unexpected reply.');
    }
    return decoded is Map<String, dynamic> ? decoded : {'data': decoded};
  }
}
