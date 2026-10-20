import 'dart:async';
import 'package:disaster_rescue/data/report_models.dart';
import 'package:disaster_rescue/data/api_client.dart';
import 'package:disaster_rescue/auth/auth_repository.dart';
import 'package:disaster_rescue/features/notifications/notifications_page.dart';
import 'package:disaster_rescue/features/notifications/push_registration.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'report_fakes.dart';

AppNotification note(
  String id, {
  required bool read,
  String title = 'New assignment',
}) => AppNotification(
  id: id,
  title: title,
  body: 'Report DR-AB12CD was assigned to your team',
  reportId: 'r1',
  read: read,
  createdAt: DateTime(2026, 10, 15, 9, 30),
);

void main() {
  late Env env;
  setUp(() => env = Env());
  tearDown(() => env.dispose());

  testWidgets(
    'unread rows are styled differently and tapping one marks it read',
    (t) async {
      await t.pumpWidget(env.host(const NotificationsPage(uid: 'u1')));
      env.notifications.controller.add([
        note('n1', read: false),
        note('n2', read: true, title: 'Team assigned'),
      ]);
      await t.pump();

      expect(find.byKey(const ValueKey('unread-n1')), findsOneWidget);
      expect(find.byKey(const ValueKey('unread-n2')), findsNothing);
      expect(
        t.widget<Text>(find.text('New assignment')).style?.fontWeight,
        FontWeight.w700,
      );
      expect(
        t.widget<Text>(find.text('Team assigned')).style?.fontWeight,
        isNot(FontWeight.w700),
      );

      await t.tap(find.text('New assignment'));
      await t.pump();
      expect(env.notifications.marked, ['n1']);
    },
  );

  testWidgets('read notifications still open their report without a second read write', (t) async {
    await t.pumpWidget(env.host(const NotificationsPage(uid: 'u1')));
    env.authRepo.events.add(const AuthUser(uid: 'u1', role: 'resident', active: true));
    env.notifications.controller.add([note('read-note', read: true)]);
    await t.pumpAndSettle();
    await t.tap(find.text('New assignment'));await t.pump();
    env.reports.controller.add([const ReportSummary(id:'r1',type:'flood',description:'Linked resident report',status:'Submitted')]);
    await t.pumpAndSettle();
    expect(find.text('Linked resident report'), findsOneWidget);
    expect(env.notifications.marked, isEmpty);
    env.authRepo.events.add(null);await t.pumpAndSettle();
    expect(find.text('Linked resident report'), findsNothing);
    expect(find.text('This report is not available.'), findsOneWidget);
  });
  testWidgets('closed responder notification is read-only and loses access on team change', (t) async {
    await t.pumpWidget(env.host(const NotificationsPage(uid: 'u1')));
    env.authRepo.events.add(const AuthUser(uid:'u1',role:'responder',team:'team-a',active:true));
    env.notifications.controller.add([note('closed-note',read:false)]);await t.pumpAndSettle();
    await t.tap(find.text('New assignment'));await t.pump();
    env.responder.single.add(const AssignedReport(id:'r1',type:'flood',description:'Closed linked incident',status:'Closed',assignedTeamId:'team-a'));
    await t.pumpAndSettle();expect(find.text('Closed linked incident'), findsOneWidget);
    expect(find.text('Acknowledge'), findsNothing);expect(find.text('Add operation update'), findsNothing);
    env.authRepo.events.add(const AuthUser(uid:'u1',role:'responder',team:'other-team',active:true));await t.pumpAndSettle();
    expect(find.text('Closed linked incident'), findsNothing);
  });

  group('PushRegistration', () {
    late FakeApi api;
    late FakePushMessaging messaging;
    late PushRegistration push;
    setUp(() {
      api = FakeApi();
      messaging = FakePushMessaging();
      push = PushRegistration(api, messaging);
    });
    tearDown(() => messaging.refresh.close());

    test('init requests permission and posts the token to /devices', () async {
      await push.init();
      expect(messaging.permissionRequests, 1);
      expect(api.calls, hasLength(1));
      expect(api.calls.single.$1, 'POST');
      expect(api.calls.single.$2, '/devices');
      expect(api.calls.single.$3, {'token': 'tok-1'});
    });

    test('failed token refresh is caught, visible and retryable', () async {
      await push.init();
      api.sendError = const ApiException(503, 'unavailable', 'Try again');
      messaging.refresh.add('tok-new');
      await Future<void>.delayed(Duration.zero);
      expect(push.registrationPending.value, isTrue);
      api.sendError = null;
      await push.retry();
      expect(api.calls.last.$3, {'token': 'tok-new'});
      expect(push.registrationPending.value, isFalse);
      await push.unregister();
    });

    test('sign-out while permission is pending cannot register the next account', () async {
      final permission = Completer<bool>(); messaging.permissionResult = permission.future;
      final init = push.init(); await push.unregister(); permission.complete(true); await init;
      expect(api.calls, isEmpty);
    });
    test('token acquisition failure is visible without escaping init', () async {
      messaging.tokenError = StateError('provider unavailable');
      await expectLater(push.init(), completes);
      expect(push.registrationPending.value, isTrue); expect(api.calls, isEmpty);
    });

    test('a refreshed token is posted too', () async {
      await push.init();
      messaging.refresh.add('tok-2');
      await Future<void>.delayed(Duration.zero);
      expect(api.calls.last.$1, 'POST');
      expect(api.calls.last.$2, '/devices');
      expect(api.calls.last.$3, {'token': 'tok-2'});
    });

    test(
      'unregister deletes the registered token and makes no call when none was registered',
      () async {
        await push.unregister();
        expect(api.calls, isEmpty);
        await push.init();
        await push.unregister();
        expect(api.calls.last.$1, 'DELETE');
      expect(api.calls.last.$2, '/devices/tok-1');
      },
    );
  });
}
