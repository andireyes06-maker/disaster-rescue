import 'package:disaster_rescue/data/report_models.dart';
import 'package:disaster_rescue/features/my_reports/status_timeline.dart';
import 'package:disaster_rescue/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget wrap(Widget c) => MaterialApp(theme: AppTheme.light, home: Scaffold(body: SingleChildScrollView(child: c)));

void main() {
  for (var i = 0; i < workflowStatuses.length; i++) {
    final s = workflowStatuses[i];
    testWidgets('timeline marks $s as Current', (t) async {
      await t.pumpWidget(wrap(StatusTimeline(status: s)));
      expect(find.text('Current'), findsOneWidget);
      expect(find.descendant(of: find.byKey(Key('timeline-$s')), matching: find.text('Current')), findsOneWidget);
      expect(find.text('Done'), findsNWidgets(i));
      expect(find.text('Pending'), findsNWidgets(workflowStatuses.length - i - 1));
    });
  }

  for (final s in terminalSideStatuses) {
    testWidgets('$s is shown as a terminal note, not a timeline position', (t) async {
      await t.pumpWidget(wrap(StatusTimeline(status: s)));
      expect(find.byKey(const Key('terminal-note')), findsOneWidget);
      expect(find.text('Current'), findsNothing);
    });
  }

  testWidgets('timeline fits at 200 percent text', (t) async {
    t.view.physicalSize = const Size(400, 900);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    await t.pumpWidget(MaterialApp(
      theme: AppTheme.light,
      builder: (c, w) => MediaQuery(data: MediaQuery.of(c).copyWith(textScaler: const TextScaler.linear(2)), child: w!),
      home: const Scaffold(body: SingleChildScrollView(child: StatusTimeline(status: 'Team Assigned'))),
    ));
    expect(t.takeException(), isNull);
  });
}
