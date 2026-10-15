import 'package:firebase_core/firebase_core.dart';

/// Values come from --dart-define so no real config is committed.
const apiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:8080/api');

const _apiKey = String.fromEnvironment('FIREBASE_API_KEY');
const _appId = String.fromEnvironment('FIREBASE_APP_ID');
const _senderId = String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID');
const _projectId = String.fromEnvironment('FIREBASE_PROJECT_ID');

bool get firebaseConfigured =>
    _apiKey.isNotEmpty && _appId.isNotEmpty && _senderId.isNotEmpty && _projectId.isNotEmpty;

Future<void> initFirebase() {
  return Firebase.initializeApp(
    options: const FirebaseOptions(
      apiKey: _apiKey,
      appId: _appId,
      messagingSenderId: _senderId,
      projectId: _projectId,
    ),
  );
}
