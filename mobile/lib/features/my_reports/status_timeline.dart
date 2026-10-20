import 'package:flutter/material.dart';

import '../../data/report_models.dart';
import '../../theme/app_theme.dart';

/// The eight workflow statuses as a vertical timeline. Each step carries a
/// text marker (Done, Current, Pending) and an icon, never color alone.
class StatusTimeline extends StatelessWidget {
  const StatusTimeline({super.key, required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    if (terminalSideStatuses.contains(status)) {
      final style = StatusStyle.of(status);
      return Container(
        key: const Key('terminal-note'),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.primarySoft,
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(style.icon, color: AppColors.text),
            const SizedBox(width: 12),
            Expanded(child: Text(_note(status))),
          ],
        ),
      );
    }
    final current = workflowStatuses.indexOf(status);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < workflowStatuses.length; i++)
          _Step(
            key: Key('timeline-${workflowStatuses[i]}'),
            status: workflowStatuses[i],
            marker: i < current
                ? 'Done'
                : (i == current ? 'Current' : 'Pending'),
            last: i == workflowStatuses.length - 1,
          ),
      ],
    );
  }

  static String _note(String s) {
    switch (s) {
      case 'Rejected':
        return 'This report was rejected after review. It will not move forward. If you are still in danger, call the hotline.';
      case 'Duplicate':
        return 'This report was marked as a duplicate of another report about the same event. That report is being handled.';
      default:
        return 'This report was cancelled. No further action will be taken.';
    }
  }
}

class _Step extends StatelessWidget {
  const _Step({
    super.key,
    required this.status,
    required this.marker,
    required this.last,
  });
  final String status;
  final String marker;
  final bool last;

  @override
  Widget build(BuildContext context) {
    final isCurrent = marker == 'Current';
    final done = marker == 'Done';
    final style = StatusStyle.of(status);
    final dotIcon = done
        ? Icons.check_rounded
        : (isCurrent ? style.icon : Icons.circle_outlined);
    final color = done || isCurrent ? AppColors.primary : AppColors.muted;
    return Semantics(
      label: 'Status $status, $marker',
      excludeSemantics: true,
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              width: 32,
              child: Column(
                children: [
                  Container(
                    width: 28,
                    height: 28,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: isCurrent
                          ? AppColors.primary
                          : (done ? AppColors.primarySoft : AppColors.surface),
                      shape: BoxShape.circle,
                      border: isCurrent || done
                          ? null
                          : Border.all(color: AppColors.border),
                    ),
                    child: Icon(
                      dotIcon,
                      color: isCurrent ? Colors.white : color,
                      size: isCurrent || done ? 16 : 10,
                    ),
                  ),
                  if (!last)
                    Expanded(
                      child: Container(
                        width: 2,
                        color: done
                            ? AppColors.primary
                            : AppColors.muted.withValues(alpha: 0.4),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: Wrap(
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 8,
                  runSpacing: 2,
                  children: [
                    Text(
                      status,
                      style: TextStyle(
                        fontWeight: isCurrent
                            ? FontWeight.w700
                            : FontWeight.w500,
                        color: isCurrent || done
                            ? AppColors.text
                            : AppColors.muted,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: isCurrent
                            ? AppColors.primary
                            : AppColors.primarySoft,
                        borderRadius: BorderRadius.circular(AppRadius.md),
                      ),
                      child: Text(
                        marker,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: isCurrent ? Colors.white : AppColors.muted,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
