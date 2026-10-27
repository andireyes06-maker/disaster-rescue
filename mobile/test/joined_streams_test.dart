import 'dart:async';

import 'package:disaster_rescue/data/report_models.dart';
import 'package:disaster_rescue/data/services.dart';
import 'package:flutter_test/flutter_test.dart';

AssignedReport _r(String id, {DateTime? at}) => AssignedReport(
      id: id,
      type: 'flood',
      description: 'Report $id',
      status: 'Team Assigned',
      createdAt: at ?? DateTime(2026, 10, 27, 8),
    );

void main() {
  test('a tab can listen again after it was disposed, without an error', () async {
    final single = StreamController<List<AssignedReport>>.broadcast();
    final many = StreamController<List<AssignedReport>>.broadcast();
    final joined = joinTeamStreams(() => single.stream, () => many.stream, limit: 50, newestFirst: false);

    // First tab view listens, then goes away.
    final first = joined.listen((_) {});
    await Future<void>.delayed(Duration.zero);
    await first.cancel();

    // The tab is shown again. This used to throw "Stream has already been listened to".
    final rows = <List<AssignedReport>>[];
    final again = joined.listen(rows.add);
    single.add([_r('a')]);
    many.add([]);
    await Future<void>.delayed(Duration.zero);
    expect(rows.last.map((r) => r.id), ['a']);
    await again.cancel();
    await single.close();
    await many.close();
  });

  test('a report in both lists is shown once, and a failing several-teams query keeps the rest', () async {
    final single = StreamController<List<AssignedReport>>.broadcast();
    final many = StreamController<List<AssignedReport>>.broadcast();
    final joined = joinTeamStreams(() => single.stream, () => many.stream, limit: 50, newestFirst: false);
    final rows = <List<AssignedReport>>[];
    final sub = joined.listen(rows.add);
    single.add([_r('x'), _r('y')]);
    many.addError(StateError('index not deployed'));
    await Future<void>.delayed(Duration.zero);
    expect(rows.last.map((r) => r.id), ['x', 'y']);
    await sub.cancel();
    await single.close();
    await many.close();
  });

  test('a second listener gets the joined rows too (broadcast)', () async {
    final single = StreamController<List<AssignedReport>>.broadcast();
    final many = StreamController<List<AssignedReport>>.broadcast();
    final joined = joinTeamStreams(() => single.stream, () => many.stream, limit: 50, newestFirst: true);
    final a = <List<AssignedReport>>[];
    final b = <List<AssignedReport>>[];
    final subA = joined.listen(a.add);
    final subB = joined.listen(b.add);
    single.add([_r('p')]);
    many.add([]);
    await Future<void>.delayed(Duration.zero);
    expect(a.last.map((r) => r.id), ['p']);
    expect(b.last.map((r) => r.id), ['p']);
    await subA.cancel();
    await subB.cancel();
    await single.close();
    await many.close();
  });
}
