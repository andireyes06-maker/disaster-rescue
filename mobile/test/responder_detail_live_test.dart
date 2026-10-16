import 'package:disaster_rescue/data/report_models.dart';
import 'package:disaster_rescue/features/responder/incident_detail_page.dart';
import 'package:flutter_test/flutter_test.dart';

import 'report_fakes.dart';

const _report = AssignedReport(
  id: 'r1',
  type: 'flood',
  description: 'Water rising near the bridge',
  status: 'Team Assigned',
  reference: 'DR-AB12CD',
  addressText: 'Near the bridge',
);

void main() {
  testWidgets('a status change made by dispatch while the detail is open appears live (M05)', (t) async {
    final env = Env();
    addTearDown(env.dispose);
    await t.pumpWidget(env.host(const IncidentDetailPage(report: _report)));
    await t.pumpAndSettle();
    expect(find.text('Team Assigned'), findsOneWidget);

    env.responder.single.add(const AssignedReport(
      id: 'r1', type: 'flood', description: 'Water rising near the bridge',
      status: 'Rescue in Progress', reference: 'DR-AB12CD', addressText: 'Near the bridge',
    ));
    await t.pumpAndSettle();
    expect(find.text('Rescue in Progress'), findsOneWidget);
    expect(find.text('Team Assigned'), findsNothing);
  });

  testWidgets('when the report is removed or reassigned, its details are hidden (M05)', (t) async {
    final env = Env();
    addTearDown(env.dispose);
    await t.pumpWidget(env.host(const IncidentDetailPage(report: _report)));
    await t.pumpAndSettle();
    env.responder.single.add(null);
    await t.pumpAndSettle();
    expect(find.text('Water rising near the bridge'), findsNothing);
    expect(find.textContaining('no longer assigned to your team'), findsOneWidget);
    expect(find.text('Acknowledge'), findsNothing);
  });

  testWidgets('a refused read after reassignment also hides the details (M05)', (t) async {
    final env = Env();
    addTearDown(env.dispose);
    await t.pumpWidget(env.host(const IncidentDetailPage(report: _report)));
    await t.pumpAndSettle();
    env.responder.single.addError(Exception('permission-denied'));
    await t.pumpAndSettle();
    expect(find.text('Water rising near the bridge'), findsNothing);
    expect(find.textContaining('no longer assigned to your team'), findsOneWidget);
  });

  testWidgets('a resolved report offers no acknowledge or new operation update (M05)', (t) async {
    final env = Env();
    addTearDown(env.dispose);
    await t.pumpWidget(env.host(const IncidentDetailPage(report: _report)));
    await t.pumpAndSettle();
    env.responder.single.add(const AssignedReport(
      id: 'r1', type: 'flood', description: 'Water rising near the bridge',
      status: 'Resolved', reference: 'DR-AB12CD',
    ));
    await t.pumpAndSettle();
    expect(find.text('Add operation update'), findsNothing);
  });
}
