import 'dart:typed_data';

import 'package:disaster_rescue/data/api_client.dart';
import 'package:disaster_rescue/data/photo_identity.dart';
import 'package:disaster_rescue/data/report_models.dart';
import 'package:disaster_rescue/features/report/report_draft_store.dart';
import 'package:disaster_rescue/features/report/report_flow_page.dart';
import 'package:disaster_rescue/features/report/submission_result_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'confirm_helper.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'fakes.dart';
import 'report_fakes.dart';

late Env env;

void bigScreen(WidgetTester t) {
  t.view.physicalSize = const Size(800, 2400);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
}

Future<void> open(WidgetTester t) async {
  bigScreen(t);
  env.authRepo.events.add(residentUser);
  await t.pumpWidget(env.host(const ReportFlowPage()));
  await t.pumpAndSettle();
}

Future<void> tapText(WidgetTester t, String s) async {
  await t.tap(find.text(s));
  await t.pumpAndSettle();
}

Future<void> toStep3(WidgetTester t) async {
  await tapText(t, 'Flood');
  await t.tap(find.widgetWithText(FilledButton, 'Next'));
  await t.pumpAndSettle();
  await tapText(t, 'Use my current location');
  await t.tap(find.widgetWithText(FilledButton, 'Next'));
  await t.pumpAndSettle();
}

Future<void> toStep4(WidgetTester t) async {
  await toStep3(t);
  await t.enterText(find.byKey(const Key('description')), 'Water up to the roof');
  await t.enterText(find.byKey(const Key('contactName')), 'Ana Reyes');
  await t.enterText(find.byKey(const Key('contactPhone')), '0917 123 4567');
  await t.pump();
  await tapText(t, 'Add photos');
  await t.tap(find.widgetWithText(FilledButton, 'Next'));
  await t.pumpAndSettle();
}

