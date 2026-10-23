import 'package:disaster_rescue/auth/auth_repository.dart';
import 'package:disaster_rescue/auth/role_gate.dart';
import 'package:disaster_rescue/data/report_models.dart';
import 'package:flutter_test/flutter_test.dart';

import 'report_fakes.dart';

// Responders work the queue oldest first, the same rule as the API and the website (2026-10-23).
void main() {
  testWidgets('responder assignments list the oldest report first', (t) async {
    final env = Env();
    addTearDown(env.dispose);
    await t.pumpWidget(env.host(const RoleGate()));
    env.authRepo.events.add(
      const AuthUser(uid: 'u', email: 'e@e.e', role: 'responder', team: 'team-1', active: true),
    );
    await t.pump();
    env.responder.assigned.add([
      AssignedReport(
        id: 'new', type: 'flood', description: 'Newer report here', status: 'Team Assigned',
        createdAt: DateTime.utc(2026, 10, 3),
      ),
      AssignedReport(
        id: 'old', type: 'flood', description: 'Older report here', status: 'Team Assigned',
        createdAt: DateTime.utc(2026, 10, 1),
      ),
    ]);
    env.notifications.controller.add(const []);
    await t.pumpAndSettle();
    final oldY = t.getTopLeft(find.textContaining('Older report here')).dy;
    final newY = t.getTopLeft(find.textContaining('Newer report here')).dy;
    expect(oldY, lessThan(newY));
  });
}
