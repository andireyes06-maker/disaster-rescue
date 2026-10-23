import 'dart:async';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import '../../data/api_client.dart';

abstract class PushMessaging {
  Future<bool> requestPermission();
  Future<String?> getToken();
  Stream<String> get onTokenRefresh;
}
class FirebasePushMessaging implements PushMessaging {
  @override
  Future<bool> requestPermission() async {
    final s = await FirebaseMessaging.instance.requestPermission();
    return s.authorizationStatus == AuthorizationStatus.authorized || s.authorizationStatus == AuthorizationStatus.provisional;
  }
  @override
  Future<String?> getToken() => FirebaseMessaging.instance.getToken();
  @override
  Stream<String> get onTokenRefresh => FirebaseMessaging.instance.onTokenRefresh;
}

/// Serializes registration and sign-out. A failed refresh stays visible and can be
/// retried without allowing a stream callback to emit an unhandled Future error.
class PushRegistration {
  PushRegistration(this._api, this._messaging);
  final ApiClient _api;
  final PushMessaging _messaging;
  final registrationPending = ValueNotifier<bool>(false);
  StreamSubscription<String>? _refreshSub;
  Future<void> _queue = Future.value();
  String? _token;
  String? _pendingToken;
  bool _stopped = true;
  int _generation = 0;

  Future<void> init() async {
    final generation = _generation;
    try {
    final permitted = await _messaging.requestPermission();
    if (generation != _generation) return;
    if (!permitted) { registrationPending.value = true; return; }
    _stopped = false;
    _refreshSub ??= _messaging.onTokenRefresh.listen((token) {
      if (_stopped || token.isEmpty) return;
      _pendingToken = token;
      unawaited(retry());
    }, onError: (Object _) { registrationPending.value = true; });
    final token = await _messaging.getToken();
    if (generation != _generation || _stopped) return;
    if (token != null && token.isNotEmpty) _pendingToken = token;
    await retry();
    } catch (_) { if (generation == _generation) registrationPending.value = true; }
  }

  Future<void> retry() {
    _queue = _queue.then((_) async {
      final token = _pendingToken;
      if (_stopped || token == null) return;
      try {
        await _api.send('POST', '/devices', body: {'token': token});
        _token = token;
        if (_pendingToken == token) _pendingToken = null;
        registrationPending.value = _pendingToken != null;
      } catch (_) {
        registrationPending.value = true;
      }
    });
    return _queue;
  }

  Future<void> unregister() async {
    _stopped = true;
    _generation++;
    _pendingToken = null;
    await _refreshSub?.cancel();
    _refreshSub = null;
    await _queue;
    final token = _token;
    if (token == null) return;
    try {
      await _api.send('DELETE', '/devices/${Uri.encodeComponent(token)}');
      _token = null;
      registrationPending.value = false;
    } catch (_) {
      // Keep the binding known locally. Sign-out can finish; never send an old
      // pending registration after a different account signs in.
      registrationPending.value = true;
    }
  }
}