/// Same length, different bytes, same name as [photo]('a.jpg').
PickedPhoto sameSizeOtherPhoto() => PickedPhoto(
  name: 'a.jpg',
  bytes: Uint8List.fromList([0xFF, 0xD8, 0xFF, 0xE0, ...List.filled(20, 2)]),
  mime: 'image/jpeg',
);

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    env = Env();
  });
  tearDown(() => env.dispose());

  group('submission identity and uncertain outcomes', () {
    for (final error in [const ApiException(201, 'bad_response', 'Invalid reply'), const FormatException('Unrecognized receipt')]) {
      testWidgets('ambiguous receipt $error keeps the key and never says NOT submitted', (t) async {
        await open(t);
        env.reports.createError = error;
        await toStep4(t);
        await tapConfirmed(t, 'Submit report');
        expect(find.textContaining('NOT submitted'), findsNothing);
        expect(env.drafts.uncertain, isTrue);
        await tapText(t, 'Try again');
        await tapConfirmed(t, 'Submit report');
        expect(env.reports.keysSeen, hasLength(2));
        expect(env.reports.keysSeen.last, env.reports.keysSeen.first);
      });
    }

    testWidgets('(a) two uncertain 500s reuse the same idempotency key', (t) async {
      await open(t);
      env.reports.createError = const ApiException(500, 'server', 'x');
      await toStep4(t);
      await tapConfirmed(t, 'Submit report');
      await tapText(t, 'Try again');
      await tapConfirmed(t, 'Submit report');
      expect(env.reports.keysSeen, hasLength(2));
      expect(env.reports.keysSeen.last, env.reports.keysSeen.first);
      expect(env.reports.keysSeen.first, matches(RegExp(r'^[0-9a-f]{32}$')));
    });

    testWidgets('(b) after a 500 the page says we could not confirm, never NOT submitted', (t) async {
      await open(t);
      env.reports.createError = const ApiException(500, 'server', 'x');
      await toStep4(t);
      await tapConfirmed(t, 'Submit report');
      expect(find.textContaining('could not confirm'), findsOneWidget);
      expect(find.textContaining('NOT submitted'), findsNothing);
      expect(env.drafts.uncertain, isTrue);
      expect(env.drafts.draft?.type, 'flood');
    });

    testWidgets('(c) a photo swap with the same count gets a new idempotency key', (t) async {
      await open(t);
      env.photos.next = [photo('a.jpg')];
      env.reports.createError = const ApiException(500, 'server', 'x');
      await toStep3(t);
      await t.enterText(find.byKey(const Key('description')), 'Water up to the roof');
      await t.enterText(find.byKey(const Key('contactName')), 'Ana Reyes');
      await t.enterText(find.byKey(const Key('contactPhone')), '0917 123 4567');
      await tapText(t, 'Add photos');
      await t.tap(find.widgetWithText(FilledButton, 'Next'));
      await t.pumpAndSettle();
      await tapConfirmed(t, 'Submit report');
      await tapText(t, 'Try again');
      await tapText(t, 'Back');
      await t.tap(find.byTooltip('Remove photo a.jpg'));
      await t.pumpAndSettle();
      env.photos.next = [sameSizeOtherPhoto()];
      await tapText(t, 'Add photos');
      await t.tap(find.widgetWithText(FilledButton, 'Next'));
      await t.pumpAndSettle();
      env.reports.createError = null;
      await tapConfirmed(t, 'Submit report');
      expect(env.reports.keysSeen, hasLength(2));
      expect(env.reports.keysSeen.last, isNot(env.reports.keysSeen.first));
    });

    testWidgets('(d) a definite 400 drops the key, so the next attempt uses a new one', (t) async {
      await open(t);
      env.reports.createError = const ApiException(400, 'validation_error', 'Description is too short.');
      await toStep4(t);
      await tapConfirmed(t, 'Submit report');
      expect(find.text('Your report was NOT submitted.'), findsOneWidget);
      env.reports.createError = null;
      await tapText(t, 'Try again');
      await tapConfirmed(t, 'Submit report');
      expect(env.reports.keysSeen, hasLength(2));
      expect(env.reports.keysSeen.last, isNot(env.reports.keysSeen.first));
    });

    testWidgets('(e) a restart with the uncertain flag blocks submit until the explicit new-report action', (t) async {
      env.drafts.uncertain = true;
      await open(t);
      await toStep4(t);
      await tapConfirmed(t, 'Submit report');
      expect(find.textContaining('Check My reports'), findsOneWidget);
      expect(env.reports.keysSeen, isEmpty);
      await tapConfirmed(t, 'I checked, send as a new report', 'Submit report');
      expect(env.reports.keysSeen, hasLength(1));
      expect(env.reports.keysSeen.single, matches(RegExp(r'^[0-9a-f]{32}$')));
      expect(env.drafts.uncertain, isFalse);
      expect(find.text('DR-AB12CD'), findsOneWidget);
    });

    testWidgets('a confirmed send after an uncertain outcome clears the flag', (t) async {
      await open(t);
      env.reports.createError = const ApiException(500, 'server', 'x');
      await toStep4(t);
      await tapConfirmed(t, 'Submit report');
      expect(env.drafts.uncertain, isTrue);
      env.reports.createError = null;
      await tapText(t, 'Try again');
      await tapConfirmed(t, 'Submit report');
      expect(find.text('DR-AB12CD'), findsOneWidget);
      expect(env.drafts.uncertain, isFalse);
    });

    test('(f) photo digests of equal-length, different bytes differ', () {
      final a = PickedPhoto(name: 'x.jpg', bytes: Uint8List.fromList([1, 2, 3, 4]), mime: 'image/jpeg');
      final b = PickedPhoto(name: 'x.jpg', bytes: Uint8List.fromList([1, 2, 3, 5]), mime: 'image/jpeg');
      expect(photoContentDigest(a), matches(RegExp(r'^[0-9a-f]{64}$')));
      expect(photoContentDigest(a), isNot(photoContentDigest(b)));
      expect(photoContentDigest(a), photoContentDigest(a));
    });
  });

  group('per-account uncertain flag storage', () {
    test('the flag is per account and only ever true or cleared', () async {
      String? who = 'res-a';
      final store = ReportDraftStore(currentUid: () => who);
      expect(await store.loadUncertainSend(), isFalse);
      await store.setUncertainSend(true);
      expect(await store.loadUncertainSend(), isTrue);
      who = 'res-b';
      expect(await store.loadUncertainSend(), isFalse);
      who = 'res-a';
      await store.setUncertainSend(false);
      expect(await store.loadUncertainSend(), isFalse);
    });

    test('the flag stores only a boolean, with no key, text or photo bytes', () async {
      final store = ReportDraftStore(currentUid: () => 'res-a');
      await store.setUncertainSend(true);
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getKeys(), {'report_draft_v2:res-a:uncertain'});
      expect(prefs.get('report_draft_v2:res-a:uncertain'), isTrue);
    });
  });

  group('storage failure under an uncertain outcome', () {
    testWidgets('a draft write that fails does not hide the uncertain page', (t) async {
      await open(t);
      env.drafts.failSave = true;
      env.reports.createError = const ApiException(500, 'server', 'x');
      await toStep4(t);
      await tapConfirmed(t, 'Submit report');
      expect(t.takeException(), isNull);
      expect(find.text(uncertainCopy), findsOneWidget);
      expect(find.text(storageFailureCopy(draftNotSaved: true, warningNotSaved: false)!), findsOneWidget);
      expect(find.textContaining('NOT submitted'), findsNothing);
    });

    testWidgets('a warning that cannot be saved is said plainly and is not claimed to survive a restart', (t) async {
      await open(t);
      env.drafts.failSetUncertain = true;
      env.reports.createError = const ApiException(500, 'server', 'x');
      await toStep4(t);
      await tapConfirmed(t, 'Submit report');
      expect(find.text(uncertainCopy), findsOneWidget);
      expect(find.text(storageFailureCopy(draftNotSaved: false, warningNotSaved: true)!), findsOneWidget);
      expect(find.textContaining('We couldn’t save your report details'), findsNothing);
      expect(env.drafts.uncertain, isFalse);
    });

    testWidgets('offline with a storage failure does not say the report was saved on the phone', (t) async {
      await open(t);
      env.drafts.failSave = true;
      env.reports.createError = const ApiException(0, 'network', 'Cannot reach the server.');
      await toStep4(t);
      await tapConfirmed(t, 'Submit report');
      expect(t.takeException(), isNull);
      expect(find.text(storageFailureCopy(draftNotSaved: true, warningNotSaved: false)!), findsOneWidget);
      expect(find.textContaining('We saved it on this phone'), findsNothing);
    });

    testWidgets('when both writes fail, one combined message names both and no other', (t) async {
      await open(t);
      env.drafts.failSave = true;
      env.drafts.failSetUncertain = true;
      env.reports.createError = const ApiException(500, 'server', 'x');
      await toStep4(t);
      await tapConfirmed(t, 'Submit report');
      expect(find.text(storageFailureCopy(draftNotSaved: true, warningNotSaved: true)!), findsOneWidget);
      expect(find.textContaining('report details or retry warning on this phone'), findsOneWidget);
    });

    testWidgets('an unreadable warning at startup keeps the form blocked until the explicit new-report action', (t) async {
      env.drafts.failLoadUncertain = true;
      await open(t);
      await toStep4(t);
      expect(find.text('I checked, send as a new report'), findsOneWidget);
      await tapConfirmed(t, 'Submit report');
      expect(env.reports.keysSeen, isEmpty);
    });
  });
}
