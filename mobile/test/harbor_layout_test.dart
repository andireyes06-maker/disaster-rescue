import 'package:disaster_rescue/auth/role_gate.dart';
import 'package:disaster_rescue/auth/auth_repository.dart';
import 'package:disaster_rescue/data/report_models.dart';
import 'package:disaster_rescue/features/profile/profile_page.dart';
import 'package:disaster_rescue/features/responder/operation_form_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'fakes.dart';
import 'report_fakes.dart';

void main() {
  late Env env;
  setUp(() => env = Env());
  tearDown(() => env.dispose());

  Future<void> viewport(WidgetTester t, {double width = 390}) async {
    t.view.physicalSize = Size(width, 900);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
  }

  Future<void> tap(WidgetTester t, String label) async {
    final target = find.text(label);
    await t.ensureVisible(target);
    await t.pumpAndSettle();
    await t.tap(target);
    await t.pumpAndSettle();
  }

  testWidgets('a resident draft survives dock to rail and back', (t) async {
    await viewport(t);
    await t.pumpWidget(env.host(const RoleGate()));
    env.authRepo.events.add(residentUser);
    await t.pumpAndSettle();
    await tap(t, 'Flood');
    await tap(t, 'Next');
    await tap(t, 'Use my current location');
    await tap(t, 'Next');
    await t.enterText(
      find.byKey(const Key('description')),
      'Keep my report details',
    );
    t.view.physicalSize = const Size(1440, 900);
    await t.pumpAndSettle();
    expect(find.byType(NavigationRail), findsOneWidget);
    expect(find.text('Keep my report details'), findsOneWidget);
    t.view.physicalSize = const Size(390, 900);
    await t.pumpAndSettle();
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.text('Keep my report details'), findsOneWidget);
    expect(t.takeException(), isNull);
  });

  testWidgets('responder profile is reachable from the dock', (t) async {
    await viewport(t);
    await t.pumpWidget(env.host(const RoleGate()));
    env.authRepo.events.add(
      const AuthUser(
        uid: 'r1',
        email: 'r@test.example',
        role: 'responder',
        team: 't1',
        active: true,
      ),
    );
    await t.pumpAndSettle();
    await tap(t, 'Profile');
    expect(find.byType(ProfilePage), findsOneWidget);
    expect(find.text('Responder profile'), findsOneWidget);
    expect(t.takeException(), isNull);
  });

  testWidgets(
    'update controls and validation remain reachable at 200 percent',
    (t) async {
      await viewport(t);
      await t.pumpWidget(
        env.host(const OperationFormPage(reportId: 'r1'), textScale: 2),
      );
      await t.pumpAndSettle();
      await t.scrollUntilVisible(
        find.text('Save update'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await t.pumpAndSettle();
      await t.tap(find.text('Save update'));
      await t.pumpAndSettle();
      expect(env.responder.updateKeys, isEmpty);
      expect(find.text(peopleRescuedError), findsOneWidget);
      expect(t.takeException(), isNull);
    },
  );
}
