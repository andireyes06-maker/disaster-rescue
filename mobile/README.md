# Disaster Rescue mobile app

Flutter app for residents and responders. Other roles use the web dashboard.

## Run

No Firebase config files are committed. Pass the values at run time:

```
flutter run \
  --dart-define=FIREBASE_API_KEY=... \
  --dart-define=FIREBASE_APP_ID=... \
  --dart-define=FIREBASE_MESSAGING_SENDER_ID=... \
  --dart-define=FIREBASE_PROJECT_ID=... \
  --dart-define=API_BASE_URL=http://10.0.2.2:8080/api
```

`API_BASE_URL` defaults to `http://10.0.2.2:8080/api`, which reaches the host machine from the Android emulator. Use your computer's LAN address on a physical phone.

## Check

```
flutter pub get
flutter analyze
flutter test
```

Tests use fakes and never touch Firebase.

## Flutter in Chrome with local emulators

For browser emulator tests, serve and open the app at **localhost**, not 127.0.0.1.
The installed firebase_auth_web 6.3.0 plugin reconnects a remembered emulator before
restoring browser Auth only for the `localhost` hostname in debug mode. Opening
127.0.0.1 can restore the saved demo user against Google's real Auth endpoint
before `useAuthEmulator` runs, which rejects the demo key and returns to sign-in.
This is independent of the host used to connect to the emulator itself.

With your own isolated Auth, Firestore and API processes already running on the
example ports below, run:

```sh
flutter run -d chrome --web-hostname localhost --web-port 5403 \
  --dart-define=USE_EMULATORS=true \
  --dart-define=EMULATOR_HOST=127.0.0.1 \
  --dart-define=AUTH_EMULATOR_PORT=9393 \
  --dart-define=FIRESTORE_EMULATOR_PORT=8393 \
  --dart-define=API_BASE_URL=http://127.0.0.1:3403/api
```

Use the same `demo-disaster-rescue` project for both emulators, seed only that
isolated project, and allow `http://localhost:5403` in the local API's
`CORS_ORIGINS`. Substitute free ports as needed; do not reuse another session's
servers. `USE_EMULATORS=true` is for local debug checks, never a production build.

Verified on 20 October 2026: three same-tab reloads each for a resident and a
responder retained their session on localhost; lookup and refresh requests went
only to the local Auth emulator. This does not certify fresh-tab restoration,
hosted Firebase sessions, or native app restarts. The comparison also reproduced
failure on 127.0.0.1 without changing application source.

SDK implementation reference:
https://github.com/firebase/flutterfire/blob/main/packages/firebase_auth/firebase_auth_web/lib/firebase_auth_web.dart


## Welcome, navigation and motion

The public welcome introduces “A clear report. A connected response.” with resident registration, existing-account sign-in and response-team access. The safety notice remains visible. The current design uses a light workspace, dark harbor headers and bundled Geist typography with its OFL license in assets/fonts.

Residents use Report, My Reports and Profile, plus the notification bell. Responders use Assigned, Notifications and Profile; staff/admin remain on the website. Compact screens use the navigation dock; expanded screens use a rail. The keyed task body preserves editable drafts during width changes. Status, priority and errors use text/icons as well as color. Required fields carry asterisks.

Finite route, tab, report-step and feedback arrivals settle after each interaction. System motion preferences remain honored. The native system is documented in DESIGN.md and .impeccable/design.json.

Current evidence:222 widget tests and clean analysis, reviewed390/1440 Chrome captures,15 visual references, debug web and Android debug compilation. These are separate from physical-device, signing, push and iOS evidence. See the dated completion record for later native-emulator results.

## Harbor redesign,20 October2026

The current native visual system is documented in [DESIGN.md](DESIGN.md). It uses a light workspace, dark harbor headers, bundled Geist (OFL license in assets/fonts),48dp targets and compact-to-rail navigation. Residents/responders are native; other staff roles use the web. The reviewed redesign is checkpointed on the design/flutter-harbor-2026-10-20 branch. Test references in test/goldens were intentionally reviewed and replaced; see PROVENANCE.md. Chrome and widget evidence does not certify physical-device behavior. Submission media is refreshed separately; see docs/presentation/README.md.

## Submission demo APK (20 October 2026)

Use [LOCAL-DEMO.md](../docs/submission/LOCAL-DEMO.md) for the dedicated Auth9407/Firestore8407/API3407 stack and the USB-forwarded test APK. The explicit EMULATOR_HOST is honored without Firebase's automatic Android loopback remapping. `127.0.0.1` therefore works with adb reverse on an emulator or USB phone. For an unforwarded Android emulator, explicitly set `10.0.2.2` instead. Chrome remains on localhost for reliable emulator Auth restoration.

The current native design passed 222 Flutter tests and clean analysis. Android API35 AOSP emulator coverage is recorded in FINAL-VERIFICATION; it does not establish physical-phone, Play Services push, iOS or signed-release behavior.
