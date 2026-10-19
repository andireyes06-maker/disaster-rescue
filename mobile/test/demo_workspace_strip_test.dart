import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:disaster_rescue/features/demo/demo_workspace_strip.dart';

void main() {
  const label = 'Demo workspace · Sample data';

  testWidgets('shows the sample label above the app while the demo is active', (tester) async {
    final controller = StreamController<String?>();
    addTearDown(controller.close);
    await tester.pumpWidget(MaterialApp(
      home: DemoWorkspaceStrip(watch: () => controller.stream, child: const Text('screen')),
    ));
    controller.add(label);
    await tester.pump();
    expect(find.text(label), findsOneWidget);
    expect(find.text('screen'), findsOneWidget);
  });

  testWidgets('shows only the screen when the flag is off', (tester) async {
    final controller = StreamController<String?>();
    addTearDown(controller.close);
    await tester.pumpWidget(MaterialApp(
      home: DemoWorkspaceStrip(watch: () => controller.stream, child: const Text('screen')),
    ));
    controller.add(null);
    await tester.pump();
    expect(find.text(label), findsNothing);
    expect(find.text('screen'), findsOneWidget);
  });

  testWidgets('never invents a label after a failed read', (tester) async {
    final controller = StreamController<String?>();
    addTearDown(controller.close);
    await tester.pumpWidget(MaterialApp(
      home: DemoWorkspaceStrip(watch: () => controller.stream, child: const Text('screen')),
    ));
    controller.addError(StateError('permission-denied'));
    await tester.pump();
    expect(find.text(label), findsNothing);
    expect(find.text('screen'), findsOneWidget);
  });
}
