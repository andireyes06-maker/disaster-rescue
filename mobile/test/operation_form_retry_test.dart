import 'dart:typed_data';
import 'package:disaster_rescue/data/api_client.dart';
import 'package:disaster_rescue/data/report_models.dart';
import 'package:disaster_rescue/data/responder_attempts.dart';
import 'package:disaster_rescue/features/responder/operation_form_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'confirm_helper.dart';

import 'report_fakes.dart';

// Regression for the responder update retry: an uncertain outcome must be retried with the same
// Idempotency-Key (the server then replays instead of recording twice), a changed entry needs a
// new key, and a definite refusal must not keep the key.
void main() {
  late Env env;
  setUp(() => env = Env());
  tearDown(() => env.dispose());

  Future<void> open(WidgetTester t) async {
    await t.pumpWidget(env.host(const OperationFormPage(reportId: 'r1')));
    await t.pump();
  }

  Future<void> save(WidgetTester t, String people) async {
    // A successful root-screen save leaves its transient snackbar visible.
    // Let it dismiss before the next interaction, just as a returning user would.
    await t.pump(const Duration(seconds: 5));
    await t.enterText(find.byKey(const Key('peopleRescued')), people);
    await t.scrollUntilVisible(
      find.text('Save update'),
      150,
      scrollable: find.byType(Scrollable).first,
    );
    await t.pumpAndSettle();
    await tapConfirmed(t, 'Save update');
    await t.pumpAndSettle();
  }

  testWidgets(
    'an uncertain outcome keeps the entries, and the retry reuses the same key',
    (t) async {
      env.responder.updateError = const ApiException(0, 'network', 'offline');
      await open(t);
      await save(t, '2');
      expect(find.text(uncertainUpdateCopy), findsOneWidget);
      expect(env.responder.updates, isEmpty);
      expect(
        t
            .widget<TextFormField>(find.byKey(const Key('peopleRescued')))
            .controller!
            .text,
        '2',
      );

      env.responder.updateError = null;
      await save(t, '2');
      expect(env.responder.updates, hasLength(1));
      final keys = env.responder.updateKeys;
      expect(keys, hasLength(2));
      expect(keys.first, isNotNull);
      expect(keys.last, keys.first);
    },
  );

  testWidgets('a changed entry after an uncertain outcome gets a new key', (
    t,
  ) async {
    env.responder.updateError = const ApiException(0, 'network', 'offline');
    await open(t);
    await save(t, '2');
    env.responder.updateError = null;
    await save(t, '5');
    final keys = env.responder.updateKeys;
    expect(keys, hasLength(2));
    expect(keys.last, isNot(keys.first));
  });

  testWidgets(
    'a definite refusal shows its message and the next attempt uses a new key',
    (t) async {
      env.responder.updateError = const ApiException(
        400,
        'invalid_people_rescued',
        'People rescued must be a whole number.',
      );
      await open(t);
      await save(t, '2');
      expect(
        find.text('People rescued must be a whole number.'),
        findsOneWidget,
      );
      expect(find.text(uncertainUpdateCopy), findsNothing);

      env.responder.updateError = null;
      await save(t, '2');
      final keys = env.responder.updateKeys;
      expect(keys, hasLength(2));
      expect(keys.last, isNot(keys.first));
    },
  );

  testWidgets('a second tap before the first save rebuilds sends one request', (
    t,
  ) async {
    await open(t);
    await t.enterText(find.byKey(const Key('peopleRescued')), '2');
    await t.scrollUntilVisible(find.text('Save update'), 200, scrollable: find.byType(Scrollable).first);
    final button = t.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'Save update'),
    );
    button.onPressed!();
    button.onPressed!();
    await t.pumpAndSettle();
    // The second tap added no second question; confirming the one question sends exactly one request.
    expect(find.byType(AlertDialog), findsOneWidget);
    await t.tap(find.descendant(of: find.byType(AlertDialog), matching: find.text('Save update')));
    await t.pumpAndSettle();
    expect(env.responder.updateKeys, hasLength(1));
  });

  testWidgets('a form opened again after an uncertain outcome reuses its key', (
    t,
  ) async {
    env.responder.updateError = const ApiException(0, 'network', 'offline');
    await open(t);
    await save(t, '2');
    // The person leaves the screen; the attempt is remembered outside the form.
    await t.pumpWidget(const SizedBox());
    env.responder.updateError = null;
    await open(t);
    await save(t, '2');
    final keys = env.responder.updateKeys;
    expect(keys, hasLength(2));
    expect(keys.last, keys.first);
  });

  testWidgets(
    'a successful save leaves no attempt, so the next entry gets a new key',
    (t) async {
      await open(t);
      await save(t, '2');
      expect(env.attempts.attemptsFor('r1'), isEmpty);
      await open(t);
      await save(t, '2');
      final keys = env.responder.updateKeys;
      expect(keys, hasLength(2));
      expect(keys.last, isNot(keys.first));
    },
  );

  test('the attempt store drops every attempt when the account changes', () {
    String? uid = 'ana';
    final store = ResponderAttemptStore(currentUid: () => uid);
    store.remember(
      'r1',
      const UpdateAttempt(key: 'key-aaaaaaaa', signature: 's'),
    );
    expect(store.attemptFor('r1', 's')?.key, 'key-aaaaaaaa');
    uid = 'ben';
    expect(store.attemptFor('r1', 's'), isNull);
    store.remember(
      'r1',
      const UpdateAttempt(key: 'key-bbbbbbbb', signature: 's'),
    );
    store.clear();
    expect(store.attemptsFor('r1'), isEmpty);
  });

  test(
    'the store keeps each payload, forgets only the resolved one, and never evicts',
    () {
      final store = ResponderAttemptStore(currentUid: () => 'ana');
      for (var i = 0; i < ResponderAttemptStore.maxUnresolvedPerReport; i++) {
        store.remember(
          'r1',
          UpdateAttempt(key: 'key-$i-aaaa', signature: 'p$i'),
        );
      }
      expect(store.isFull('r1'), isTrue);
      expect(
        () => store.remember(
          'r1',
          const UpdateAttempt(key: 'key-x-aaaa', signature: 'px'),
        ),
        throwsStateError,
      );
      expect(
        store.attemptsFor('r1'),
        hasLength(ResponderAttemptStore.maxUnresolvedPerReport),
      );
      store.forget('r1', 'p2');
      expect(store.attemptFor('r1', 'p2'), isNull);
      expect(store.attemptFor('r1', 'p0')?.key, 'key-0-aaaa');
      expect(store.isFull('r1'), isFalse);
    },
  );

  testWidgets('A, then B uncertain, then A again: A keeps its original key', (
    t,
  ) async {
    env.responder.updateOutcome = (u) => u.peopleRescued == 0
        ? null
        : const ApiException(0, 'network', 'offline');
    await open(t);
    await save(t, '2');
    await save(t, '5');
    await save(t, '2');
    final keys = env.responder.updateKeys;
    expect(keys, hasLength(3));
    expect(keys[1], isNot(keys[0]));
    expect(keys[2], keys[0]);
    expect(env.responder.updates, isEmpty);
  });

  testWidgets(
    'A uncertain, B succeeds, then A again: A still reuses its original key',
    (t) async {
      env.responder.updateOutcome = (u) => u.peopleRescued == 2
          ? const ApiException(0, 'network', 'offline')
          : null;
      await open(t);
      await save(t, '2');
      await save(t, '5');
      expect(env.responder.updates, hasLength(1));
      await save(t, '2');
      final keys = env.responder.updateKeys;
      expect(keys, hasLength(3));
      expect(keys[2], keys[0]);
    },
  );

  testWidgets(
    'a full set of unresolved payloads blocks a new payload instead of evicting a key',
    (t) async {
      // The blocked state adds a button; a taller surface keeps the Save button built.
      await t.binding.setSurfaceSize(const Size(400, 1200));
      addTearDown(() => t.binding.setSurfaceSize(null));
      env.responder.updateOutcome = (_) =>
          const ApiException(0, 'network', 'offline');
      await open(t);
      for (var i = 1; i <= ResponderAttemptStore.maxUnresolvedPerReport; i++) {
        await save(t, '$i');
      }
      expect(
        env.responder.updateKeys,
        hasLength(ResponderAttemptStore.maxUnresolvedPerReport),
      );
      await save(t, '9');
      expect(
        env.responder.updateKeys,
        hasLength(ResponderAttemptStore.maxUnresolvedPerReport),
      );
      expect(find.text(tooManyUnresolvedCopy), findsOneWidget);
      // The earliest payload is still retried with its own key.
      await save(t, '1');
      expect(env.responder.updateKeys.last, env.responder.updateKeys.first);
    },
  );

  testWidgets('required fields are marked', (t) async {
    await open(t);
    expect(find.text('People rescued *'), findsOneWidget);
    expect(find.text('Status *'), findsOneWidget);
  });

  testWidgets(
    'after a full set is blocked, discarding the unconfirmed updates lets a new update go with a new key',
    (t) async {
      env.responder.updateOutcome = (_) =>
          const ApiException(0, 'network', 'offline');
      await open(t);
      for (var i = 1; i <= ResponderAttemptStore.maxUnresolvedPerReport; i++) {
        await save(t, '$i');
      }
      await save(t, '9');
      expect(find.text('Discard unconfirmed updates'), findsOneWidget);

      env.responder.updateOutcome = null;
      await t.scrollUntilVisible(find.text('Discard unconfirmed updates'), 200, scrollable: find.byType(Scrollable).first);
      await t.pumpAndSettle();
      await t.tap(find.text('Discard unconfirmed updates'));
      await t.pumpAndSettle();
      expect(find.text(tooManyUnresolvedCopy), findsNothing);
      expect(find.text('Discard unconfirmed updates'), findsNothing);

      await save(t, '9');
      expect(env.responder.updates, hasLength(1));
      final keys = env.responder.updateKeys;
      expect(keys.last, isNot(keys.first));
    },
  );
  testWidgets('different photo bytes with the same name and size get distinct retry keys', (t) async {
    await t.binding.setSurfaceSize(const Size(400, 1400));
    addTearDown(() => t.binding.setSurfaceSize(null));
    env.responder.updateError = const ApiException(0, 'network', 'offline');
    await open(t);
    final a = photo('evidence.jpg');
    final changed = Uint8List.fromList(a.bytes)..[a.bytes.length - 1] ^= 1;
    final b = PickedPhoto(name: a.name, bytes: changed, mime: a.mime);
    Future<void> pick(PickedPhoto p) async {
      env.photos.next = [p];
      await t.ensureVisible(find.text('Choose existing photos'));
      await t.tap(find.text('Choose existing photos'));
      await t.pumpAndSettle();
    }
    Future<void> remove() async {
      await t.ensureVisible(find.byTooltip('Remove photo evidence.jpg'));
      await t.tap(find.byTooltip('Remove photo evidence.jpg'));
      await t.pumpAndSettle();
    }
    await pick(a);
    await save(t, '2');
    await remove(); await pick(b);
    await save(t, '2');
    expect(env.responder.updateKeys[1], isNot(env.responder.updateKeys[0]));
    await remove(); await pick(a);
    await save(t, '2');
    expect(env.responder.updateKeys[2], env.responder.updateKeys[0]);
  });

}
