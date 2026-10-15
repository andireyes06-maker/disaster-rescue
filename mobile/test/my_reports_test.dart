import 'package:disaster_rescue/data/api_client.dart';
import 'package:disaster_rescue/data/report_models.dart';
import 'package:disaster_rescue/features/my_reports/my_reports_page.dart';
import 'package:disaster_rescue/features/profile/profile_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'fakes.dart';
import 'report_fakes.dart';

late Env env;

ReportSummary rep(String id, String status, {String desc = 'Water rising', int day = 1}) => ReportSummary(
    id: id, type: 'flood', description: desc, status: status, createdAt: DateTime(2026, 10, day, 9, 30));

Future<void> open(WidgetTester t, {double scale = 1.0}) async {
  t.view.physicalSize = const Size(800, 1800);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
  await t.pumpWidget(env.host(const MyReportsPage(uid: 'u1'), textScale: scale));
  await t.pump();
}

void main() {
  setUp(() => env = Env());
  tearDown(() => env.dispose());

  testWidgets('empty states for both tabs', (t) async {
    await open(t);
    env.reports.controller.add([]);
    await t.pump();
    expect(find.text('No active reports.'), findsOneWidget);
    await t.tap(find.text('History'));
    await t.pumpAndSettle();
    expect(find.text('No past reports yet.'), findsOneWidget);
  });

  testWidgets('Active and History split by status, newest first', (t) async {
    await open(t);
    env.reports.controller.add([
      rep('a', 'Submitted', desc: 'older active', day: 1),
      rep('b', 'Team Assigned', desc: 'newer active', day: 5),
      rep('c', 'Resolved', desc: 'done one'),
      rep('d', 'Cancelled', desc: 'cancelled one'),
      rep('e', 'Rejected', desc: 'rejected one'),
    ]);
    await t.pump();
    expect(find.text('newer active'), findsOneWidget);
    expect(find.text('older active'), findsOneWidget);
    expect(find.text('done one'), findsNothing);
    expect(t.getTopLeft(find.text('newer active')).dy, lessThan(t.getTopLeft(find.text('older active')).dy));
    expect(find.text('Team Assigned'), findsOneWidget);
    await t.tap(find.text('History'));
    await t.pumpAndSettle();
    expect(find.text('done one'), findsOneWidget);
    expect(find.text('cancelled one'), findsOneWidget);
    expect(find.text('rejected one'), findsOneWidget);
    expect(find.text('newer active'), findsNothing);
    expect(find.text('Resolved'), findsOneWidget);
  });

  testWidgets('Cancel is visible only for Submitted and calls cancel', (t) async {
    await open(t);
    env.reports.controller.add([rep('a', 'Submitted'), rep('b', 'Verified')]);
    await t.pump();
    await t.tap(find.text('Verified'));
    await t.pumpAndSettle();
    expect(find.text('Cancel report'), findsNothing);
    expect(find.text('Current'), findsOneWidget);
    await t.pageBack();
    await t.pumpAndSettle();
    await t.tap(find.text('Submitted'));
    await t.pumpAndSettle();
    await t.tap(find.widgetWithText(OutlinedButton, 'Cancel report'));
    await t.pumpAndSettle();
    expect(find.text('Cancel this report?'), findsOneWidget);
    await t.tap(find.text('Yes, cancel it'));
    await t.pumpAndSettle();
    expect(env.reports.cancelled, ['a']);
    expect(find.text('Your report was cancelled.'), findsOneWidget);
  });

  testWidgets('keeping the report does not cancel', (t) async {
    await open(t);
    env.reports.controller.add([rep('a', 'Submitted')]);
    await t.pump();
    await t.tap(find.text('Submitted'));
    await t.pumpAndSettle();
    await t.tap(find.widgetWithText(OutlinedButton, 'Cancel report'));
    await t.pumpAndSettle();
    await t.tap(find.text('Keep report'));
    await t.pumpAndSettle();
    expect(env.reports.cancelled, isEmpty);
  });

  testWidgets('409 on cancel says it can no longer be cancelled', (t) async {
    await open(t);
    env.reports.cancelError = const ApiException(409, 'illegal_transition', 'x');
    env.reports.controller.add([rep('a', 'Submitted')]);
    await t.pump();
    await t.tap(find.text('Submitted'));
    await t.pumpAndSettle();
    await t.tap(find.widgetWithText(OutlinedButton, 'Cancel report'));
    await t.pumpAndSettle();
    await t.tap(find.text('Yes, cancel it'));
    await t.pumpAndSettle();
    expect(find.text('This report can no longer be cancelled.'), findsOneWidget);
  });

  testWidgets('detail updates live when the status changes', (t) async {
    await open(t);
    env.reports.controller.add([rep('a', 'Submitted')]);
    await t.pump();
    await t.tap(find.text('Submitted'));
    await t.pumpAndSettle();
    expect(find.text('Cancel report'), findsOneWidget);
    env.reports.controller.add([rep('a', 'Under Verification')]);
    await t.pumpAndSettle();
    expect(find.text('Cancel report'), findsNothing);
  });

  testWidgets('renders at 200 percent text without overflow', (t) async {
    t.view.physicalSize = const Size(400, 900);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    await t.pumpWidget(env.host(const MyReportsPage(uid: 'u1'), textScale: 2.0));
    await t.pump();
    env.reports.controller.add([rep('a', 'Rescue in Progress', desc: 'A long description ' * 6)]);
    await t.pump();
    await t.tap(find.textContaining('A long description'));
    await t.pumpAndSettle();
    expect(t.takeException(), isNull);
  });

  testWidgets('profile shows name, email, phone, privacy notice and logs out', (t) async {
    t.view.physicalSize = const Size(800, 1800);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    env.authRepo.events.add(residentUser);
    await t.pumpWidget(env.host(const ProfilePage(user: residentUser)));
    await t.pumpAndSettle();
    expect(find.text('Ana Reyes'), findsOneWidget);
    expect(find.text('a@b.c'), findsOneWidget);
    expect(find.text('0917 123 4567'), findsOneWidget);
    expect(find.textContaining('only to coordinate rescue'), findsOneWidget);
    await t.tap(find.text('Log out'));
    await t.pump();
    expect(env.authRepo.logoutCalls, 1);
  });
}
