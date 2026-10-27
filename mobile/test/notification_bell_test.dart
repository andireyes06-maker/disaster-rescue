import 'package:disaster_rescue/data/services.dart';
import 'package:disaster_rescue/features/notifications/notification_bell.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'report_fakes.dart';

Future<FakeNotificationsRepository> _pump(WidgetTester tester, {required String uid, bool reduceMotion = false}) async {
  final repo = FakeNotificationsRepository();
  await tester.pumpWidget(
    Provider<NotificationsRepository>.value(
      value: repo,
      child: MaterialApp(
        home: MediaQuery(
          data: MediaQueryData(disableAnimations: reduceMotion),
          child: Scaffold(
            body: NotificationBell(
              uid: uid,
              builder: (context, unread) => IconButton(
                tooltip: unread ? 'Notifications, new' : 'Notifications',
                icon: UnreadDot(unread: unread, icon: const Icon(Icons.notifications_outlined)),
                onPressed: () {},
              ),
            ),
          ),
        ),
      ),
    ),
  );
  return repo;
}

double _dotScale(WidgetTester tester) => tester.widget<AnimatedScale>(find.byType(AnimatedScale)).scale;

void main() {
  testWidgets('the dot follows the unread stream live, and the label says when something is new', (tester) async {
    final repo = await _pump(tester, uid: 'resident-1');
    expect(find.byTooltip('Notifications'), findsOneWidget);
    expect(_dotScale(tester), 0);

    repo.unreadController.add(true);
    await tester.pumpAndSettle();
    expect(find.byTooltip('Notifications, new'), findsOneWidget);
    expect(_dotScale(tester), 1);

    // Reading one item does not clear it while another is still unread.
    repo.unreadController.add(true);
    await tester.pumpAndSettle();
    expect(_dotScale(tester), 1);

    repo.unreadController.add(false);
    await tester.pumpAndSettle();
    expect(find.byTooltip('Notifications'), findsOneWidget);
    expect(_dotScale(tester), 0);
  });

  testWidgets('switching accounts never shows the previous account value', (tester) async {
    final repo = await _pump(tester, uid: 'responder-a');
    repo.unreadController.add(true);
    await tester.pumpAndSettle();
    expect(_dotScale(tester), 1);

    await tester.pumpWidget(
      Provider<NotificationsRepository>.value(
        value: repo,
        child: MaterialApp(
          home: Scaffold(
            body: NotificationBell(
              uid: 'responder-b',
              builder: (context, unread) => UnreadDot(unread: unread, icon: const Icon(Icons.notifications_outlined)),
            ),
          ),
        ),
      ),
    );
    await tester.pump();
    expect(_dotScale(tester), 0, reason: 'no value carries over before the new account reports');
    expect(repo.unreadAccounts, ['responder-a', 'responder-b']);
  });

  testWidgets('a stream error shows no dot rather than claiming something is new', (tester) async {
    final repo = await _pump(tester, uid: 'resident-1');
    repo.unreadController.addError(Exception('permission denied'));
    await tester.pumpAndSettle();
    expect(_dotScale(tester), 0);
  });

  testWidgets('with reduced motion the dot changes at once, without an animation', (tester) async {
    final repo = await _pump(tester, uid: 'resident-1', reduceMotion: true);
    repo.unreadController.add(true);
    await tester.pump();
    final animated = tester.widget<AnimatedScale>(find.byType(AnimatedScale));
    expect(animated.duration, Duration.zero);
    expect(_dotScale(tester), 1);
  });
}
