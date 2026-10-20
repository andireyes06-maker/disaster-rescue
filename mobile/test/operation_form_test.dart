import 'package:disaster_rescue/features/responder/operation_form_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

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
      await t.tap(find.text('Save update'));
      await t.pump();
      expect(
        find.text('Enter a whole number from 0 to 10000.'),
        findsOneWidget,
      );
      expect(env.responder.updates, isEmpty);
    });
  }

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
    await t.tap(find.text('Save update'));
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
    await t.tap(find.text('Save update'));
    await t.pumpAndSettle();
    expect(env.responder.updates, hasLength(1));
    final (id, update) = env.responder.updates.single;
    expect(id, 'r1');
    expect(update.status, 'Resolved');
    expect(update.peopleRescued, 12);
    expect(update.note, 'Evacuated to the school');
  });
}
