import 'dart:async';

import 'package:disaster_rescue/auth/auth_repository.dart';
import 'package:disaster_rescue/features/profile/change_password_dialog.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'fakes.dart';

/// Records calls and can hold a request open, so the busy guard can be tested.
class _GatedAuth extends FakeAuthRepository {
  Completer<void>? gate;
  final calls = <(String, String)>[];

  @override
  Future<void> changePassword({required String currentPassword, required String newPassword}) async {
    calls.add((currentPassword, newPassword));
    passwordChangeCalls++;
    final failure = nextPasswordFailure;
    final wait = gate;
    if (wait != null) await wait.future;
    if (failure != null) throw PasswordChangeException(failure);
  }
}

Future<void> _open(WidgetTester tester, FakeAuthRepository auth) async {
  await tester.pumpWidget(
    Provider<AuthRepository>.value(
      value: auth,
      child: MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () => showChangePasswordDialog(context),
              child: const Text('open'),
            ),
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('open'));
  await tester.pumpAndSettle();
}

Future<void> _fill(WidgetTester tester, {required String current, required String next, required String confirm}) async {
  await tester.enterText(find.widgetWithText(TextField, 'Current password *'), current);
  await tester.enterText(find.widgetWithText(TextField, 'New password (at least 8 characters) *'), next);
  await tester.enterText(find.widgetWithText(TextField, 'Repeat the new password *'), confirm);
}

Future<void> _save(WidgetTester tester) async {
  await tester.tap(find.widgetWithText(FilledButton, 'Save password'));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('empty current password is refused on the phone with an inline error', (tester) async {
    final auth = FakeAuthRepository();
    await _open(tester, auth);
    await _fill(tester, current: '', next: 'Correct-horse-1', confirm: 'Correct-horse-1');
    await _save(tester);
    expect(find.text('Enter your current password.'), findsOneWidget);
    expect(auth.passwordChangeCalls, 0);
  });

  testWidgets('a new password shorter than 8 characters is refused with an inline error', (tester) async {
    final auth = FakeAuthRepository();
    await _open(tester, auth);
    await _fill(tester, current: 'Old-password-1', next: 'short', confirm: 'short');
    await _save(tester);
    expect(find.text('Use at least 8 characters.'), findsOneWidget);
    expect(auth.passwordChangeCalls, 0);
  });

  testWidgets('mismatched confirmation and reuse of the current password are both refused', (tester) async {
    final auth = FakeAuthRepository();
    await _open(tester, auth);
    await _fill(tester, current: 'Old-password-1', next: 'New-password-2', confirm: 'New-password-3');
    await _save(tester);
    expect(find.text('The new passwords do not match.'), findsOneWidget);

    await _fill(tester, current: 'Old-password-1', next: 'Old-password-1', confirm: 'Old-password-1');
    await _save(tester);
    expect(find.text('Choose a password different from the current one.'), findsOneWidget);
    expect(auth.passwordChangeCalls, 0);
  });

  testWidgets('a wrong current password is shown on the current password field only', (tester) async {
    final auth = FakeAuthRepository()..nextPasswordFailure = PasswordChangeFailure.wrongCurrent;
    await _open(tester, auth);
    await _fill(tester, current: 'Not-the-one', next: 'New-password-2', confirm: 'New-password-2');
    await _save(tester);
    expect(find.text('The current password is not correct.'), findsOneWidget);
    expect(find.text('Your password has been changed.'), findsNothing);
    expect(auth.passwordChangeCalls, 1);
  });

  testWidgets('a weak new password is shown on the new password field', (tester) async {
    final auth = FakeAuthRepository()..nextPasswordFailure = PasswordChangeFailure.weakPassword;
    await _open(tester, auth);
    await _fill(tester, current: 'Old-password-1', next: 'New-password-2', confirm: 'New-password-2');
    await _save(tester);
    expect(find.text('Choose a stronger password.'), findsOneWidget);
  });

  testWidgets('an ended session, offline and rate-limit failures each say what happened', (tester) async {
    final cases = {
      PasswordChangeFailure.sessionEnded: 'Your session has ended. Sign out, sign in again, then change your password.',
      PasswordChangeFailure.network: 'No connection. Check your internet and try again. If the change did not go through, your current password still works.',
      PasswordChangeFailure.tooManyAttempts: 'Too many attempts. Wait a few minutes, then try again.',
    };
    for (final entry in cases.entries) {
      final auth = FakeAuthRepository()..nextPasswordFailure = entry.key;
      await _open(tester, auth);
      await _fill(tester, current: 'Old-password-1', next: 'New-password-2', confirm: 'New-password-2');
      await _save(tester);
      expect(find.text(entry.value), findsOneWidget, reason: entry.key.name);
      // Close and reopen, so the next case starts clean.
      await tester.tap(find.widgetWithText(TextButton, 'Cancel'));
      await tester.pumpAndSettle();
    }
  });

  testWidgets('a successful change announces the result and clears the password fields', (tester) async {
    final auth = FakeAuthRepository();
    await _open(tester, auth);
    await _fill(tester, current: 'Old-password-1', next: 'New-password-2', confirm: 'New-password-2');
    await _save(tester);
    expect(find.text('Your password has been changed.'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Save password'), findsNothing);
    expect(find.text('Done'), findsOneWidget);
    expect(find.widgetWithText(TextField, 'Current password *'), findsNothing);
    expect(auth.passwordChangeCalls, 1);
  });

  testWidgets('a second tap while saving sends no second request', (tester) async {
    final auth = _GatedAuth()..gate = Completer<void>();
    await _open(tester, auth);
    await _fill(tester, current: 'Old-password-1', next: 'New-password-2', confirm: 'New-password-2');
    await tester.tap(find.widgetWithText(FilledButton, 'Save password'));
    await tester.pump();
    expect(find.text('Saving…'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, 'Saving…'), warnIfMissed: false);
    await tester.pump();
    expect(auth.calls.length, 1);
    auth.gate!.complete();
    await tester.pumpAndSettle();
    expect(find.text('Your password has been changed.'), findsOneWidget);
  });

  testWidgets('visibility toggles name the action and switch the field between hidden and shown', (tester) async {
    final auth = FakeAuthRepository();
    await _open(tester, auth);
    final field = find.widgetWithText(TextField, 'Current password *');
    expect(tester.widget<TextField>(field).obscureText, isTrue);
    await tester.tap(find.descendant(of: field, matching: find.byTooltip('Show password')));
    await tester.pump();
    expect(tester.widget<TextField>(field).obscureText, isFalse);
    expect(find.descendant(of: field, matching: find.byTooltip('Hide password')), findsOneWidget);
  });
}
