import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'auth/auth_controller.dart';
import 'auth/auth_repository.dart';
import 'auth/role_gate.dart';
import 'data/api_client.dart';
import 'firebase_bootstrap.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (!firebaseConfigured) {
    runApp(const _MissingConfigApp());
    return;
  }
  await initFirebase();
  final auth = FirebaseAuth.instance;
  late final ApiClient api;
  api = ApiClient(
    baseUrl: apiBaseUrl,
    tokenProvider: () async => auth.currentUser?.getIdToken(),
  );
  final repo = FirebaseAuthRepository(auth, () => api);
  runApp(
    MultiProvider(
      providers: [
        Provider<ApiClient>.value(value: api),
        Provider<AuthRepository>.value(value: repo),
        ChangeNotifierProvider<AuthController>(create: (_) => AuthController(repo)),
      ],
      child: MaterialApp(
        title: 'Disaster Rescue',
        theme: AppTheme.light,
        home: const RoleGate(),
      ),
    ),
  );
}

class _MissingConfigApp extends StatelessWidget {
  const _MissingConfigApp();

  @override
  Widget build(BuildContext context) => MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(
          body: Center(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Text('Firebase is not configured. Run the app with the --dart-define values in mobile/README.md.'),
            ),
          ),
        ),
      );
}
