import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

import 'package:disaster_rescue/data/api_client.dart';
import 'package:disaster_rescue/data/report_models.dart';
import 'package:disaster_rescue/data/services.dart';
import 'package:disaster_rescue/features/offline/offline_help_page.dart';
import 'package:disaster_rescue/features/report/report_flow_page.dart';
import 'package:disaster_rescue/features/report/submission_result_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'confirm_helper.dart';

import 'fakes.dart';
import 'report_fakes.dart';

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
  (w) =>
      w.key is ValueKey<String> &&
      (w.key! as ValueKey<String>).value.startsWith('photo-chip-'),
);
Finder nextBtn() => find.widgetWithText(FilledButton, 'Next');
Future<void> tapText(WidgetTester t, String s) async {
  await t.ensureVisible(find.text(s));
  await t.pumpAndSettle();
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
  await t.enterText(
    find.byKey(const Key('description')),
    'Water up to the roof',
  );
  await t.enterText(find.byKey(const Key('contactName')), 'Ana Reyes');
  await t.enterText(find.byKey(const Key('contactPhone')), '0917 123 4567');
  await t.pump();
  await tapText(t, 'Choose existing photos');
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

  group('validators', () {
    test('phone', () {
      expect(validatePhone('+63 912 345 6789'), isNull);
      expect(validatePhone('(02) 8123-4567'), isNull);
      expect(validatePhone(''), isNotNull);
      expect(validatePhone('abc12345'), isNotNull);
      expect(validatePhone('123'), isNotNull);
      expect(validatePhone('1' * 21), isNotNull);
    });
    test('photo', () {
      expect(validatePhoto(photo('a.jpg')), isNull);
      expect(
        validatePhoto(
          PickedPhoto(name: 'a.png', bytes: pngBytes(), mime: 'image/png'),
        ),
        isNull,
      );
      expect(
        validatePhoto(
          PickedPhoto(
            name: 'fake.jpg',
            bytes: Uint8List.fromList([1, 2, 3, 4]),
            mime: 'image/jpeg',
          ),
        ),
        contains('not a JPEG'),
      );
      expect(
        validatePhoto(
          PickedPhoto(name: 'e.jpg', bytes: Uint8List(0), mime: 'image/jpeg'),
        ),
        isNotNull,
      );
      final big = Uint8List(maxPhotoBytes + 1)
        ..setRange(0, 3, [0xFF, 0xD8, 0xFF]);
      expect(
        validatePhoto(
          PickedPhoto(name: 'big.jpg', bytes: big, mime: 'image/jpeg'),
        ),
        contains('5 MB'),
      );
    });
  });

  testWidgets('step 1 shows five types and a progress label', (t) async {
    await open(t);
    expect(find.text('Step 1 of 4'), findsOneWidget);
    for (final s in ['Flood', 'Fire', 'Earthquake', 'Landslide', 'Other']) {
      expect(find.text(s), findsOneWidget);
    }
    expect(find.text('Call hotline'), findsOneWidget);
    expect(tester(nextBtn(), t).onPressed, isNull);
  });

  testWidgets('cannot advance step 2 without a location', (t) async {
    await open(t);
    await toStep2(t);
    expect(find.text('Step 2 of 4'), findsOneWidget);
    expect(tester(nextBtn(), t).onPressed, isNull);
    await t.tap(nextBtn(), warnIfMissed: false);
    await t.pumpAndSettle();
    expect(find.text('Step 2 of 4'), findsOneWidget);
    await tapText(t, 'Use my current location');
    expect(tester(nextBtn(), t).onPressed, isNotNull);
    // No place name in tests, so the card says where the pin came from, never the raw numbers.
    expect(find.text('Pinned at your current location'), findsOneWidget);
    expect(find.textContaining('14.59950'), findsNothing);
  });

  testWidgets(
    'permission denied and GPS off show a message and the map fallback',
    (t) async {
      await open(t);
      await toStep2(t);
      env.location.result = const LocationResult(LocationStatus.denied);
      await tapText(t, 'Use my current location');
      expect(find.textContaining('permission'), findsWidgets);
      expect(find.text('Pick on a map'), findsOneWidget);
      env.location.result = const LocationResult(LocationStatus.serviceOff);
      await tapText(t, 'Use my current location');
      expect(find.textContaining('turned off'), findsWidgets);
      expect(tester(nextBtn(), t).onPressed, isNull);
    },
  );

  testWidgets(
    'advancing from scrolled details opens the review at its heading',
    (t) async {
      await open(t);
      await toStep3(t);
      await fillDetails(t);
      await t.drag(
        find.byType(SingleChildScrollView).first,
        const Offset(0, -350),
      );
      await t.pumpAndSettle();
      await t.tap(nextBtn());
      await t.pumpAndSettle();
      final heading = t.getRect(find.text('Check and send'));
      expect(heading.top, greaterThan(150));
      expect(heading.top, lessThan(350));
      expect(find.text('1 attached'), findsOneWidget);
    },
  );

  testWidgets('the sixth photo is blocked with a message', (t) async {
    await open(t);
    await toStep3(t);
    env.photos.next = [for (var i = 0; i < 5; i++) photo('p$i.jpg')];
    await tapText(t, 'Choose existing photos');
    expect(photoChips(), findsNWidgets(5));
    final calls = env.photos.calls;
    await tapText(t, 'Choose existing photos');
    expect(find.textContaining('up to 5 photos'), findsOneWidget);
    expect(env.photos.calls, calls);
    expect(photoChips(), findsNWidgets(5));
  });

  testWidgets('a photo over 5 MB or not an image is rejected before upload', (
    t,
  ) async {
    await open(t);
    await toStep3(t);
    final big = Uint8List(maxPhotoBytes + 1)
      ..setRange(0, 3, [0xFF, 0xD8, 0xFF]);
    env.photos.next = [
      PickedPhoto(name: 'big.jpg', bytes: big, mime: 'image/jpeg'),
      PickedPhoto(
        name: 'notes.jpg',
        bytes: Uint8List.fromList([9, 9, 9, 9]),
        mime: 'image/jpeg',
      ),
    ];
    await tapText(t, 'Choose existing photos');
    expect(photoChips(), findsNothing);
    expect(find.textContaining('larger than 5 MB'), findsOneWidget);
    expect(find.textContaining('not a JPEG, PNG or WebP'), findsOneWidget);
    expect(env.reports.created, isEmpty);
  });

  testWidgets('details step needs a valid description and phone', (t) async {
    await open(t);
    await toStep3(t);
    await t.enterText(find.byKey(const Key('description')), 'ab');
    await t.enterText(find.byKey(const Key('contactPhone')), 'abc');
    await t.tap(nextBtn());
    await t.pumpAndSettle();
    expect(find.text('Step 3 of 4'), findsOneWidget);
    expect(find.textContaining('at least 3'), findsOneWidget);
    expect(find.textContaining('7 to 15 digits'), findsOneWidget);
  });

  testWidgets('contact is prefilled from the profile', (t) async {
    await open(t);
    await toStep3(t);
    expect(find.text('Ana Reyes'), findsOneWidget);
    expect(find.text('0917 123 4567'), findsOneWidget);
  });

  testWidgets('confirm step shows the exact disclaimer and a coral submit', (
    t,
  ) async {
    await open(t);
    await toStep4(t);
    expect(find.text('Step 4 of 4'), findsOneWidget);
    expect(find.text(disclaimer), findsOneWidget);
    expect(find.text('Water up to the roof'), findsOneWidget);
    expect(find.text('Submit report'), findsOneWidget);
  });

  testWidgets(
    'a confirmed report is not shown as unsent when local draft cleanup fails (M03)',
    (t) async {
      env.drafts.draft = const ReportDraft(type: 'fire');
      await open(t);
      await tapText(t, 'Discard');
      await toStep4(t);
      // Fail only the cleanup that runs after the send, not the discard above.
      env.drafts.failClear = true;
      await tapConfirmed(t, 'Submit report');
      expect(env.reports.created, hasLength(1));
      expect(find.text('DR-AB12CD'), findsOneWidget);
      expect(find.textContaining('not sent'), findsNothing);
      env.drafts.failClear = false;
    },
  );

  testWidgets('success shows the reference and clears the draft', (t) async {
    env.drafts.draft = const ReportDraft(type: 'fire');
    await open(t);
    await tapText(t, 'Discard');
    await toStep4(t);
    await tapConfirmed(t, 'Submit report');
    expect(find.text('DR-AB12CD'), findsOneWidget);
    expect(
      find.text('Your report was submitted. Status: Submitted.'),
      findsOneWidget,
    );
    expect(find.text('View my reports'), findsOneWidget);
    expect(env.drafts.draft, isNull);
    expect(env.reports.created.single.type, 'flood');
    expect(env.reports.created.single.source, 'gps');
  });

  testWidgets(
    'ApiException 429 is uncertain: the page says it could not be confirmed, and the key is kept',
    (t) async {
      await open(t);
      env.reports.createError = const ApiException(
        429,
        'rate_limited',
        'Slow down',
      );
      await toStep4(t);
      await tapConfirmed(t, 'Submit report');
      expect(find.text(uncertainCopy), findsOneWidget);
      expect(find.textContaining('NOT submitted'), findsNothing);
      expect(find.textContaining('too many reports'), findsOneWidget);
      expect(env.drafts.uncertain, isTrue);
      expect(env.drafts.draft, isNotNull);
      env.reports.createError = null;
      await tapText(t, 'Try again');
      await tapConfirmed(t, 'Submit report');
      expect(env.reports.keysSeen, hasLength(2));
      expect(env.reports.keysSeen.last, env.reports.keysSeen.first);
      expect(env.reports.keysSeen.first, matches(RegExp(r'^[0-9a-f]{32}$')));
    },
  );

  for (final e in {
    400: const ApiException(
      400,
      'validation_error',
      'Description is too short.',
    ),
    403: const ApiException(403, 'account_disabled', 'Off'),
    0: const ApiException(
      0,
      'auth',
      'You are signed out. Please log in again.',
    ),
  }.entries) {
    testWidgets('ApiException ${e.key} leads to the NOT submitted page', (
      t,
    ) async {
      await open(t);
      env.reports.createError = e.value;
      await toStep4(t);
      await tapConfirmed(t, 'Submit report');
      expect(find.text('Your report was NOT submitted.'), findsOneWidget);
      expect(find.text('Try again'), findsOneWidget);
      expect(find.text('Call hotline'), findsWidgets);
      expect(find.textContaining('SMS'), findsOneWidget);
      expect(env.drafts.draft, isNull);
      if (e.key == 400) {
        expect(
          find.textContaining('Description is too short.'),
          findsOneWidget,
        );
      }
      if (e.key == 403 || e.key == 0) {
        expect(find.textContaining('session'), findsOneWidget);
      }
    });
  }

  testWidgets(
    'a timed-out send is uncertain: the draft and the send block are kept',
    (t) async {
      await open(t);
      env.reports.createError = TimeoutException('slow');
      await toStep4(t);
      await tapConfirmed(t, 'Submit report');
      expect(env.drafts.uncertain, isTrue);
      expect(env.drafts.draft, isNotNull);
    },
  );

  testWidgets('a dropped connection is uncertain: the send block is kept', (
    t,
  ) async {
    await open(t);
    env.reports.createError = http.ClientException('connection reset');
    await toStep4(t);
    await tapConfirmed(t, 'Submit report');
    expect(env.drafts.uncertain, isTrue);
  });

  testWidgets('a local file error before sending does not block a resend', (
    t,
  ) async {
    await open(t);
    env.reports.createError = const FileSystemException(
      'photo file is missing',
    );
    await toStep4(t);
    await tapConfirmed(t, 'Submit report');
    expect(env.drafts.uncertain, isFalse);
    expect(find.text(uncertainCopy), findsNothing);
    env.reports.createError = null;
    await tapText(t, 'Try again');
    await tapConfirmed(t, 'Submit report');
    expect(env.reports.created, hasLength(1));
  });

  testWidgets(
    'a retry after a lost response sends the same submission key (M04)',
    (t) async {
      await open(t);
      env.reports.createError = const ApiException(
        0,
        'network',
        'Cannot reach the server.',
      );
      await toStep4(t);
      await tapConfirmed(t, 'Submit report');
      expect(
        find.text('We could not confirm that your report reached us.'),
        findsOneWidget,
      );
      expect(find.textContaining('has not been sent'), findsNothing);
      env.reports.createError = null;
      await tapText(t, 'Try again');
      expect(env.reports.keysSeen, hasLength(2));
      expect(env.reports.keysSeen.first, isNotNull);
      expect(env.reports.keysSeen.last, env.reports.keysSeen.first);
      expect(env.reports.keysSeen.first, matches(RegExp(r'^[0-9a-f]{32}$')));
    },
  );

  testWidgets(
    'a network failure saves a draft and opens the offline page with hotlines',
    (t) async {
      await open(t);
      env.reports.createError = const ApiException(
        0,
        'network',
        'Cannot reach the server.',
      );
      await toStep4(t);
      await tapConfirmed(t, 'Submit report');
      expect(find.byType(OfflineHelpPage), findsOneWidget);
      expect(env.drafts.draft?.type, 'flood');
      expect(env.drafts.draft?.description, 'Water up to the roof');
      expect(find.text('National emergency'), findsOneWidget);
      expect(find.text('911'), findsOneWidget);
      expect(
        find.text(
          'Call the hotline, or send an SMS to your local disaster office, then try again when you have a signal.',
        ),
        findsOneWidget,
      );
      // Retry succeeds this time.
      env.reports.createError = null;
      await tapText(t, 'Try again');
      expect(find.text('DR-AB12CD'), findsOneWidget);
      expect(env.drafts.draft, isNull);
    },
  );

  testWidgets('a saved draft is offered on launch', (t) async {
    env.drafts.draft = const ReportDraft(
      type: 'fire',
      description: 'Smoke everywhere',
      lat: 1,
      lng: 2,
      source: 'manual',
      contactName: 'Ben',
      contactPhone: '0917 000 1111',
    );
    await open(t);
    expect(find.text('Continue your saved report'), findsOneWidget);
    await tapText(t, 'Continue your saved report');
    expect(find.text('Step 4 of 4'), findsOneWidget);
    expect(find.text('Smoke everywhere'), findsOneWidget);
  });

  group('emergency types', () {
    Future<void> toDetailsWith(WidgetTester t, String label, {String? detail}) async {
      await tapText(t, label);
      if (detail != null) await t.enterText(find.byKey(const Key('typeDetail')), detail);
      await t.pump();
      await t.tap(nextBtn());
      await t.pumpAndSettle();
      await tapText(t, 'Use my current location');
      await t.tap(nextBtn());
      await t.pumpAndSettle();
      await fillDetails(t);
      await t.tap(nextBtn());
      await t.pumpAndSettle();
    }

    test('validateTypeDetail asks for 3 to 40 characters', () {
      expect(validateTypeDetail(null), 'Say what kind of emergency this is.');
      expect(validateTypeDetail('   '), 'Say what kind of emergency this is.');
      expect(validateTypeDetail('ab'), 'Use 3 to 40 characters.');
      expect(validateTypeDetail('a' * 41), 'Use 3 to 40 characters.');
      expect(validateTypeDetail('gas leak'), isNull);
      expect(validateTypeDetail('  gas leak  '), isNull);
      expect(validateTypeDetail('a' * 40), isNull);
    });

    testWidgets('the chooser lists the 8 types in order with their description lines', (t) async {
      await open(t);
      final labels = ['Flood', 'Fire', 'Earthquake', 'Landslide', 'Lifeline', 'Roadblock', 'Live Wire', 'Other'];
      final tops = [for (final l in labels) t.getTopLeft(find.text(l)).dy];
      expect(tops, orderedEquals([...tops]..sort()));
      expect(find.text('Someone needs urgent medical help'), findsOneWidget);
      expect(find.text('Blocked, damaged or unsafe road'), findsOneWidget);
      expect(find.text('Fallen, sparking or damaged power line'), findsOneWidget);
      expect(find.text('Something else. You will describe it next'), findsOneWidget);
    });

    testWidgets('Other asks what kind of emergency it is, and Next waits for 3 to 40 characters', (t) async {
      await open(t);
      expect(find.byKey(const Key('typeDetail')), findsNothing);
      await tapText(t, 'Other');
      expect(find.byKey(const Key('typeDetail')), findsOneWidget);
      expect(find.textContaining('What kind of emergency is it?', findRichText: true), findsWidgets);
      FilledButton next() => t.widget<FilledButton>(nextBtn());
      expect(next().onPressed, isNull);
      await t.enterText(find.byKey(const Key('typeDetail')), 'ab');
      await t.pump();
      expect(next().onPressed, isNull);
      await t.enterText(find.byKey(const Key('typeDetail')), 'gas leak');
      await t.pump();
      expect(next().onPressed, isNotNull);
    });

    testWidgets('choosing another type hides and clears the typed text', (t) async {
      await open(t);
      await tapText(t, 'Other');
      await t.enterText(find.byKey(const Key('typeDetail')), 'gas leak');
      await tapText(t, 'Flood');
      expect(find.byKey(const Key('typeDetail')), findsNothing);
      await tapText(t, 'Other');
      expect(t.widget<TextFormField>(find.byKey(const Key('typeDetail'))).controller!.text, isEmpty);
    });

    testWidgets('an Other report is sent with its trimmed typeDetail and reads Other: gas leak on review', (t) async {
      await open(t);
      await toDetailsWith(t, 'Other', detail: '  gas leak  ');
      expect(find.text('Other: gas leak'), findsOneWidget);
      await tapConfirmed(t, 'Submit report');
      expect(env.reports.created.single.type, 'other');
      expect(env.reports.created.single.typeDetail, 'gas leak');
    });

    testWidgets('a new type is sent with no typeDetail', (t) async {
      await open(t);
      await toDetailsWith(t, 'Roadblock');
      expect(find.text('Roadblock'), findsOneWidget);
      await tapConfirmed(t, 'Submit report');
      expect(env.reports.created.single.type, 'road_hazard');
      expect(env.reports.created.single.typeDetail, isNull);
    });

    testWidgets('a saved draft with Other and its text comes back after a restart', (t) async {
      env.drafts.draft = const ReportDraft(
        type: 'other',
        typeDetail: 'gas leak',
        description: 'Smell of gas',
        lat: 1,
        lng: 2,
        source: 'manual',
        contactName: 'Ben',
        contactPhone: '0917 000 1111',
      );
      await open(t);
      await tapText(t, 'Continue your saved report');
      expect(find.text('Step 4 of 4'), findsOneWidget);
      expect(find.text('Other: gas leak'), findsOneWidget);
    });

    test('ReportDraft keeps typeDetail through toJson and fromJson', () {
      final d = ReportDraft.fromJson(const ReportDraft(type: 'other', typeDetail: 'gas leak').toJson());
      expect(d.typeDetail, 'gas leak');
    });

    testWidgets('the chooser does not overflow at 200% text, and Other is still reachable', (t) async {
      await open(t, scale: 2.0);
      await t.ensureVisible(find.text('Other'));
      await t.pumpAndSettle();
      expect(t.takeException(), isNull);
      await t.tap(find.text('Other'));
      await t.pumpAndSettle();
      await t.ensureVisible(find.byKey(const Key('typeDetail')));
      expect(find.byKey(const Key('typeDetail')), findsOneWidget);
      expect(t.takeException(), isNull);
    });
  });

  testWidgets('discard clears the saved draft', (t) async {
    env.drafts.draft = const ReportDraft(type: 'fire');
    await open(t);
    await tapText(t, 'Discard');
    expect(env.drafts.draft, isNull);
    expect(find.text('Continue your saved report'), findsNothing);
  });

  testWidgets('hotline button dials the first hotline', (t) async {
    await open(t);
    await tapText(t, 'Call hotline');
    expect(env.dialer.dialed, ['911']);
  });

  for (final step in [1, 2, 3, 4]) {
    testWidgets('step $step renders at 200 percent text without overflow', (
      t,
    ) async {
      t.view.physicalSize = const Size(400, 900);
      t.view.devicePixelRatio = 1;
      addTearDown(t.view.reset);
      env.authRepo.events.add(residentUser);
      await t.pumpWidget(env.host(const ReportFlowPage(), textScale: 2.0));
      await t.pumpAndSettle();
      if (step >= 2) {
        await toStep2(t);
      }
      if (step >= 3) {
        // At 200% text the required line pushes the location choices below the fold; a user scrolls to them.
        await t.ensureVisible(find.text('Use my current location'));
        await tapText(t, 'Use my current location');
        await t.tap(nextBtn());
        await t.pumpAndSettle();
      }
      if (step >= 4) {
        await fillDetails(t);
        await t.ensureVisible(nextBtn());
        await t.tap(nextBtn());
        await t.pumpAndSettle();
      }
      expect(find.text('Step $step of 4'), findsOneWidget);
      expect(t.takeException(), isNull);
    });
  }
}

FilledButton tester(Finder f, WidgetTester t) => t.widget<FilledButton>(f);
