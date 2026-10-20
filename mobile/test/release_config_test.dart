import 'package:disaster_rescue/config/release_config.dart';
import 'package:flutter_test/flutter_test.dart';

/// A complete, valid release configuration. Each test changes one value.
List<String> check({
  bool releaseMode = true,
  String apiBaseUrl = 'https://api.example.org/api',
  bool useEmulators = false,
  String firebaseApiKey = 'key',
  String firebaseAppId = 'app',
  String firebaseSenderId = 'sender',
  String firebaseProjectId = 'project',
}) =>
    releaseConfigErrors(
      releaseMode: releaseMode,
      apiBaseUrl: apiBaseUrl,
      useEmulators: useEmulators,
      firebaseApiKey: firebaseApiKey,
      firebaseAppId: firebaseAppId,
      firebaseSenderId: firebaseSenderId,
      firebaseProjectId: firebaseProjectId,
    );

void main() {
  test('a complete HTTPS release configuration has no errors', () {
    expect(check(), isEmpty);
  });

  test('debug builds report nothing, even with the emulator default host', () {
    expect(
      check(releaseMode: false, apiBaseUrl: 'http://10.0.2.2:8080/api', useEmulators: true, firebaseApiKey: ''),
      isEmpty,
    );
  });

  test('a cleartext HTTP API URL is rejected and the message mentions HTTPS', () {
    final errors = check(apiBaseUrl: 'http://api.example.org/api');
    expect(errors, hasLength(1));
    expect(errors.single, contains('HTTPS'));
  });

  test('an unset API URL is rejected', () {
    final errors = check(apiBaseUrl: '');
    expect(errors, isNotEmpty);
    expect(errors.join(' '), contains('API_BASE_URL'));
  });

  test('the Android emulator host 10.0.2.2 is rejected in release', () {
    final errors = check(apiBaseUrl: 'https://10.0.2.2/api');
    expect(errors.join(' '), contains('10.0.2.2'));
  });

  test('localhost is rejected in release', () {
    final errors = check(apiBaseUrl: 'https://localhost/api');
    expect(errors.join(' '), contains('localhost'));
  });

  test('emulators enabled in release is rejected and the message mentions emulators', () {
    final errors = check(useEmulators: true);
    expect(errors.join(' '), contains('emulators'));
  });

  test('a missing Firebase API key is rejected and the message names the key', () {
    final errors = check(firebaseApiKey: '');
    expect(errors.join(' '), contains('FIREBASE_API_KEY'));
  });

  test('each missing Firebase value is reported', () {
    final errors = check(firebaseAppId: '', firebaseSenderId: '', firebaseProjectId: '');
    expect(errors, hasLength(3));
  });
}
