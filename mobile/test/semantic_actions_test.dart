import 'dart:ui' show SemanticsAction;

import 'package:disaster_rescue/features/report/hotline_button.dart';
import 'package:disaster_rescue/features/report/report_flow_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'report_fakes.dart';

// Screen readers activate controls through the semantic tap action (M01). These checks read that action directly.
void main() {
  testWidgets('the hotline control exposes a semantic tap action', (t) async {
    final env = Env();
    addTearDown(env.dispose);
    final semantics = t.ensureSemantics();
    await t.pumpWidget(env.host(const Scaffold(body: HotlineButton())));
    await t.pumpAndSettle();
    final node = t.getSemantics(find.bySemanticsLabel('Call the emergency hotline'));
    expect(node.getSemanticsData().hasAction(SemanticsAction.tap), isTrue);
    semantics.dispose();
  });

  testWidgets('each incident category exposes a semantic tap action', (t) async {
    final env = Env();
    addTearDown(env.dispose);
    final semantics = t.ensureSemantics();
    await t.pumpWidget(env.host(const ReportFlowPage()));
    await t.pumpAndSettle();
    final node = t.getSemantics(find.bySemanticsLabel(RegExp('^Flood')));
    expect(node.getSemanticsData().hasAction(SemanticsAction.tap), isTrue);
    semantics.dispose();
  });
}
