import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'auth/auth_backend.dart';
import 'auth/auth_controller.dart';
import 'auth/auth_repository.dart';
import 'auth/role_gate.dart';
import 'data/api_client.dart';
import 'firebase_bootstrap.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (!firebaseConfigured) {
    runApp(const _ConfigErrorApp(
        'Firebase is not configured. Run the app with the --dart-define values in mobile/README.md.'));
    return;
  }
  try {
    await initFirebase();
  } catch (_) {
    runApp(const _ConfigErrorApp(
        'Firebase could not start. Check the --dart-define values in mobile/README.md.'));
    return;
  }
  final backend = FirebaseAuthBackend(FirebaseAuth.instance);
  late final ApiClient api;
  api = ApiClient(
    baseUrl: apiBaseUrl,
    tokenProvider: () async => backend.currentUser?.idToken(),
  );
  final repo = FirebaseAuthRepository(backend, () => api);
  // Created before runApp so it is listening from the start.
  final controller = AuthController(repo);
  runApp(
    MultiProvider(
      providers: [
        Provider<ApiClient>.value(value: api),
        Provider<AuthRepository>.value(value: repo),
        ChangeNotifierProvider<AuthController>.value(value: controller),
      ],
      child: MaterialApp(
        title: 'Disaster Rescue',
        theme: AppTheme.light,
        home: const RoleGate(),
      ),
    ),
  );
}

class _ConfigErrorApp extends StatelessWidget {
  const _ConfigErrorApp(this.message);
  final String message;

  @override
  Widget build(BuildContext context) => MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: Center(
            child: Padding(padding: const EdgeInsets.all(24), child: Text(message)),
          ),
        ),
      );
}
