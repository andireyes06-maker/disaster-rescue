import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../data/services.dart';
import '../../theme/app_theme.dart';

/// Tells the child builder whether [uid] has unread notifications. The stream is tied to one account:
/// switching accounts replaces it, so one account never shows another's dot. A stream error shows no dot.
class NotificationBell extends StatefulWidget {
  const NotificationBell({super.key, required this.uid, required this.builder});

  final String uid;
  final Widget Function(BuildContext context, bool unread) builder;

  @override
  State<NotificationBell> createState() => _NotificationBellState();
}

class _NotificationBellState extends State<NotificationBell> {
  Stream<bool>? _unread;
  String? _unreadFor;

  Stream<bool> _streamFor(BuildContext context) {
    if (_unread == null || _unreadFor != widget.uid) {
      _unreadFor = widget.uid;
      _unread = context.read<NotificationsRepository>().watchHasUnread(widget.uid);
    }
    return _unread!;
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<bool>(
      // A new key per account also drops any value the previous account left behind.
      key: ValueKey('bell-${widget.uid}'),
      stream: _streamFor(context),
      builder: (context, snap) => widget.builder(context, snap.data == true),
    );
  }
}

/// Adds a small dot to [icon] while [unread] is true. Growing and shrinking is instant when the
/// system asks for reduced motion. The dot is decorative: the caller's label says "new" for screen readers.
class UnreadDot extends StatelessWidget {
  const UnreadDot({super.key, required this.unread, required this.icon});

  final bool unread;
  final Widget icon;

  @override
  Widget build(BuildContext context) {
    final reduce = MediaQuery.disableAnimationsOf(context);
    return Stack(
      clipBehavior: Clip.none,
      children: [
        icon,
        Positioned(
          top: 2,
          right: 2,
          child: AnimatedScale(
            scale: unread ? 1 : 0,
            duration: reduce ? Duration.zero : const Duration(milliseconds: 180),
            curve: Curves.easeOutBack,
            child: Container(
              width: 9,
              height: 9,
              decoration: BoxDecoration(
                color: AppColors.primary,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 1.5),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
