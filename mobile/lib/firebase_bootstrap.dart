import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart' show kDebugMode;

import 'config/release_config.dart';

/// Values come from --dart-define so no real config is committed.
const _apiBaseUrlDefine = String.fromEnvironment('API_BASE_URL');

/// Debug builds default to the Android emulator host. Profile and release builds have no default,
/// so an unset API_BASE_URL is reported by [releaseErrors] instead of falling back to a local host.
const apiBaseUrl = _apiBaseUrlDefine != ''
    ? _apiBaseUrlDefine
    : (kDebugMode ? 'http://10.0.2.2:8080/api' : '');

const _apiKey = String.fromEnvironment('FIREBASE_API_KEY');
const _appId = String.fromEnvironment('FIREBASE_APP_ID');
const _senderId = String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID');
const _projectId = String.fromEnvironment('FIREBASE_PROJECT_ID');

// Local demo only: --dart-define=USE_EMULATORS=true points Auth and Firestore at the emulators.
// Off by default, so a normal build never talks to an emulator.
const _useEmulators = bool.fromEnvironment('USE_EMULATORS');
const _emulatorHost = String.fromEnvironment(
  'EMULATOR_HOST',
  defaultValue: 'localhost',
);
const _firestorePort = int.fromEnvironment(
  'FIRESTORE_EMULATOR_PORT',
  defaultValue: 8080,
);
const _authPort = int.fromEnvironment('AUTH_EMULATOR_PORT', defaultValue: 9099);

bool get usingEmulators => _useEmulators;

/// Problems with this build's configuration. Always empty in debug and profile builds.
final releaseErrors = releaseConfigErrors(
  nonDebug: !kDebugMode,
  apiBaseUrl: apiBaseUrl,
  useEmulators: _useEmulators,
  firebaseApiKey: _apiKey,
  firebaseAppId: _appId,
  firebaseSenderId: _senderId,
  firebaseProjectId: _projectId,
);

bool get firebaseConfigured =>
    usingEmulators ||
    (_apiKey.isNotEmpty &&
        _appId.isNotEmpty &&
        _senderId.isNotEmpty &&
        _projectId.isNotEmpty);

Future<void> initFirebase() async {
  await Firebase.initializeApp(
    options: usingEmulators
        ? const FirebaseOptions(
            apiKey: 'demo-emulator-key',
            appId: '1:000000000000:web:demoemulator',
            messagingSenderId: '000000000000',
            projectId: 'demo-disaster-rescue',
          )
        : const FirebaseOptions(
            apiKey: _apiKey,
            appId: _appId,
            messagingSenderId: _senderId,
            projectId: _projectId,
          ),
  );
  if (usingEmulators) {
    // Honor the explicit host, including USB adb reverse on a physical phone.
    FirebaseFirestore.instance.useFirestoreEmulator(
      _emulatorHost,
      _firestorePort,
      automaticHostMapping: false,
    );
    await FirebaseAuth.instance.useAuthEmulator(
      _emulatorHost,
      _authPort,
      automaticHostMapping: false,
    );
  }
}
