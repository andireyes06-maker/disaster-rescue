import 'package:disaster_rescue/features/responder/operation_form_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'confirm_helper.dart';

import 'report_fakes.dart';

void main() {
  late Env env;
  setUp(() => env = Env());
  tearDown(() => env.dispose());

  Future<void> open(WidgetTester t) async {
    await t.pumpWidget(env.host(const OperationFormPage(reportId: 'r1')));
    await t.pump();
  }

  for (final bad in ['-1', '2.5', 'many', '10001']) {
    testWidgets('blocks people rescued "$bad" with a message and no API call', (
      t,
    ) async {
      await open(t);
      await t.enterText(find.byKey(const Key('peopleRescued')), bad);
      await tapConfirmed(t, 'Save update');
      await t.pump();
      expect(
        find.text('Enter a whole number from 0 to 10000.'),
        findsOneWidget,
      );
      expect(env.responder.updates, isEmpty);
    });
  }

  testWidgets('photos are optional: the form offers them and saves without any', (t) async {
    await open(t);
    await t.scrollUntilVisible(find.text('Photos (optional, up to 5)'), 200, scrollable: find.byType(Scrollable).first);
    expect(find.text('Photos (optional, up to 5)'), findsOneWidget);
    await t.enterText(find.byKey(const Key('peopleRescued')), '2');
    await tapConfirmed(t, 'Save update');
    await t.pumpAndSettle();
    expect(env.responder.updates, hasLength(1));
    expect(env.responder.updatePhotoCounts, [0]);
  });

  testWidgets('an attached photo is sent with the update', (t) async {
    await open(t);
    await t.enterText(find.byKey(const Key('peopleRescued')), '2');
    await t.scrollUntilVisible(find.text('Choose existing photos'), 200, scrollable: find.byType(Scrollable).first);
    await t.pumpAndSettle();
    await t.tap(find.text('Choose existing photos'));
    await t.pumpAndSettle();
    expect(find.byKey(const ValueKey('photo-chip-0')), findsOneWidget);
    await tapConfirmed(t, 'Save update');
    await t.pumpAndSettle();
    expect(env.responder.updatePhotoCounts, [1]);
  });

  testWidgets('Team Assigned offers no Resolved segment', (t) async {
    await t.pumpWidget(env.host(OperationFormPage(
      reportId: 'r1',
      reportStatus: ValueNotifier<String?>('Team Assigned'),
    )));
    await t.pump();
    expect(find.text('Resolved'), findsNothing);
    expect(find.text('Rescue in Progress'), findsOneWidget);
  });

  testWidgets('a live change to Team Assigned moves a Resolved selection to a valid status', (t) async {
    final status = ValueNotifier<String?>('Rescue in Progress');
    await t.pumpWidget(env.host(OperationFormPage(reportId: 'r1', reportStatus: status)));
    await t.pump();
    await t.tap(find.text('Resolved'));
    await t.pump();
    status.value = 'Team Assigned';
    await t.pumpAndSettle();
    expect(find.text('Resolved'), findsNothing);
    await t.enterText(find.byKey(const Key('peopleRescued')), '3');
    await tapConfirmed(t, 'Save update');
    await t.pumpAndSettle();
    expect(env.responder.updates.single.$2.status, 'Rescue in Progress');
  });

  testWidgets('a status with no valid transition shows a notice and no form', (t) async {
    await t.pumpWidget(env.host(OperationFormPage(
      reportId: 'r1',
      reportStatus: ValueNotifier<String?>('Resolved'),
    )));
    await t.pump();
    expect(find.text('This report is closed, so no more updates can be added.'), findsOneWidget);
    expect(find.text('Save update'), findsNothing);
  });

  testWidgets('submits a valid update with status, peopleRescued and note', (
    t,
  ) async {
    await open(t);
    await t.tap(find.text('Resolved'));
    await t.enterText(find.byKey(const Key('peopleRescued')), '12');
    await t.enterText(find.byKey(const Key('note')), 'Evacuated to the school');
    await tapConfirmed(t, 'Save update');
    await t.pumpAndSettle();
    expect(env.responder.updates, hasLength(1));
    final (id, update) = env.responder.updates.single;
    expect(id, 'r1');
    expect(update.status, 'Resolved');
    expect(update.peopleRescued, 12);
    expect(update.note, 'Evacuated to the school');
  });
}
