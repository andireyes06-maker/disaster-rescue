import 'package:disaster_rescue/data/report_models.dart';
import 'package:disaster_rescue/data/services.dart';
import 'package:disaster_rescue/features/responder/incident_detail_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'report_fakes.dart';

const _report = AssignedReport(
  id: 'r1',
  type: 'flood',
  description: 'Water rising near the bridge',
  status: 'Rescue in Progress',
  reference: 'DR-AB12CD',
  addressText: 'Near the bridge',
);

ProgressEntry entry(int i) => ProgressEntry(
      id: 'e$i',
      status: 'Rescue in Progress',
      peopleRescued: i,
      note: 'Update number $i',
      at: DateTime(2026, 10, 19, 8, i),
    );

// Newest first, as the repository returns them.
List<ProgressEntry> entries(int count) => [for (var i = count; i >= 1; i--) entry(i)];

void main() {
  // A tall surface keeps the whole history on screen, so lazily built list items are found.
  Future<void> tallSurface(WidgetTester t) async {
    await t.binding.setSurfaceSize(const Size(400, 4000));
    addTearDown(() => t.binding.setSurfaceSize(null));
  }

  testWidgets('shows the newest five entries first, and the page size requested is 20', (t) async {
    await tallSurface(t);
    final env = Env();
    addTearDown(env.dispose);
    await t.pumpWidget(env.host(const IncidentDetailPage(report: _report)));
    env.responder.single.add(_report);
    env.responder.progress.add(entries(7));
    await t.pumpAndSettle();

    expect(env.responder.progressLimits, [20]);
    expect(find.text('Update number 7'), findsOneWidget);
    expect(find.text('Update number 3'), findsOneWidget);
    expect(find.text('Update number 2'), findsNothing, reason: 'only five are shown at first');
    expect(find.text('Show more entries'), findsOneWidget);

    await t.tap(find.text('Show more entries'));
    await t.pumpAndSettle();
    expect(find.text('Update number 2'), findsOneWidget);
    expect(find.text('Show more entries'), findsNothing);
    expect(find.text('Load older entries'), findsNothing, reason: 'fewer than a full page, so nothing older');
  });

  testWidgets('a full page offers older entries, which fetches the next page', (t) async {
    await tallSurface(t);
    final env = Env();
    addTearDown(env.dispose);
    await t.pumpWidget(env.host(const IncidentDetailPage(report: _report)));
    env.responder.single.add(_report);
    env.responder.progress.add(entries(20));
    await t.pumpAndSettle();

    // Show the fetched page: 5, then 10, 15, 20.
    for (var i = 0; i < 3; i++) {
      await t.tap(find.text('Show more entries'));
      await t.pumpAndSettle();
    }
    expect(find.text('Update number 1'), findsOneWidget);
    expect(find.text('Show more entries'), findsNothing);

    await t.tap(find.text('Load older entries'));
    await t.pumpAndSettle();
    expect(env.responder.progressLimits, [20, 40]);
  });

  testWidgets('no entries says so plainly', (t) async {
    await tallSurface(t);
    final env = Env();
    addTearDown(env.dispose);
    await t.pumpWidget(env.host(const IncidentDetailPage(report: _report)));
    env.responder.single.add(_report);
    env.responder.progress.add(const []);
    await t.pumpAndSettle();
    expect(find.text('No progress entries have been recorded yet.'), findsOneWidget);
  });

  testWidgets('a failed history load offers Try again, which listens once more', (t) async {
    await tallSurface(t);
    final env = Env();
    addTearDown(env.dispose);
    await t.pumpWidget(env.host(const IncidentDetailPage(report: _report)));
    env.responder.single.add(_report);
    env.responder.progress.addError(StateError('denied'));
    await t.pumpAndSettle();
    expect(find.text('Could not load the progress history. Try again.'), findsOneWidget);

    await t.tap(find.text('Try again'));
    await t.pumpAndSettle();
    expect(env.responder.progressLimits, [20, 20]);
    expect(find.text('Could not load the progress history. Try again.'), findsNothing);
  });

  testWidgets('losing access hides the report and its history; regaining it starts the history again', (t) async {
    await tallSurface(t);
    final env = Env();
    addTearDown(env.dispose);
    await t.pumpWidget(env.host(const IncidentDetailPage(report: _report)));
    env.responder.single.add(_report);
    env.responder.progress.add(entries(3));
    await t.pumpAndSettle();
    expect(find.text('Update number 3'), findsOneWidget);

    env.responder.single.add(null);
    await t.pumpAndSettle();
    expect(find.text('Progress history'), findsNothing);
    expect(find.text('Update number 3'), findsNothing);

    env.responder.single.add(_report);
    await t.pumpAndSettle();
    expect(env.responder.progressLimits, [20, 20], reason: 'the history listens again once access returns');
    env.responder.progress.add(entries(2));
    await t.pumpAndSettle();
    expect(find.text('Update number 2'), findsOneWidget);
  });
}
