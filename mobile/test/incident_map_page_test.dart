import 'package:disaster_rescue/data/report_models.dart';
import 'package:disaster_rescue/features/map/incident_map_page.dart';
import 'package:disaster_rescue/features/map/map_markers.dart';
import 'package:disaster_rescue/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_test/flutter_test.dart';

AssignedReport rep({
  String id = 'r1',
  String type = 'flood',
  String description = 'Flood water',
  String? priority = 'high',
  String? reporterId,
  String? assignedTeamId = 'team-a',
  double? lat = 14.60,
  double? lng = 120.98,
  MapPoint? coarse = const MapPoint(14.605, 120.985),
}) => AssignedReport(
  id: id,
  type: type,
  description: description,
  status: 'Team Assigned',
  reference: 'DR-$id',
  priority: priority,
  reporterId: reporterId,
  assignedTeamId: assignedTeamId,
  lat: lat,
  lng: lng,
  coarseLocation: coarse,
  createdAt: DateTime(2026, 10, 1),
);

Future<void> pumpMap(WidgetTester t, List<AssignedReport> reports) async {
  await t.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      home: IncidentMapPage(
        reports: Stream.value(reports),
        viewerUid: 'responder-1',
        viewerTeam: 'team-a',
        showTiles: false,
      ),
    ),
  );
  await t.pump();
  await t.pump();
}

void main() {
  testWidgets('a located report is named by its label, and an unknown type reads Other', (t) async {
    await pumpMap(t, [
      rep(id: 'a', type: 'road_hazard'),
      rep(id: 'b', type: 'zzz'),
    ]);
    expect(find.text('Roadblock'), findsWidgets);
    expect(find.text('zzz'), findsNothing);
    expect(find.text('road_hazard'), findsNothing);
  });

  testWidgets('the Type filter lists all 8 labels', (t) async {
    await pumpMap(t, [rep()]);
    for (final label in ['Flood', 'Fire', 'Earthquake', 'Landslide', 'Lifeline', 'Roadblock', 'Live Wire', 'Other']) {
      expect(find.widgetWithText(FilterChip, label), findsOneWidget, reason: label);
    }
  });

  group('location rule', () {
    final exact = rep(reporterId: 'resident-1', assignedTeamId: 'team-a');

    test('a non-reporter, non-assigned user gets coarse coordinates', () {
      final p = visibleLocation(exact, viewerUid: 'stranger', viewerTeam: null);
      expect(p, const MapPoint(14.605, 120.985));
    });

    test('the reporter gets exact coordinates', () {
      final p = visibleLocation(
        exact,
        viewerUid: 'resident-1',
        viewerTeam: null,
      );
      expect(p, const MapPoint(14.60, 120.98));
    });

    test('the assigned responder gets exact coordinates', () {
      final p = visibleLocation(
        exact,
        viewerUid: 'responder-1',
        viewerTeam: 'team-a',
      );
      expect(p, const MapPoint(14.60, 120.98));
    });

    test('a different team does not get exact coordinates', () {
      final p = visibleLocation(
        exact,
        viewerUid: 'responder-9',
        viewerTeam: 'team-b',
      );
      expect(p, const MapPoint(14.605, 120.985));
    });
  });

  group('priority markers', () {
    const priorities = <String?>['critical', 'high', 'medium', 'low', null];

    test('each priority has a distinct shape and a non-empty label', () {
      final markers = [for (final p in priorities) priorityMarker(p)];
      final shapes = markers.map((m) => m.shape).toSet();
      expect(shapes.length, priorities.length);
      for (final m in markers) {
        expect(m.label.trim(), isNotEmpty);
      }
    });

    test('only critical priority uses coral', () {
      expect(priorityMarker('critical').color, AppColors.critical);
      for (final p in ['high', 'medium', 'low', null]) {
        expect(priorityMarker(p).color, isNot(AppColors.critical));
      }
    });
  });

  group('IncidentMapPage', () {
    testWidgets('type filter chip hides reports of other types in the list', (
      t,
    ) async {
      await pumpMap(t, [
        rep(id: 'f1', type: 'flood', description: 'Flood water'),
        rep(id: 'x2', type: 'fire', description: 'Smoke on the roof'),
      ]);
      expect(find.text('Flood water'), findsOneWidget);
      expect(find.text('Smoke on the roof'), findsOneWidget);

      await t.tap(find.widgetWithText(FilterChip, 'Fire'));
      await t.pump();

      expect(find.text('Flood water'), findsNothing);
      expect(find.text('Smoke on the roof'), findsOneWidget);
    });

    testWidgets('descriptions render as plain text', (t) async {
      await pumpMap(t, [rep(description: '<b>bold</b>')]);
      expect(find.text('<b>bold</b>'), findsOneWidget);
    });

    testWidgets(
      'OpenStreetMap attribution is shown and no tile layer is built in tests',
      (t) async {
        await pumpMap(t, [rep()]);
        expect(find.textContaining('OpenStreetMap'), findsOneWidget);
        expect(find.byType(TileLayer), findsNothing);
        expect(find.byType(FlutterMap), findsOneWidget);
      },
    );
  });
}
