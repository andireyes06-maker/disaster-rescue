import 'dart:async';
import 'dart:typed_data';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:disaster_rescue/data/api_client.dart';
import 'package:disaster_rescue/data/services.dart';
import 'package:disaster_rescue/data/report_models.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

class _UnusedFirestore implements FirebaseFirestore {
  @override
  dynamic noSuchMethod(Invocation invocation) => throw UnimplementedError();
}

void main() {
  testWidgets('profile photo can finish after the ordinary 20 second timeout', (tester) async {
    final reply = Completer<http.Response>();
    final api = ApiClient(baseUrl: 'http://local.test/api', tokenProvider: () async => 'test-token', client: MockClient((_) => reply.future));
    final repo = FirestoreProfileRepository(_UnusedFirestore(), api);
    String? result;
    Object? failure;
    final send = repo.setPhoto(PickedPhoto(name: 'me.png', mime: 'image/png', bytes: Uint8List.fromList([1, 2, 3])));
    send.then((value) { result = value; }, onError: (Object error) { failure = error; });
    await tester.pump();
    await tester.pump(const Duration(seconds: 21));
    expect(failure, isNull);
    reply.complete(http.Response('{"photoUrl":"https://example.test/photo.png"}', 200));
    await tester.pump();
    expect(result, 'https://example.test/photo.png');
    expect(failure, isNull);
  });

  testWidgets('profile photo still times out after its 60 second upload window', (tester) async {
    final api = ApiClient(baseUrl: 'http://local.test/api', tokenProvider: () async => 'test-token', client: MockClient((_) => Completer<http.Response>().future));
    final repo = FirestoreProfileRepository(_UnusedFirestore(), api);
    Object? failure;
    repo.setPhoto(PickedPhoto(name: 'me.png', mime: 'image/png', bytes: Uint8List.fromList([1]))).then((_) {}, onError: (Object error) { failure = error; });
    await tester.pump();
    await tester.pump(const Duration(seconds: 59));
    expect(failure, isNull);
    await tester.pump(const Duration(seconds: 2));
    expect(failure, isA<ApiException>().having((e) => e.code, 'code', 'network'));
  });
}
