import 'dart:typed_data';

import 'package:disaster_rescue/data/api_client.dart';
import 'package:disaster_rescue/data/report_models.dart';
import 'package:disaster_rescue/data/services.dart';
import 'package:disaster_rescue/features/offline/offline_help_page.dart';
import 'package:disaster_rescue/features/report/report_flow_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '/private/tmp/rescue-release-integration-2026-10-18/mobile/test/fakes.dart';
import '/private/tmp/rescue-release-integration-2026-10-18/mobile/test/report_fakes.dart';

const disclaimer =
    'Submitting a report through this app does not automatically guarantee immediate rescue. If you are in danger, call your local emergency hotline.';

late Env env;

void bigScreen(WidgetTester t) {
  t.view.physicalSize = const Size(800, 2400);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
}

Future<void> open(WidgetTester t, {double scale = 1.0}) async {
  bigScreen(t);
  env.authRepo.events.add(residentUser);
  await t.pumpWidget(env.host(const ReportFlowPage(), textScale: scale));
  await t.pumpAndSettle();
}

Finder photoChips() => find.byWidgetPredicate(
      (w) => w.key is ValueKey<String> && (w.key! as ValueKey<String>).value.startsWith('photo-chip-'),
    );
Finder nextBtn() => find.widgetWithText(FilledButton, 'Next');
Future<void> tapText(WidgetTester t, String s) async {
  await t.tap(find.text(s));
  await t.pumpAndSettle();
}

Future<void> toStep2(WidgetTester t) async {
  await tapText(t, 'Flood');
  await t.tap(nextBtn());
  await t.pumpAndSettle();
}

Future<void> toStep3(WidgetTester t) async {
  await toStep2(t);
  await tapText(t, 'Use my current location');
  await t.tap(nextBtn());
  await t.pumpAndSettle();
}

Future<void> fillDetails(WidgetTester t) async {
  await t.enterText(find.byKey(const Key('description')), 'Water up to the roof');
  await t.enterText(find.byKey(const Key('contactName')), 'Ana Reyes');
  await t.enterText(find.byKey(const Key('contactPhone')), '0917 123 4567');
  await t.pump();
}

Future<void> toStep4(WidgetTester t) async {
  await toStep3(t);
  await fillDetails(t);
  await t.tap(nextBtn());
  await t.pumpAndSettle();
}

void main() {
 setUp(() => env = Env());
 tearDown(() => env.dispose());
 testWidgets('audit probe: ambiguous HTTP 500 changes the retry key', (t) async {
  await open(t);
  env.reports.createError = const ApiException(500, 'internal_error', 'Receipt unknown');
  await toStep4(t);
  await tapText(t, 'Submit report');
  expect(find.text('Your report was NOT submitted.'), findsOneWidget);
  env.reports.createError = null;
  await tapText(t, 'Try again');
  await tapText(t, 'Submit report');
  expect(env.reports.keysSeen, hasLength(2));
  final changed = env.reports.keysSeen.first != env.reports.keysSeen.last;
  print('AUDIT_MOBILE_500_KEY_CHANGED=$changed');
  // Observational proof of the current defect, not a desired-behavior regression test.
  expect(changed, isTrue);
 });
}
