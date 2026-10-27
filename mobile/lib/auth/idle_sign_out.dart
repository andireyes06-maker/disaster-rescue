import 'dart:async';

import 'package:flutter/widgets.dart';

/// How long a resident can go without touching the app before they are signed out.
const residentIdleTimeout = Duration(minutes: 30);

/// Signs the person out after [timeout] with no touch or scroll. Used for residents only.
class IdleSignOut extends StatefulWidget {
  const IdleSignOut({
    super.key,
    required this.child,
    required this.onIdle,
    this.timeout = residentIdleTimeout,
  });

  final Widget child;
  final Duration timeout;
  final Future<void> Function() onIdle;

  @override
  State<IdleSignOut> createState() => _IdleSignOutState();
}

class _IdleSignOutState extends State<IdleSignOut> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _restart();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _restart() {
    _timer?.cancel();
    _timer = Timer(widget.timeout, () {
      if (mounted) widget.onIdle();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Listener(
      behavior: HitTestBehavior.translucent,
      onPointerDown: (_) => _restart(),
      onPointerMove: (_) => _restart(),
      onPointerSignal: (_) => _restart(),
      child: widget.child,
    );
  }
}
