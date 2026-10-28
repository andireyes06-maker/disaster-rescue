import 'dart:typed_data';

import 'package:disaster_rescue/data/api_client.dart';
import 'package:disaster_rescue/data/report_models.dart';
import 'package:disaster_rescue/features/profile/profile_page.dart';
import 'package:disaster_rescue/widgets/user_avatar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'fakes.dart';
import 'report_fakes.dart';

const _old = 'https://img.example/old.jpg';
const _new = 'https://img.example/new.jpg';

String? _shownPhoto(WidgetTester t) =>
    t.widget<UserAvatar>(find.byType(UserAvatar)).photoUrl;

void main() {
  late Env env;
  setUp(() => env = Env());
  tearDown(() => env.dispose());

  Future<void> open(WidgetTester t) async {
    t.view.physicalSize = const Size(800, 1800);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    await t.pumpWidget(env.host(const ProfilePage(user: residentUser)));
    await t.pumpAndSettle();
  }

  testWidgets('profile page shows the saved photo from the profile', (t) async {
    env.profiles.profile = const Profile(name: 'Ana Reyes', phone: '0917', photoUrl: _old);
    await open(t);
    expect(_shownPhoto(t), _old);
    expect(find.text('Change photo'), findsOneWidget);
    expect(find.text('Remove photo'), findsOneWidget);
  });

  testWidgets('profile page uploads a picked photo and shows it', (t) async {
    env.photos.next = [photo('me.jpg')];
    env.profiles.nextPhotoUrl = _new;
    await open(t);
    expect(_shownPhoto(t), isNull);
    expect(find.text('Remove photo'), findsNothing);

    await t.tap(find.text('Change photo'));
    await t.pumpAndSettle();

    expect(env.photos.calls, 1);
    expect(env.photos.cameraCalls, 0);
    expect(env.profiles.uploaded.single.name, 'me.jpg');
    expect(_shownPhoto(t), _new);
    expect(find.text('Your photo is saved.'), findsOneWidget);
    expect(find.text('Remove photo'), findsOneWidget);
  });

  testWidgets('a failed upload keeps the old photo and shows an error', (t) async {
    env.profiles.profile = const Profile(name: 'Ana Reyes', photoUrl: _old);
    env.profiles.photoError = const ApiException(400, 'invalid_photo', 'Photo must be JPEG, PNG or WebP');
    await open(t);

    await t.tap(find.text('Change photo'));
    await t.pumpAndSettle();

    expect(_shownPhoto(t), _old);
    expect(
      find.text('Could not save your photo. Your current photo is unchanged.'),
      findsOneWidget,
    );
  });

  testWidgets('Remove photo clears it', (t) async {
    env.profiles.profile = const Profile(name: 'Ana Reyes', photoUrl: _old);
    await open(t);

    await t.tap(find.text('Remove photo'));
    await t.pumpAndSettle();

    expect(env.profiles.removeCalls, 1);
    expect(_shownPhoto(t), isNull);
    expect(find.text('Remove photo'), findsNothing);
    expect(find.text('Your photo is removed.'), findsOneWidget);
  });

  testWidgets('a failed removal keeps the photo and shows an error', (t) async {
    env.profiles.profile = const Profile(name: 'Ana Reyes', photoUrl: _old);
    env.profiles.removeError = const ApiException(0, 'network', 'offline');
    await open(t);

    await t.tap(find.text('Remove photo'));
    await t.pumpAndSettle();

    expect(_shownPhoto(t), _old);
    expect(
      find.text('Could not remove your photo. Your current photo is unchanged.'),
      findsOneWidget,
    );
  });

  testWidgets('oversized file is refused before any request', (t) async {
    final big = Uint8List(maxPhotoBytes + 1)
      ..setAll(0, [0xFF, 0xD8, 0xFF]);
    env.photos.next = [PickedPhoto(name: 'big.jpg', bytes: big, mime: 'image/jpeg')];
    await open(t);

    await t.tap(find.text('Change photo'));
    await t.pumpAndSettle();

    expect(env.profiles.uploaded, isEmpty);
    expect(
      find.text('This photo is larger than 5 MB. Choose a smaller photo.'),
      findsOneWidget,
    );
  });

  testWidgets('a file that is not an image is refused before any request', (t) async {
    env.photos.next = [
      PickedPhoto(name: 'notes.jpg', bytes: Uint8List.fromList([1, 2, 3, 4]), mime: 'image/jpeg'),
    ];
    await open(t);

    await t.tap(find.text('Change photo'));
    await t.pumpAndSettle();

    expect(env.profiles.uploaded, isEmpty);
    expect(find.text('Choose a JPEG, PNG or WebP photo.'), findsOneWidget);
  });

  testWidgets('cancelling the picker sends nothing and shows no message', (t) async {
    env.photos.next = [];
    await open(t);

    await t.tap(find.text('Change photo'));
    await t.pumpAndSettle();

    expect(env.profiles.uploaded, isEmpty);
    expect(find.textContaining('photo is'), findsNothing);
  });
}
