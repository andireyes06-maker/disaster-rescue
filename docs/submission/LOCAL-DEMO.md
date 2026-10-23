# Local demonstration and Android test APK

This is a fictional, computer-backed test environment, not the production emergency service. The APK is a debug build using local emulators. It needs this computer and USB forwarding; it will not work as an independent online phone app. No physical phone was available during preparation. Android emulator coverage is recorded separately.

## Prerequisites

Node.js 22, Java 21+, Firebase CLI 15.32+, Flutter SDK compatible with mobile/pubspec.lock, Android SDK platform tools, and npm. From the extracted source run `npm ci --prefix api` and `npm ci --prefix web`. In mobile, run `flutter pub get`. The source archive excludes dependencies, credentials and generated caches.

## Computer demonstration

Run `node scripts/submission-demo.mjs` from the source root. The launcher refuses occupied ports and populated fixture databases; do not stop another session to free a port. It starts dedicated Firebase Auth 9407, Firestore 8407, API 3407 and web 5407. Open **http://localhost:5407**. Stop the launcher with Ctrl+C when finished. Do not replace localhost with a production host.

For Flutter Chrome, from mobile run:

```sh
flutter run -d chrome --web-hostname localhost --web-port 5507 \
  --dart-define=USE_EMULATORS=true --dart-define=EMULATOR_HOST=127.0.0.1 \
  --dart-define=AUTH_EMULATOR_PORT=9407 --dart-define=FIRESTORE_EMULATOR_PORT=8407 \
  --dart-define=API_BASE_URL=http://127.0.0.1:3407/api
```

## Fictional accounts, local emulators only

All five use the seed password **Demo-Sample#2026**. These are public local fixtures, not live credentials.

| Role | Email |
|---|---|
| Resident | maya.torres@harbor.example |
| Responder | daniel.flores@harbor.example |
| Dispatcher | marco.reyes@harbor.example |
| DMO | adrian.santos@harbor.example |
| Admin | elena.cruz@harbor.example |

Use the web for admin only; dispatcher and DMO fixture accounts are retained but access is retired. Flutter supports residents and responders. For an assignment demonstration, validate a resident report as admin, assign an available team, then sign in as its responder. Do not assume Team Alpha is free without checking.

## Android APK

The delivery folder contains `Rescue-Reports-USB-Test.apk`. To rebuild, run `sh scripts/build-android-demo.sh` with flutter on PATH. Connect one authorized Android phone with USB debugging enabled, or start an Android emulator. From the source root run:

```sh
node scripts/connect-android-demo.mjs --apk /path/to/Rescue-Reports-USB-Test.apk
```

Use `--device SERIAL` when multiple devices are connected. The script forwards ports 3407, 9407 and 8407, installs without wiping app data, and launches the app. Firebase honors the explicitly configured address. Cleartext traffic is allowed only by the debug Android manifest. The production release guard remains intact. A release build needs owned identifiers, signing assets and real build-time provider configuration.

## Honest demonstration limits

No hotline is invented. Real Cloudinary upload/delete, email/push delivery, physical devices, TalkBack/VoiceOver and signed/iOS releases are not certified by this local demo. An AOSP emulator without Google Play Services cannot verify FCM. Do not present widget screenshots, Chrome captures or synthetic narration as physical-phone evidence or a member's own voice.
