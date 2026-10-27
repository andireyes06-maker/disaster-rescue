import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// Chooses the required province or city on the report location step.
/// The menu builds only its first items, so this calls the dropdown's own change handler, as a tap on an item would.
Future<void> chooseArea(WidgetTester t, [String area = 'Quezon City']) async {
  final field = find.byKey(const Key('area'));
  await t.ensureVisible(field);
  final dropdown = t.widget<DropdownButtonFormField<String>>(field);
  dropdown.onChanged!(area);
  await t.pumpAndSettle();
}
