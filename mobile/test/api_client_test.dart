import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:disaster_rescue/data/api_client.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

ApiClient make(MockClient m, {Future<String?> Function()? token, String base = 'http://h/api/'}) =>
    ApiClient(baseUrl: base, tokenProvider: token ?? () async => 'tok', client: m);

void main() {
  test('adds bearer header, normalizes slashes, sends JSON', () async {
    late http.Request seen;
    final c = make(MockClient((r) async {
      seen = r;
      return http.Response('{"ok":true}', 200);
    }));
    final res = await c.send('POST', '/reports', body: {'a': 1});
    expect(res, {'ok': true});
    expect(seen.url.toString(), 'http://h/api/reports');
    expect(seen.headers['Authorization'], 'Bearer tok');
    expect(seen.headers['Content-Type'], contains('application/json'));
    expect(jsonDecode(seen.body), {'a': 1});
  });

  test('409 maps to ApiException with code and message', () async {
    final c = make(MockClient((r) async =>
        http.Response('{"error":"illegal_transition","message":"Nope"}', 409)));
    expect(
      c.send('GET', 'x'),
      throwsA(isA<ApiException>()
          .having((e) => e.status, 'status', 409)
          .having((e) => e.code, 'code', 'illegal_transition')
          .having((e) => e.message, 'message', 'Nope')),
    );
  });

  test('HTML body gives generic message, never echoed', () async {
    final c = make(MockClient((r) async => http.Response('<html>secret</html>', 502)));
    try {
      await c.send('GET', 'x');
      fail('should throw');
    } on ApiException catch (e) {
      expect(e.status, 502);
      expect(e.message, isNot(contains('<')));
      expect(e.message, isNot(contains('secret')));
    }
  });

  test('network failure gives status 0 code network', () async {
    final c = make(MockClient((r) async => throw const SocketException('down')));
    expect(c.send('GET', 'x'),
        throwsA(isA<ApiException>().having((e) => e.code, 'code', 'network').having((e) => e.status, 's', 0)));
  });

  test('client exception gives network', () async {
    final c = make(MockClient((r) async => throw http.ClientException('x')));
    expect(c.send('GET', 'x'), throwsA(isA<ApiException>().having((e) => e.code, 'code', 'network')));
  });

  test('timeout gives network', () async {
    final c = ApiClient(
      baseUrl: 'http://h',
      tokenProvider: () async => 't',
      timeout: const Duration(milliseconds: 20),
      client: MockClient((r) => Completer<http.Response>().future),
    );
    expect(c.send('GET', 'x'), throwsA(isA<ApiException>().having((e) => e.code, 'code', 'network')));
  });

  test('token provider failure or null gives code auth', () async {
    final m = MockClient((r) async => http.Response('{}', 200));
    expect(make(m, token: () async => throw Exception('x')).send('GET', 'x'),
        throwsA(isA<ApiException>().having((e) => e.code, 'code', 'auth').having((e) => e.status, 's', 0)));
    expect(make(m, token: () async => null).send('GET', 'x'),
        throwsA(isA<ApiException>().having((e) => e.code, 'code', 'auth')));
  });

  test('204 and empty body return null', () async {
    expect(await make(MockClient((r) async => http.Response('', 204))).send('DELETE', 'x'), isNull);
    expect(await make(MockClient((r) async => http.Response('', 200))).send('GET', 'x'), isNull);
  });

  test('multipart sends fields, files and bearer', () async {
    late http.BaseRequest seen;
    final c = make(MockClient.streaming((r, body) async {
      seen = r;
      await body.drain();
      return http.StreamedResponse(Stream.value(utf8.encode('{"id":"r1"}')), 201);
    }));
    final res = await c.sendMultipart('POST', '/reports',
        fields: {'type': 'flood'},
        files: [http.MultipartFile.fromBytes('photos', [1, 2, 3], filename: 'a.jpg')]);
    expect(res, {'id': 'r1'});
    expect(seen.headers['Authorization'], 'Bearer tok');
    expect(seen, isA<http.MultipartRequest>());
    expect((seen as http.MultipartRequest).fields['type'], 'flood');
  });
}
