import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:disaster_rescue/auth/idle_sign_out.dart';

void main() {
  testWidgets('signs the person out after the idle period with no touches', (t) async {
    var signedOut = 0;
    await t.pumpWidget(MaterialApp(
      home: IdleSignOut(
        timeout: const Duration(minutes: 30),
        onIdle: () async => signedOut++,
        child: const Text('home'),
      ),
    ));
    await t.pump(const Duration(minutes: 29));
    expect(signedOut, 0);
    await t.pump(const Duration(minutes: 2));
    expect(signedOut, 1);
  });

  testWidgets('a touch restarts the idle period', (t) async {
    var signedOut = 0;
    await t.pumpWidget(MaterialApp(
      home: IdleSignOut(
        timeout: const Duration(minutes: 30),
        onIdle: () async => signedOut++,
        child: const Text('home'),
      ),
    ));
    await t.pump(const Duration(minutes: 20));
    await t.tap(find.text('home'));
    await t.pump(const Duration(minutes: 20));
    expect(signedOut, 0, reason: 'twenty minutes after the touch is still inside the period');
    await t.pump(const Duration(minutes: 11));
    expect(signedOut, 1);
  });
}
