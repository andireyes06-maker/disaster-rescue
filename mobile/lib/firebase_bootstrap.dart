import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';

/// Values come from --dart-define so no real config is committed.
const apiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:8080/api');

const _apiKey = String.fromEnvironment('FIREBASE_API_KEY');
const _appId = String.fromEnvironment('FIREBASE_APP_ID');
const _senderId = String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID');
const _projectId = String.fromEnvironment('FIREBASE_PROJECT_ID');

// Local demo only: --dart-define=USE_EMULATORS=true points Auth and Firestore at the emulators.
// Off by default, so a normal build never talks to an emulator.
const _useEmulators = bool.fromEnvironment('USE_EMULATORS');
const _emulatorHost = String.fromEnvironment('EMULATOR_HOST', defaultValue: 'localhost');
const _firestorePort = int.fromEnvironment('FIRESTORE_EMULATOR_PORT', defaultValue: 8080);
const _authPort = int.fromEnvironment('AUTH_EMULATOR_PORT', defaultValue: 9099);

bool get usingEmulators => _useEmulators;

bool get firebaseConfigured =>
    usingEmulators ||
    (_apiKey.isNotEmpty && _appId.isNotEmpty && _senderId.isNotEmpty && _projectId.isNotEmpty);

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
    FirebaseFirestore.instance.useFirestoreEmulator(_emulatorHost, _firestorePort);
    await FirebaseAuth.instance.useAuthEmulator(_emulatorHost, _authPort);
  }
}
