import 'dart:async';

import 'package:firebase_messaging/firebase_messaging.dart';

import '../../data/api_client.dart';

/// The slice of FCM this app uses. Tests fake it; no real FCM is reached.
abstract class PushMessaging {
  /// True when the user allowed notifications.
  Future<bool> requestPermission();
  Future<String?> getToken();
  Stream<String> get onTokenRefresh;
}

class FirebasePushMessaging implements PushMessaging {
  @override
  Future<bool> requestPermission() async {
    final s = await FirebaseMessaging.instance.requestPermission();
    return s.authorizationStatus == AuthorizationStatus.authorized ||
        s.authorizationStatus == AuthorizationStatus.provisional;
  }

  @override
  Future<String?> getToken() => FirebaseMessaging.instance.getToken();

  @override
  Stream<String> get onTokenRefresh =>
      FirebaseMessaging.instance.onTokenRefresh;
}

class PushRegistration {
  PushRegistration(this._api, this._messaging);

  final ApiClient _api;
  final PushMessaging _messaging;
  StreamSubscription<String>? _refreshSub;
  String? _token;

  /// Asks for permission, registers the current token, and re-registers on refresh.
  Future<void> init() async {
    if (!await _messaging.requestPermission()) return;
    final t = await _messaging.getToken();
    if (t != null && t.isNotEmpty) await _register(t);
    _refreshSub ??= _messaging.onTokenRefresh.listen((t) {
      if (t.isNotEmpty) _register(t);
    });
  }

  Future<void> _register(String token) async {
    await _api.send('POST', '/devices', body: {'token': token});
    _token = token;
  }

  /// Called before sign-out, while the user is still authenticated. Failures
  /// are swallowed so sign-out always completes.
  Future<void> unregister() async {
    await _refreshSub?.cancel();
    _refreshSub = null;
    final t = _token;
    if (t == null) return;
    _token = null;
    try {
      await _api.send('DELETE', '/devices/${Uri.encodeComponent(t)}');
    } catch (_) {}
  }
}
