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

The public welcome introduces “A clear report. A connected response.” with resident
registration, existing-account sign-in and response-team access. Its route drawing
is an authored schematic; the emergency disclaimer remains visible below the
introduction. The harbor/purple theme extends the incumbent design using native
Material/platform typography rather than the web Geist family.

Resident tabs remain Report, My Reports and Profile, with a shared notifications
bell on those app bars. Responders retain Assigned and Notifications. Tab changes
use a 240ms arrival while an IndexedStack preserves mounted drafts and scroll
state. Shared content arrivals are 320ms, inline errors 160ms and the welcome route
draw 1400ms. Custom effects honor disabled animations; iOS retains Flutter's
default route transition. Task viewports, including notifications, are bounded at
760 logical pixels including their child padding.

See [the Flutter finish design snapshot](../docs/mobile-finish-design.md) for exact
values, incumbent-token drift and evidence limits. The current visual review uses
Flutter in Chrome with synthetic local emulator content. Native hardware/OS,
physical usability and device-performance gates remain unverified; this pass does
not establish dark mode or adaptive tablet navigation.
