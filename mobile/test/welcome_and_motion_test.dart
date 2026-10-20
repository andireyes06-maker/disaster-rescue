import 'package:disaster_rescue/auth/role_gate.dart';
import 'package:disaster_rescue/features/auth/login_page.dart';
import 'package:disaster_rescue/features/auth/register_page.dart';
import 'package:disaster_rescue/features/welcome/welcome_page.dart';
import 'package:disaster_rescue/features/notifications/notifications_page.dart';
import 'package:disaster_rescue/theme/product_motion.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'fakes.dart';
import 'report_fakes.dart';

void main() {
  for (final width in [320.0, 390.0, 768.0, 1440.0]) {
    testWidgets('welcome reflows at $width without overflow', (t) async {
      final env = Env();
      addTearDown(env.dispose);
      t.view.physicalSize = Size(width, 900);
      t.view.devicePixelRatio = 1;
      addTearDown(t.view.reset);
      await t.pumpWidget(env.host(const WelcomePage()));
      await t.pumpAndSettle();
      expect(t.takeException(), isNull);
      expect(
        find.text('A clear report.\nA connected\nresponse.'),
        findsOneWidget,
      );
      expect(find.text('Create a resident account'), findsOneWidget);
    });
  }
  testWidgets('welcome opens registration and returning-account sign in', (
    t,
  ) async {
    final env = Env();
    addTearDown(env.dispose);
    await t.pumpWidget(env.host(const WelcomePage()));
    await t.pumpAndSettle();
    await t.tap(find.text('Create a resident account'));
    await t.pumpAndSettle();
    expect(find.byType(RegisterPage), findsOneWidget);
    await t.pageBack();
    await t.pumpAndSettle();
    await t.tap(find.text('I already have an account'));
    await t.pumpAndSettle();
    expect(find.byType(LoginPage), findsOneWidget);
    expect(find.byTooltip('Back'), findsOneWidget);
  });
  testWidgets('welcome supports true 200 percent text scaling', (t) async {
    final env = Env();
    addTearDown(env.dispose);
    t.view.physicalSize = const Size(390, 844);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    await t.pumpWidget(env.host(const WelcomePage(), textScale: 2));
    await t.pumpAndSettle();
    expect(t.takeException(), isNull);
    await t.scrollUntilVisible(find.text('Create a resident account'), 250);
    await t.pumpAndSettle();
    await t.tap(find.text('Create a resident account'));
    await t.pumpAndSettle();
    expect(find.byType(RegisterPage), findsOneWidget);
  });
  testWidgets(
    'resident can reach notifications without losing the report page',
    (t) async {
      final env = Env();
      addTearDown(env.dispose);
      await t.pumpWidget(env.host(const RoleGate()));
      env.authRepo.events.add(residentUser);
      await t.pumpAndSettle();
      expect(find.byType(ResidentHome), findsOneWidget);
      await t.tap(find.byTooltip('Notifications').first);
      await t.pump();
      env.notifications.controller.add([]);
      await t.pumpAndSettle();
      expect(find.byType(NotificationsPage), findsOneWidget);
      await t.pageBack();
      await t.pumpAndSettle();
      expect(find.text('Step 1 of 4'), findsOneWidget);
      expect(env.messaging.permissionRequests, 1);
    },
  );
  testWidgets('tab motion preserves mounted editable drafts', (t) async {
    var index = 0;
    late StateSetter update;
    await t.pumpWidget(
      MaterialApp(
        home: StatefulBuilder(
          builder: (context, set) {
            update = set;
            return Scaffold(
              body: ProductTabHost(
                index: index,
                children: const [
                  TextField(key: Key('draft')),
                  Text('Second page'),
                ],
              ),
            );
          },
        ),
      ),
    );
    await t.enterText(find.byKey(const Key('draft')), 'Keep these details');
    update(() => index = 1);
    await t.pumpAndSettle();
    update(() => index = 0);
    await t.pumpAndSettle();
    expect(find.text('Keep these details'), findsOneWidget);
  });
}
