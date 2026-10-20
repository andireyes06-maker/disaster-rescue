import 'package:flutter/widgets.dart';

import 'auth_repository.dart';

/// Pops every pushed page, and runs [onChange], when the signed-in identity changes or the session ends. Without this, a
/// page opened under one account, team or role could stay on top of the next session's view.
class SessionNavigationReset {
  SessionNavigationReset(this.navigatorKey, {this.onChange});

  final GlobalKey<NavigatorState> navigatorKey;
  final void Function()? onChange;
  String? _identity;

  /// Call with each auth state. Nothing happens while the identity stays the same.
  void update(AuthUser? user) {
    final next = user == null
        ? null
        : '${user.uid}|${user.role ?? ''}|${user.team ?? ''}|${user.syncing}';
    if (next == _identity) return;
    _identity = next;
    navigatorKey.currentState?.popUntil((route) => route.isFirst);
    onChange?.call();
  }
}
