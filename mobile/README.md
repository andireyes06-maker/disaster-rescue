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
