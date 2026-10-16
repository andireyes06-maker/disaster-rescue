import 'package:disaster_rescue/data/report_models.dart';
import 'package:disaster_rescue/features/map/incident_map_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

// M06: a short landscape screen must lay out without overflow (the audit reproduced 120px at 640x320).
void main() {
  for (final size in const [Size(640, 320), Size(360, 640), Size(900, 400)]) {
    testWidgets('incident map lays out without overflow at ${size.width.toInt()}x${size.height.toInt()}', (t) async {
      t.view.physicalSize = size;
      t.view.devicePixelRatio = 1;
      addTearDown(t.view.reset);
      await t.pumpWidget(MaterialApp(
        home: IncidentMapPage(
          reports: Stream.value(const <AssignedReport>[]),
          viewerUid: 'demo',
          showTiles: false,
        ),
      ));
      await t.pumpAndSettle();
      expect(t.takeException(), isNull);
    });
  }
}
