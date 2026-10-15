import 'package:disaster_rescue/data/report_models.dart';
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
