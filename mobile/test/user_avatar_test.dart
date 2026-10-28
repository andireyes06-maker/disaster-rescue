import 'package:disaster_rescue/widgets/user_avatar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _wrap(Widget child) => MaterialApp(home: Scaffold(body: Center(child: child)));

void main() {
  testWidgets('UserAvatar shows initials without a photo', (t) async {
    await t.pumpWidget(_wrap(const UserAvatar(name: 'Maria Santos Cruz')));
    expect(find.text('MS'), findsOneWidget);
    expect(find.byType(Image), findsNothing);
  });

  testWidgets('UserAvatar shows a neutral icon when there is no name or photo', (t) async {
    await t.pumpWidget(_wrap(const UserAvatar(name: '  ')));
    expect(find.byIcon(Icons.person_outline_rounded), findsOneWidget);
  });

  testWidgets('UserAvatar falls back to initials on an image error', (t) async {
    // The test HTTP client answers every request with an error, like a broken or expired photo link.
    await t.pumpWidget(
      _wrap(const UserAvatar(name: 'Ana Reyes', photoUrl: 'https://img.example/broken.jpg')),
    );
    expect(find.byType(Image), findsOneWidget);
    await t.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 50)));
    await t.pump();
    expect(find.text('AR'), findsOneWidget);
    expect(t.takeException(), isNull);
  });

  testWidgets('UserAvatar is decoration: hidden from screen readers', (t) async {
    final handle = t.ensureSemantics();
    await t.pumpWidget(_wrap(const UserAvatar(name: 'Ana Reyes')));
    expect(find.bySemanticsLabel('AR'), findsNothing);
    handle.dispose();
  });
}
