import 'package:disaster_rescue/auth/auth_controller.dart';
import 'package:disaster_rescue/auth/auth_repository.dart';
import 'package:disaster_rescue/auth/profile_sync.dart';
import 'package:disaster_rescue/auth/role_gate.dart';
import 'package:disaster_rescue/auth/session_navigation.dart';
import 'package:disaster_rescue/features/responder/assigned_list_page.dart';
import 'package:disaster_rescue/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'fakes.dart';

AuthUser syncing({SyncHold? note, bool retry = false}) => AuthUser(
      uid: 'u1',
      email: 'a@b.c',
      role: 'responder',
      team: 'Harbor',
      active: true,
      syncing: true,
      syncNote: note,
      retryAvailable: retry,
    );

Widget host(AuthController c, GlobalKey<NavigatorState> key) => ChangeNotifierProvider<AuthController>.value(
      value: c,
      child: MaterialApp(navigatorKey: key, theme: AppTheme.light, home: const RoleGate()),
    );

void main() {
  late FakeAuthRepository repo;
  late AuthController c;

  setUp(() {
    repo = FakeAuthRepository();
    c = AuthController(repo);
  });
  tearDown(() => c.dispose());

  testWidgets('while access is being checked, no role home is shown', (t) async {
    await t.pumpWidget(host(c, GlobalKey<NavigatorState>()));
    repo.events.add(syncing(note: SyncHold.profileLoading));
    await t.pump();
    await t.pump();
    expect(find.text('Checking your access'), findsOneWidget);
    expect(find.byType(ResponderHome), findsNothing);
    expect(find.byType(AssignedListPage), findsNothing);
    expect(find.text('Retry access check'), findsNothing);
  });

  testWidgets('the retry button appears only when the automatic checks have run out, and calls the repository', (t) async {
    await t.pumpWidget(host(c, GlobalKey<NavigatorState>()));
    repo.events.add(syncing(note: SyncHold.claimsNotUpdated, retry: true));
    await t.pump();
    await t.pump();
    expect(find.text('Retry access check'), findsOneWidget);
    await t.tap(find.text('Retry access check'));
    await t.pump();
    expect(repo.retryCalls, 1);
  });

  testWidgets('a refresh failure names the connection problem', (t) async {
    await t.pumpWidget(host(c, GlobalKey<NavigatorState>()));
    repo.events.add(syncing(note: SyncHold.refreshFailed, retry: true));
    await t.pump();
    await t.pump();
    expect(find.textContaining('could not confirm your access'), findsOneWidget);
  });

  testWidgets('a role change pops pushed pages and clears the per-session state', (t) async {
    final key = GlobalKey<NavigatorState>();
    var cleared = 0;
    final session = SessionNavigationReset(key, onChange: () => cleared++);
    c.addListener(() => session.update(c.user));
    await t.pumpWidget(host(c, key));

    // The admin role renders a plain notice, so the test needs no role-specific providers.
    repo.events.add(const AuthUser(uid: 'u1', email: 'a@b.c', role: 'admin', team: 'Harbor', active: true));
    await t.pump();
    await t.pump();

    key.currentState!.push(MaterialPageRoute<void>(builder: (_) => const Scaffold(body: Text('Pushed page'))));
    await t.pump();
    await t.pump();
    expect(find.text('Pushed page'), findsOneWidget);

    repo.events.add(const AuthUser(uid: 'u1', email: 'a@b.c', role: 'admin', team: 'Dock', active: true));
    await t.pump();
    await t.pump();
    expect(find.text('Pushed page'), findsNothing);
    expect(cleared, greaterThanOrEqualTo(2));
  });
}
