import 'dart:async';

import 'package:disaster_rescue/auth/auth_repository.dart';
import 'package:disaster_rescue/data/report_models.dart';
import 'package:disaster_rescue/data/services.dart';
import 'package:disaster_rescue/features/profile/profile_page.dart';
import 'package:disaster_rescue/widgets/user_avatar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'fakes.dart';
import 'report_fakes.dart';

const responder = AuthUser(
  uid: 'responder-a',
  role: 'responder',
  team: 'alpha',
  active: true,
);
const medical = ResponderTeam(name: 'Team Alpha', identity: 'Medical');

void main() {
  late Env env;
  setUp(() => env = Env());
  tearDown(() => env.dispose());

  Future<void> open(WidgetTester t, AuthUser user, {double scale = 1}) async {
    t.view.physicalSize = const Size(390, 844);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    await t.pumpWidget(env.host(ProfilePage(user: user), textScale: scale));
    await t.pumpAndSettle();
  }

  testWidgets('responder profile loads its own team and identity live', (
    t,
  ) async {
    await open(t, responder);
    expect(find.text('Loading your team…'), findsOneWidget);
    expect(env.responder.ownTeamRequests, ['alpha']);
    env.responder.ownTeams['alpha']!.add(medical);
    await t.pumpAndSettle();
    expect(find.text('Team Alpha'), findsOneWidget);
    expect(find.text('Team identity'), findsOneWidget);
    expect(find.text('Medical'), findsOneWidget);
    env.responder.ownTeams['alpha']!.add(
      const ResponderTeam(name: 'Alpha Emergency', identity: 'Rescue'),
    );
    await t.pumpAndSettle();
    expect(find.text('Team Alpha'), findsNothing);
    expect(find.text('Alpha Emergency'), findsOneWidget);
    expect(find.text('Rescue'), findsOneWidget);
  });

  testWidgets('residents do not fetch or display responder team fields', (
    t,
  ) async {
    await open(t, residentUser);
    expect(find.text('Team identity'), findsNothing);
    expect(find.text('No team assigned'), findsNothing);
    expect(env.responder.ownTeamRequests, isEmpty);
  });

  testWidgets('team change clears previous team before the next read', (
    t,
  ) async {
    await open(t, responder);
    env.responder.ownTeams['alpha']!.add(medical);
    await t.pumpAndSettle();
    const next = AuthUser(
      uid: 'responder-a',
      role: 'responder',
      team: 'bravo',
      active: true,
    );
    await t.pumpWidget(env.host(const ProfilePage(user: next)));
    await t.pumpAndSettle();
    expect(find.text('Team Alpha'), findsNothing);
    expect(find.text('Medical'), findsNothing);
    env.responder.ownTeams['alpha']!.add(medical);
    await t.pumpAndSettle();
    expect(find.text('Team Alpha'), findsNothing);
    env.responder.ownTeams['bravo']!.add(
      const ResponderTeam(name: 'Team Bravo', identity: 'BFP'),
    );
    await t.pumpAndSettle();
    expect(find.text('Team Bravo'), findsOneWidget);
    expect(find.text('BFP'), findsOneWidget);
  });

  testWidgets('lost team membership removes loaded team', (t) async {
    await open(t, responder);
    env.responder.ownTeams['alpha']!.add(medical);
    await t.pumpAndSettle();
    const next = AuthUser(uid: 'responder-a', role: 'responder', active: true);
    await t.pumpWidget(env.host(const ProfilePage(user: next)));
    await t.pumpAndSettle();
    expect(find.text('Team Alpha'), findsNothing);
    expect(find.text('No team assigned'), findsOneWidget);
  });

  testWidgets('failed team read clears old values and can be retried', (
    t,
  ) async {
    await open(t, responder);
    env.responder.ownTeams['alpha']!.add(medical);
    await t.pumpAndSettle();
    env.responder.ownTeams['alpha']!.addError(StateError('permission denied'));
    await t.pumpAndSettle();
    expect(find.text('Team Alpha'), findsNothing);
    expect(find.text('Could not load your team details.'), findsOneWidget);
    await t.ensureVisible(find.text('Retry team details'));
    await t.tap(find.text('Retry team details'));
    await t.pumpAndSettle();
    expect(env.responder.ownTeamRequests, ['alpha', 'alpha']);
    env.responder.ownTeams['alpha']!.add(medical);
    await t.pumpAndSettle();
    expect(find.text('Medical'), findsOneWidget);
  });

  testWidgets('deleted team does not claim there is no assignment', (t) async {
    await open(t, responder);
    env.responder.ownTeams['alpha']!.add(null);
    await t.pumpAndSettle();
    expect(find.text('Your assigned team could not be found.'), findsOneWidget);
    expect(find.text('No team assigned'), findsNothing);
  });

  testWidgets('missing profile name uses a plain fallback', (t) async {
    env.profiles.profile = const Profile(name: '   ');
    await open(t, residentUser);
    expect(find.text('Name not set'), findsOneWidget);
    expect(find.text('Your account'), findsNothing);
  });

  testWidgets('new account reloads name and ignores old photo completion', (
    t,
  ) async {
    env.profiles.photoPending = Completer<String>();
    await open(t, residentUser);
    await t.tap(find.text('Change photo'));
    await t.pumpAndSettle();
    env.profiles.profile = const Profile(name: 'New Person');
    const other = AuthUser(uid: 'other', role: 'resident', active: true);
    await t.pumpWidget(env.host(const ProfilePage(user: other)));
    await t.pumpAndSettle();
    expect(find.text('Ana Reyes'), findsNothing);
    expect(find.text('New Person'), findsOneWidget);
    env.profiles.photoPending!.complete('https://img.example/old-account.jpg');
    await t.pumpAndSettle();
    expect(t.widget<UserAvatar>(find.byType(UserAvatar)).photoUrl, isNull);
    expect(find.text('Your photo is saved.'), findsNothing);
  });

  testWidgets('long profile and team names reflow at320px and200percent text', (
    t,
  ) async {
    env.profiles.profile = const Profile(
      name: 'A very long responder name that must wrap across several lines',
    );
    await open(t, responder, scale: 2);
    t.view.physicalSize = const Size(320, 844);
    env.responder.ownTeams['alpha']!.add(
      const ResponderTeam(
        name: 'Municipal Emergency Medical Response and Rescue Team',
        identity: 'Community Emergency Volunteers and First Responders',
      ),
    );
    await t.pumpAndSettle();
    await t.scrollUntilVisible(find.text('Team identity'), 250);
    expect(t.takeException(), isNull);
    expect(
      find.text('Community Emergency Volunteers and First Responders'),
      findsOneWidget,
    );
    await t.scrollUntilVisible(find.text('Change password'), 250);
    expect(t.takeException(), isNull);
  });

  test('team identity follows legacy and custom team contracts', () {
    expect(ResponderTeam.fromJson({'name': 'Alpha'}).identity, 'Rescue');
    expect(
      ResponderTeam.fromJson({'name': 'Alpha', 'kind': 'Medical'}).identity,
      'Medical',
    );
    expect(
      ResponderTeam.fromJson({
        'kind': 'Other',
        'kindLabel': 'Barangay volunteers',
      }).identity,
      'Barangay volunteers',
    );
    expect(ResponderTeam.fromJson({'kind': 'Other'}).identity, 'Other');
    expect(ResponderTeam.fromJson({'name': '   '}).name, 'Team name not set');
  });
}
