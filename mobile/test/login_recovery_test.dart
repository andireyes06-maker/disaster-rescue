import 'package:disaster_rescue/features/auth/login_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'report_fakes.dart';
void main(){
 testWidgets('reset needs email only and gives a neutral notice', (t)async{
  final env=Env();addTearDown(env.dispose);
  await t.pumpWidget(env.host(const LoginPage()));
  await t.ensureVisible(find.text('Forgot password?'));
  await t.tap(find.text('Forgot password?'));await t.pumpAndSettle();
  expect(env.authRepo.resetEmails,isEmpty);expect(find.text('Enter a valid email address.'),findsOneWidget);
  await t.enterText(find.byType(TextFormField).first,'resident@harbor.example');
  await t.ensureVisible(find.text('Forgot password?'));await t.tap(find.text('Forgot password?'));await t.pumpAndSettle();
  expect(env.authRepo.resetEmails,['resident@harbor.example']);
  expect(find.textContaining('If an account uses this email'),findsOneWidget);
  expect(find.text('Enter your password.'),findsNothing);
 });
}
