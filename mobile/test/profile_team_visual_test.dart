// Local widget evidence only; no hosted account, device, or upload is used.
import 'dart:io';
import 'package:disaster_rescue/auth/auth_repository.dart';
import 'package:disaster_rescue/data/report_models.dart';
import 'package:disaster_rescue/data/services.dart';
import 'package:disaster_rescue/features/profile/profile_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'report_fakes.dart';

void main() {
  setUpAll(() async {
    await (FontLoader(
      'Geist',
    )..addFont(rootBundle.load('assets/fonts/Geist-Variable.ttf'))).load();
    final root = Platform.environment['FLUTTER_ROOT'];
    if (root != null) {
      for (final pair in [
        ('Roboto', 'Roboto-Regular.ttf'),
        ('MaterialIcons', 'MaterialIcons-Regular.otf'),
      ]) {
        final font = File(
          '$root/bin/cache/artifacts/material_fonts/${pair.$2}',
        );
        if (font.existsSync()) {
          await (FontLoader(pair.$1)..addFont(
                Future.value(ByteData.sublistView(font.readAsBytesSync())),
              ))
              .load();
        }
      }
    }
  });
  testWidgets('responder profile shows personal name and current team', (
    t,
  ) async {
    final env = Env();
    addTearDown(env.dispose);
    env.profiles.profile = const Profile(
      name: 'Rene Baterbonia',
      phone: '0917 123 4567',
    );
    t.view.physicalSize = const Size(390, 844);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    const key = Key('responder-profile-capture');
    const user = AuthUser(
      uid: 'responder',
      email: 'responder@harbor.example',
      role: 'responder',
      team: 'alpha',
      active: true,
    );
    await t.pumpWidget(
      RepaintBoundary(
        key: key,
        child: env.host(const ProfilePage(user: user)),
      ),
    );
    await t.pumpAndSettle();
    env.responder.ownTeams['alpha']!.add(
      const ResponderTeam(name: 'Team Guiguinto', identity: 'Medical'),
    );
    await t.pumpAndSettle();
    expect(t.takeException(), isNull);
    await expectLater(
      find.byKey(key),
      matchesGoldenFile(
        "${Platform.environment['GOLDEN_REVIEW_DIR'] ?? 'goldens'}/responder-profile.png",
      ),
    );
  });
}
