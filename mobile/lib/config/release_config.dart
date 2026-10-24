/// Pure check of the --dart-define values for a non-debug build (release and profile). Returns one message per problem.
/// Only debug builds are skipped, so they keep the emulator defaults.
List<String> releaseConfigErrors({
  required bool nonDebug,
  required String apiBaseUrl,
  required bool useEmulators,
  required String firebaseApiKey,
  required String firebaseAppId,
  required String firebaseSenderId,
  required String firebaseProjectId,
}) {
  if (!nonDebug) return const [];
  final errors = <String>[];

  if (apiBaseUrl.trim().isEmpty) {
    errors.add('API_BASE_URL must be set for a release build.');
  } else {
    final uri = Uri.tryParse(apiBaseUrl.trim());
    if (uri == null || !uri.hasAuthority) {
      errors.add('API_BASE_URL must be a full URL.');
    } else {
      if (uri.scheme != 'https') {
        errors.add('API_BASE_URL must use HTTPS in a release build.');
      }
      const localHosts = {'10.0.2.2', 'localhost', '127.0.0.1'};
      if (localHosts.contains(uri.host)) {
        errors.add('API_BASE_URL must not point to 10.0.2.2, localhost or 127.0.0.1.');
      }
    }
  }

  if (useEmulators) {
    errors.add('USE_EMULATORS must be false: a release build cannot use the emulators.');
  }

  if (firebaseApiKey.isEmpty) errors.add('FIREBASE_API_KEY must be set for a release build.');
  if (firebaseAppId.isEmpty) errors.add('FIREBASE_APP_ID must be set for a release build.');
  if (firebaseSenderId.isEmpty) {
    errors.add('FIREBASE_MESSAGING_SENDER_ID must be set for a release build.');
  }
  if (firebaseProjectId.isEmpty) errors.add('FIREBASE_PROJECT_ID must be set for a release build.');

  return errors;
}
