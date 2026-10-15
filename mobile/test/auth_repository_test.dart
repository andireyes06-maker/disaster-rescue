import 'dart:async';
import 'dart:io';

import 'package:disaster_rescue/auth/auth_controller.dart';
import 'package:disaster_rescue/auth/auth_repository.dart';
import 'package:disaster_rescue/data/api_client.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'fake_backend.dart';

Future<void> pump() => Future<void>.delayed(Duration.zero);

Map<String, dynamic> resident() => {'role': 'resident', 'active': true};

void main() {
  late FakeBackend backend;
  late List<http.Request> posts;
  late http.Response Function() apiReply;
  late Object? apiThrow;
  late FirebaseAuthRepository repo;

  setUp(() {
    backend = FakeBackend();
    posts = [];
    apiReply = () => http.Response('{"ok":true}', 200);
    apiThrow = null;
    final api = ApiClient(
      baseUrl: 'http://h/api',
      tokenProvider: () async => 'tok',
      client: MockClient((r) async {
        posts.add(r);
        if (apiThrow != null) throw apiThrow!;
        return apiReply();
      }),
    );
    repo = FirebaseAuthRepository(backend, () => api);
  });

  test('first event before anyone listens is replayed; controller leaves loading', () async {
    backend.emit(FakeUser('u1', (_) async => resident()));
    await pump();
    await pump();
    final c = AuthController(repo);
    await pump();
    await pump();
    expect(c.loading, isFalse);
    expect(c.user?.uid, 'u1');
    c.dispose();
  });

  test('stale claims result after logout is dropped', () async {
    final gate = Completer<Map<String, dynamic>>();
    final events = <AuthUser?>[];
    repo.authChanges.listen(events.add);
    final u = FakeUser('u1', (_) => gate.future);
    backend.emit(u);
    await pump();
    await repo.logout();
    await pump();
    gate.complete(resident());
    await pump();
    await pump();
    expect(events.whereType<AuthUser>(), isEmpty);
    expect(events.last, isNull);
  });

  test('overlapping events: first resolving last is dropped', () async {
    final g1 = Completer<Map<String, dynamic>>();
    final events = <AuthUser?>[];
    repo.authChanges.listen(events.add);
    final u1 = FakeUser('u1', (_) => g1.future);
    final u2 = FakeUser('u2', (_) async => resident());
    backend.current = u2;
    backend.emit(u1);
    backend.emit(u2);
    await pump();
    g1.complete(resident());
    await pump();
    await pump();
    expect(events.map((e) => e?.uid), ['u2']);
  });

  test('claims without active are reported inactive and do not call the API when a role exists', () async {
    final events = <AuthUser?>[];
    repo.authChanges.listen(events.add);
    backend.emit(FakeUser('u1', (_) async => {'role': 'resident'}));
    await pump();
    await pump();
    expect(events.single?.active, isFalse);
    expect(posts, isEmpty);
  });

  test('active false claim is reported inactive without API call', () async {
    final events = <AuthUser?>[];
    repo.authChanges.listen(events.add);
    backend.emit(FakeUser('u1', (_) async => {'active': false}));
    await pump();
    await pump();
    expect(events.single?.active, isFalse);
    expect(posts, isEmpty);
  });

  test('login with no role and no active claim self-registers then refreshes once', () async {
    final events = <AuthUser?>[];
    repo.authChanges.listen(events.add);
    var n = 0;
    final u = FakeUser('u1', (_) async => n++ == 0 ? <String, dynamic>{} : resident());
    backend.nextSignIn = u;
    await repo.login('a@b.c', 'pw');
    await pump();
    await pump();
    expect(posts.single.url.path, '/api/users/self');
    expect(posts.single.method, 'POST');
    expect(u.claimCalls, [true, true]);
    expect(events.single?.role, 'resident');
    expect(events.single?.active, isTrue);
  });

  test('self-register at login fails: stream error, no user', () async {
    final errors = <Object>[];
    final events = <AuthUser?>[];
    repo.authChanges.listen(events.add, onError: errors.add);
    apiReply = () => http.Response('{"error":"x","message":"no"}', 500);
    backend.nextSignIn = FakeUser('u1', (_) async => <String, dynamic>{});
    await repo.login('a@b.c', 'pw');
    await pump();
    await pump();
    expect(errors, hasLength(1));
    expect(events, isEmpty);
  });

  test('register success posts, refreshes claims and emits', () async {
    final events = <AuthUser?>[];
    repo.authChanges.listen(events.add);
    final u = FakeUser('u9', (_) async => resident());
    backend.nextCreated = u;
    await repo.register(email: 'a@b.c', password: 'secret1', name: 'Ana');
    await pump();
    await pump();
    expect(posts.single.body, contains('Ana'));
    expect(u.claimCalls, [true]);
    expect(events.single?.uid, 'u9');
    expect(events.single?.active, isTrue);
  });

  test('registration does not fail closed on the claim-less new account', () async {
    final events = <AuthUser?>[];
    repo.authChanges.listen(events.add);
    backend.nextCreated = FakeUser('u9', (_) async => resident());
    final f = repo.register(email: 'a@b.c', password: 'secret1', name: 'Ana');
    await f;
    await pump();
    expect(events.where((e) => e != null && !e.active), isEmpty);
  });

  test('unknown outcome (network) keeps the account, signs out, says may exist', () async {
    final u = FakeUser('u9', (_) async => resident());
    backend.nextCreated = u;
    apiThrow = const SocketException('down');
    await expectLater(
      repo.register(email: 'a@b.c', password: 'secret1', name: 'Ana'),
      throwsA(isA<AuthException>().having((e) => e.failure, 'f', AuthFailure.registrationUncertain)),
    );
    expect(u.deleted, isFalse);
    expect(backend.signOuts, 1);
  });

  test('definite failure deletes the account', () async {
    final u = FakeUser('u9', (_) async => resident());
    backend.nextCreated = u;
    apiReply = () => http.Response('{"error":"bad","message":"Nope"}', 400);
    await expectLater(
      repo.register(email: 'a@b.c', password: 'secret1', name: 'Ana'),
      throwsA(isA<AuthException>()
          .having((e) => e.failure, 'f', AuthFailure.registrationFailed)
          .having((e) => e.message, 'm', 'Nope')),
    );
    expect(u.deleted, isTrue);
  });

  test('definite failure with delete failing signs out and says incomplete', () async {
    final u = FakeUser('u9', (_) async => resident(), deleteFails: true);
    backend.nextCreated = u;
    apiReply = () => http.Response('{"error":"bad","message":"Nope"}', 500);
    await expectLater(
      repo.register(email: 'a@b.c', password: 'secret1', name: 'Ana'),
      throwsA(isA<AuthException>().having((e) => e.failure, 'f', AuthFailure.registrationIncomplete)),
    );
    expect(backend.signOuts, 1);
  });

  test('suppression resets after a failed registration', () async {
    backend.nextCreated = FakeUser('u9', (_) async => resident());
    apiReply = () => http.Response('{"error":"bad","message":"Nope"}', 400);
    try {
      await repo.register(email: 'a@b.c', password: 'secret1', name: 'Ana');
    } catch (_) {}
    final events = <AuthUser?>[];
    repo.authChanges.listen(events.add);
    await pump();
    events.clear();
    backend.emit(FakeUser('u1', (_) async => resident()));
    await pump();
    await pump();
    expect(events.single?.uid, 'u1');
  });
}
