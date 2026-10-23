import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../auth/auth_controller.dart';
import 'notifications_page.dart';

/// A consistent route into notifications without adding a feed to the task screen.
class NotificationAction extends StatelessWidget {
  const NotificationAction({super.key});
  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthController>().user;
    if (user == null || user.syncing) return const SizedBox.shrink();
    return IconButton(
      tooltip: 'Notifications',
      icon: const Icon(Icons.notifications_outlined),
      onPressed: () => Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => NotificationsPage(uid: user.uid),
        ),
      ),
    );
  }
}
