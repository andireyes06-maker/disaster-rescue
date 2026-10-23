import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:disaster_rescue/data/api_client.dart';
import 'package:disaster_rescue/data/report_models.dart';
import 'package:disaster_rescue/data/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

/// Only the API path is exercised by postUpdate, so any Firestore use is a test failure.
class _NoFirestore implements FirebaseFirestore {
  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw StateError('Firestore was used by ${invocation.memberName}');
}

void main() {
  test('postUpdate sends the Idempotency-Key header through the API client', () async {
    final requests = <http.Request>[];
    final api = ApiClient(
      baseUrl: 'http://h/api',
      tokenProvider: () async => 'tok',
      client: MockClient((r) async {
        requests.add(r);
        return http.Response('{"ok":true}', 200);
      }),
    );
    final repo = ApiResponderRepository(api, _NoFirestore());
    await repo.postUpdate(
      'r1',
      OperationUpdate(status: 'Resolved', peopleRescued: 2, note: ''),
      idempotencyKey: 'key-abcdefgh',
    );
    expect(requests, hasLength(1));
    expect(requests.single.method, 'POST');
    expect(requests.single.url.path, '/api/reports/r1/updates');
    expect(requests.single.headers['Idempotency-Key'], 'key-abcdefgh');
  });

  test('postUpdate without a key sends no Idempotency-Key header', () async {
    final requests = <http.Request>[];
    final api = ApiClient(
      baseUrl: 'http://h/api',
      tokenProvider: () async => 'tok',
      client: MockClient((r) async {
        requests.add(r);
        return http.Response('{"ok":true}', 200);
      }),
    );
    await ApiResponderRepository(api, _NoFirestore()).postUpdate(
      'r1',
      OperationUpdate(status: 'Resolved', peopleRescued: 0, note: ''),
    );
    expect(requests.single.headers.containsKey('Idempotency-Key'), isFalse);
  });
}
