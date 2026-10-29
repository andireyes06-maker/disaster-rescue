import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// Taps [label], then confirms on the "Are you sure?" dialog. When no dialog opens (a blocked action), it only taps.
Future<void> tapConfirmed(WidgetTester t, String label, [String? confirmLabel]) async {
  // A long list builds its rows lazily, so scroll until the button exists before asking for it.
  final scrollables = find.byType(Scrollable);
  if (find.text(label).evaluate().isEmpty && scrollables.evaluate().isNotEmpty) {
    await t.scrollUntilVisible(find.text(label), 200, scrollable: scrollables.first);
  }
  await t.ensureVisible(find.text(label).first);
  await t.pumpAndSettle();
  await t.tap(find.text(label).first);
  await t.pumpAndSettle();
  final dialog = find.byType(AlertDialog);
  if (dialog.evaluate().isEmpty) return;
  await t.tap(find.descendant(of: dialog, matching: find.text(confirmLabel ?? label)));
  await t.pumpAndSettle();
}
