import 'package:disaster_rescue/auth/auth_controller.dart';
import 'package:disaster_rescue/auth/auth_repository.dart';
import 'package:disaster_rescue/auth/role_gate.dart';
import 'package:disaster_rescue/features/auth/login_page.dart';
import 'package:disaster_rescue/features/responder/assigned_list_page.dart';
import 'package:disaster_rescue/features/auth/register_page.dart';
import 'package:disaster_rescue/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'fakes.dart';
import 'report_fakes.dart';

const disclaimer =
    'Submitting a report through this app does not automatically guarantee immediate rescue. If you are in danger, call your local emergency hotline.';

Widget host(AuthController c, Widget child) =>
    ChangeNotifierProvider<AuthController>.value(
      value: c,
      child: MaterialApp(theme: AppTheme.light, home: child),
    );

AuthUser withRole(String role) =>
    AuthUser(uid: 'u', email: 'e@e.e', role: role, team: null, active: true);

void main() {
  late FakeAuthRepository repo;
  late AuthController c;
  setUp(() {
    repo = FakeAuthRepository();
    c = AuthController(repo);
  });
  tearDown(() => c.dispose());

  testWidgets('loading shows spinner', (t) async {
    await t.pumpWidget(host(c, const RoleGate()));
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });

  testWidgets('signed out shows login', (t) async {
    await t.pumpWidget(host(c, const RoleGate()));
    repo.events.add(null);
    await t.pump();
    await t.pump();
    expect(find.byType(LoginPage), findsOneWidget);
  });

  testWidgets('resident gets the report, my reports, profile navigation', (
    t,
  ) async {
    final env = Env();
    addTearDown(env.dispose);
    await t.pumpWidget(env.host(const RoleGate()));
    env.authRepo.events.add(withRole('resident'));
    await t.pump();
    env.reports.controller.add(const []);
    await t.pumpAndSettle();
    expect(find.byType(ResidentHome), findsOneWidget);
    expect(find.text('Step 1 of 4'), findsOneWidget);
    for (final label in ['Report', 'My Reports', 'Profile']) {
      expect(
        find.descendant(
          of: find.byType(NavigationBar),
          matching: find.text(label),
        ),
        findsOneWidget,
      );
    }
    expect(find.byType(NavigationDestination), findsNWidgets(3));
  });

  testWidgets('responder lands on the assigned list', (t) async {
    final env = Env();
    addTearDown(env.dispose);
    await t.pumpWidget(env.host(const RoleGate()));
    env.authRepo.events.add(
      const AuthUser(
        uid: 'u',
        email: 'e@e.e',
        role: 'responder',
        team: 'team-1',
        active: true,
      ),
    );
    await t.pump();
    env.responder.assigned.add(const []);
    env.notifications.controller.add(const []);
    await t.pumpAndSettle();
    expect(find.byType(ResponderHome), findsOneWidget);
    expect(find.byType(AssignedListPage), findsOneWidget);
    expect(find.text('No assigned reports right now.'), findsOneWidget);
  });

  for (final role in ['dispatcher', 'dmo']) {
    testWidgets('$role is told to use the web dashboard', (t) async {
      await t.pumpWidget(host(c, const RoleGate()));
      repo.events.add(withRole(role));
      await t.pump();
      await t.pump();
      expect(find.text('Use the web dashboard'), findsOneWidget);
      await t.tap(find.text('Log out'));
      await t.pump();
      expect(repo.logoutCalls, 1);
    });
  }

  testWidgets('login page shows disclaimer and error message', (t) async {
    await t.pumpWidget(host(c, const LoginPage()));
    expect(find.text(disclaimer), findsOneWidget);
    repo.loginError = const AuthException(AuthFailure.invalidCredentials);
    await t.enterText(find.widgetWithText(TextFormField, 'Email *'), 'a@b.c');
    await t.enterText(
      find.widgetWithText(TextFormField, 'Password *'),
      'wrongpass',
    );
    await t.tap(find.widgetWithText(FilledButton, 'Log in'));
    await t.pump();
    await t.pump();
    expect(find.textContaining('email or password'), findsOneWidget);
    expect(find.byIcon(Icons.error_outline), findsOneWidget);
  });

  testWidgets('register marks name, email and password as required, phone as optional (F08)', (t) async {
    await t.pumpWidget(host(c, const RegisterPage()));
    expect(find.bySemanticsLabel('Full name, required'), findsOneWidget);
    expect(find.bySemanticsLabel('Email, required'), findsOneWidget);
    expect(find.bySemanticsLabel('Password, required'), findsOneWidget);
    expect(find.bySemanticsLabel(RegExp('Phone.*required')), findsNothing);
    expect(find.widgetWithText(TextFormField, 'Full name *'), findsOneWidget);
  });

  testWidgets('password visibility toggle has accessible label', (t) async {
    await t.pumpWidget(host(c, const LoginPage()));
    expect(find.byTooltip('Show password'), findsOneWidget);
    await t.tap(find.byTooltip('Show password'));
    await t.pump();
    expect(find.byTooltip('Hide password'), findsOneWidget);
  });

  testWidgets('register requires consent checkbox before submit', (t) async {
    await t.pumpWidget(host(c, const RegisterPage()));
    expect(find.text(disclaimer), findsOneWidget);
    expect(
      find.text(
        'We use your name, phone number and location only to coordinate rescue. See the privacy notice.',
      ),
      findsOneWidget,
    );
    FilledButton button() => t.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'Create account'),
    );
    await t.enterText(find.widgetWithText(TextFormField, 'Full name *'), 'Ana');
    await t.enterText(find.widgetWithText(TextFormField, 'Email *'), 'a@b.c');
    await t.enterText(
      find.widgetWithText(TextFormField, 'Password *'),
      'longenough1',
    );
    await t.pump();
    expect(button().onPressed, isNull);
    await t.ensureVisible(find.byType(Checkbox));
    await t.tap(find.byType(Checkbox));
    await t.pump();
    expect(button().onPressed, isNotNull);
  });
}
