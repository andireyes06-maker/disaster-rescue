import 'package:disaster_rescue/auth/auth_repository.dart';
import 'package:disaster_rescue/features/profile/profile_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'report_fakes.dart';

void main() {
  testWidgets('profile uses the person name instead of Your account', (
    t,
  ) async {
    final env = Env();
    addTearDown(env.dispose);
    t.view.physicalSize = const Size(390, 844);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    const user = AuthUser(uid: 'u1', role: 'responder', active: true);
    await t.pumpWidget(env.host(const ProfilePage(user: user)));
    await t.pumpAndSettle();
    expect(find.text('Your account'), findsNothing);
    expect(find.text('Ana Reyes'), findsOneWidget);
    expect(find.text('No team assigned'), findsOneWidget);
  });
}
