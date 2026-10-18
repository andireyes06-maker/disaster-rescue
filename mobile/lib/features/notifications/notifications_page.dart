import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../data/report_models.dart';
import '../../data/services.dart';
import '../../theme/app_theme.dart';
import '../auth/auth_widgets.dart';
import '../my_reports/my_reports_page.dart' show formatWhen;
import '../../theme/product_widgets.dart';

class NotificationsPage extends StatefulWidget {
  const NotificationsPage({super.key, required this.uid});
  final String uid;

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  late final Stream<List<AppNotification>> _stream = context
      .read<NotificationsRepository>()
      .watch(widget.uid);

  Future<void> _open(AppNotification n) async {
    if (n.read) return;
    try {
      await context.read<NotificationsRepository>().markRead(n.id);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Could not mark this notification as read.'),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: StreamBuilder<List<AppNotification>>(
        stream: _stream,
        builder: (context, snap) {
          if (snap.hasError) {
            return const Padding(
              padding: EdgeInsets.all(16),
              child: InlineError(
                'Could not load notifications. Check your connection and try again.',
              ),
            );
          }
          if (!snap.hasData) {
            return const ProductLoading();
          }
          final items = snap.data!;
          if (items.isEmpty) {
            return const ProductEmpty(title: 'No notifications yet.', description: 'Updates from your response team will appear here.', icon: Icons.notifications_none_outlined);
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            separatorBuilder: (context, index) => const SizedBox(height: 8),
            itemBuilder: (context, i) =>
                _NotificationRow(item: items[i], onTap: () => _open(items[i])),
          );
        },
      ),
    );
  }
}

class _NotificationRow extends StatelessWidget {
  const _NotificationRow({required this.item, required this.onTap});
  final AppNotification item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final unread = !item.read;
    return Card(
      key: ValueKey('notification-${item.id}'),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        side: BorderSide(
          color: unread ? AppColors.primary.withValues(alpha: 0.35) : AppColors.border,
          width: 1,
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (unread)
                Padding(
                  key: ValueKey('unread-${item.id}'),
                  padding: const EdgeInsets.only(top: 6, right: 10),
                  child: const Icon(
                    Icons.circle,
                    size: 10,
                    color: AppColors.primary,
                  ),
                )
              else
                const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.title,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: unread ? FontWeight.w700 : FontWeight.w400,
                        color: AppColors.text,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.body,
                      style: const TextStyle(color: AppColors.muted),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      formatWhen(item.createdAt),
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.muted,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
