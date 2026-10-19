import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'auth/auth_backend.dart';
import 'auth/auth_controller.dart';
import 'auth/auth_repository.dart';
import 'auth/role_gate.dart';
import 'data/api_client.dart';
import 'data/services.dart';
import 'features/notifications/push_registration.dart';
import 'features/report/report_draft_store.dart';
import 'firebase_bootstrap.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (releaseErrors.isNotEmpty) {
    runApp(
      _ConfigErrorApp(
        'This release build is not configured safely. ${releaseErrors.join(' ')}',
      ),
    );
    return;
  }
  if (!firebaseConfigured) {
    runApp(
      const _ConfigErrorApp(
        'Firebase is not configured. Run the app with the --dart-define values in mobile/README.md.',
      ),
    );
    return;
  }
  try {
    await initFirebase();
  } catch (_) {
    runApp(
      const _ConfigErrorApp(
        'Firebase could not start. Check the --dart-define values in mobile/README.md.',
      ),
    );
    return;
  }
  final backend = FirebaseAuthBackend(FirebaseAuth.instance);
  late final ApiClient api;
  api = ApiClient(
    baseUrl: apiBaseUrl,
    tokenProvider: () async => backend.currentUser?.idToken(),
  );
  final push = PushRegistration(api, FirebasePushMessaging());
  final repo = FirebaseAuthRepository(
    backend,
    () => api,
    beforeSignOut: push.unregister,
  );
  // Created before runApp so it is listening from the start.
  final controller = AuthController(repo);
  runApp(
    MultiProvider(
      providers: [
        Provider<ApiClient>.value(value: api),
        Provider<AuthRepository>.value(value: repo),
        ChangeNotifierProvider<AuthController>.value(value: controller),
        Provider<ReportsRepository>.value(
          value: ApiReportsRepository(api, FirebaseFirestore.instance),
        ),
        Provider<LocationService>.value(value: GeolocatorLocationService()),
        Provider<PhotoService>.value(value: ImagePickerPhotoService()),
        Provider<PhoneDialer>.value(value: UrlLauncherDialer()),
        Provider<HotlineRepository>.value(
          value: FirestoreHotlineRepository(FirebaseFirestore.instance),
        ),
        Provider<ProfileRepository>.value(
          value: FirestoreProfileRepository(FirebaseFirestore.instance),
        ),
        Provider<DraftStore>.value(value: ReportDraftStore(currentUid: () => controller.user?.uid)),
        Provider<ResponderRepository>.value(
          value: ApiResponderRepository(api, FirebaseFirestore.instance),
        ),
        Provider<NotificationsRepository>.value(
          value: ApiNotificationsRepository(api, FirebaseFirestore.instance),
        ),
        Provider<PushRegistration>.value(value: push),
      ],
      child: MaterialApp(
        title: 'Rescue Reports',
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
