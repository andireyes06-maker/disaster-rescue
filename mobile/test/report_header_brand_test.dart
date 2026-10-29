import 'package:disaster_rescue/features/report/report_flow_page.dart';
import 'package:disaster_rescue/theme/product_navigation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'report_fakes.dart';

void main() {
  for (final sample in [(320.0, 1.0), (390.0, 1.0), (390.0, 2.0)]) {
    testWidgets('report header uses approved logo at ${sample.$1}px / ${sample.$2} text', (tester) async {
      final env = Env();
      addTearDown(env.dispose);
      tester.view.physicalSize = Size(sample.$1, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(env.host(const ReportFlowPage(), textScale: sample.$2));
      await tester.pumpAndSettle();
      final header = find.byType(AppBar);
      expect(find.descendant(of: header, matching: find.byType(ProductMark)), findsOneWidget);
      expect(find.descendant(of: header, matching: find.byIcon(Icons.add)), findsNothing);
      expect(tester.takeException(), isNull);
    });
  }
}
