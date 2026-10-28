import '../notifications/notification_action.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../data/api_client.dart';
import '../../data/report_models.dart';
import '../../data/services.dart';
import '../../theme/app_theme.dart';
import '../auth/auth_widgets.dart';
import '../report/report_flow_page.dart' show typeInfoFor;
import 'status_timeline.dart';
import '../../theme/product_widgets.dart';

String formatWhen(DateTime? t) {
  if (t == null) return 'Time not known';
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  final l = t.toLocal();
  final hh = l.hour.toString().padLeft(2, '0');
  final mm = l.minute.toString().padLeft(2, '0');
  return '${l.day} ${months[l.month - 1]} ${l.year}, $hh:$mm';
}

class StatusChip extends StatelessWidget {
  const StatusChip(this.status, {super.key});
  final String status;

  @override
  Widget build(BuildContext context) {
    final s = StatusStyle.of(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: s.color.withValues(alpha: .09),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(s.icon, size: 16, color: s.color),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              s.label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: s.color,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class MyReportsPage extends StatefulWidget {
  const MyReportsPage({super.key, required this.uid});
  final String uid;

  @override
  State<MyReportsPage> createState() => _MyReportsPageState();
}

class _MyReportsPageState extends State<MyReportsPage> {
  int _windowSize = 50;
  late Stream<List<ReportSummary>> _stream = context
      .read<ReportsRepository>()
      .watchMyReports(widget.uid);

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('My reports'),
          actions: const [NotificationAction()],
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Active'),
              Tab(text: 'History'),
            ],
          ),
        ),
        body: ProductViewport(
          child: StreamBuilder<List<ReportSummary>>(
            stream: _stream,
            builder: (context, snap) {
              if (snap.hasError) {
                return const Padding(
                  padding: EdgeInsets.all(16),
                  child: InlineError(
                    'Could not load your reports. Check your connection and try again later.',
                  ),
                );
              }
              if (!snap.hasData) return const ProductLoading();
              final all = sortNewestFirst(snap.data!);
              return Column(
                children: [
                  if (all.length >= _windowSize)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              'Showing ${all.length} newest reports.',
                            ),
                          ),
                          if (all.length >= _windowSize)
                            TextButton(
                              onPressed: () => setState(() {
                                _windowSize += 50;
                                _stream = context
                                    .read<ReportsRepository>()
                                    .watchMyReports(
                                      widget.uid,
                                      windowSize: _windowSize,
                                    );
                              }),
                              child: const Text('Load older'),
                            ),
                        ],
                      ),
                    ),
                  Expanded(
                    child: TabBarView(
                      children: [
                        _ReportList(
                          items: all
                              .where((r) => !isHistoryStatus(r.status))
                              .toList(),
                          empty: 'No active reports.',
                          stream: _stream,
                        ),
                        _ReportList(
                          items: all
                              .where((r) => isHistoryStatus(r.status))
                              .toList(),
                          empty: 'No past reports yet.',
                          stream: _stream,
                        ),
                      ],
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _ReportList extends StatelessWidget {
  const _ReportList({
    required this.items,
    required this.empty,
    required this.stream,
  });
  final List<ReportSummary> items;
  final String empty;
  final Stream<List<ReportSummary>> stream;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return ProductEmpty(
        title: empty,
        description:
            'Reports you send appear here, with their latest status and response updates.',
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: items.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (context, i) {
        final r = items[i];
        return Card(
          child: InkWell(
            borderRadius: BorderRadius.circular(AppRadius.lg),
            onTap: () async {
              final messenger = ScaffoldMessenger.of(context);
              final result = await Navigator.of(context).push<String>(
                MaterialPageRoute(
                  builder: (_) => ReportDetailPage(
                    initial: r,
                    updates: context
                        .read<ReportsRepository>()
                        .watchReport(r.id)
                        .map((row) => row == null ? <ReportSummary>[] : [row]),
                  ),
                ),
              );
              if (result != null) {
                messenger.showSnackBar(SnackBar(content: Text(result)));
              }
            },
            child: _ResidentReportContent(report: r),
          ),
        );
      },
    );
  }
}

class ReportDetailPage extends StatefulWidget {
  const ReportDetailPage({
    super.key,
    required this.initial,
    required this.updates,
  });
  final ReportSummary initial;
  final Stream<List<ReportSummary>> updates;

  @override
  State<ReportDetailPage> createState() => _ReportDetailPageState();
}

class _ReportDetailPageState extends State<ReportDetailPage> {
  bool _busy = false;
  String? _error;
  Stream<List<ProgressEntry>>? _progress;

  // The rescue updates the responders post. The resident can read them on their own report.
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _progress ??= context.read<ResponderRepository>().watchUpdates(
      widget.initial.id,
    );
  }

  Future<void> _cancel(ReportSummary r) async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Cancel this report?'),
        content: const Text(
          'Responders will not act on it. You can send a new report at any time.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: const Text('Keep report'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(c, true),
            child: const Text('Yes, cancel it'),
          ),
        ],
      ),
    );
    if (yes != true || !mounted) return;
    final repo = context.read<ReportsRepository>();
    final nav = Navigator.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await repo.cancel(r.id);
      nav.pop('Your report was cancelled.');
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = e.status == 409
            ? 'This report can no longer be cancelled.'
            : e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = 'Could not cancel the report. Please try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<ReportSummary>>(
      stream: widget.updates,
      initialData: [widget.initial],
      builder: (context, snap) {
        final r =
            (snap.data ?? const <ReportSummary>[])
                .where((x) => x.id == widget.initial.id)
                .firstOrNull ??
            widget.initial;
        final info = typeInfoFor(r.type);
        return Scaffold(
          appBar: AppBar(title: const Text('Report details')),
          body: ProductViewport(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                ProductSurface(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Icon(info.icon, color: AppColors.primary),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              reportTypeLabel(r.type, r.typeDetail),
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        formatWhen(r.createdAt),
                        style: const TextStyle(color: AppColors.muted),
                      ),
                      if (r.reference != null)
                        Text('Reference: ${r.reference}'),
                      const SizedBox(height: 12),
                      Text(r.description),
                      const SizedBox(height: 12),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: StatusChip(r.status),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                ProductSurface(
                  child: StreamBuilder<List<ProgressEntry>>(
                    stream: _progress,
                    builder: (context, progress) {
                      final entries = progress.data ?? const <ProgressEntry>[];
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'Rescue updates',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const SizedBox(height: 8),
                          if (entries.isEmpty)
                            const Text('No rescue updates yet.')
                          else
                            for (final e in entries)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      e.status,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    if (e.at != null)
                                      Text(
                                        formatWhen(e.at),
                                        style: const TextStyle(
                                          color: AppColors.muted,
                                        ),
                                      ),
                                    if (e.peopleRescued > 0)
                                      Text(
                                        'People rescued: ${e.peopleRescued}',
                                      ),
                                    if (e.note.trim().isNotEmpty)
                                      Text(e.note.trim()),
                                  ],
                                ),
                              ),
                        ],
                      );
                    },
                  ),
                ),
                ProductSurface(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'Progress',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 12),
                      StatusTimeline(status: r.status),
                    ],
                  ),
                ),
                if (r.status == 'Submitted') ...[
                  const SizedBox(height: 16),
                  OutlinedButton(
                    onPressed: _busy ? null : () => _cancel(r),
                    child: const Text('Cancel report'),
                  ),
                ],
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  InlineError(_error!),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

class _ResidentReportContent extends StatelessWidget {
  const _ResidentReportContent({required this.report});
  final ReportSummary report;
  @override
  Widget build(BuildContext context) {
    final info = typeInfoFor(report.type);
    return Padding(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: info.color.withValues(alpha: .09),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(info.icon, color: info.color, size: 23),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      reportTypeLabel(report.type, report.typeDetail),
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    if (report.reference != null) ...[
                      const SizedBox(height: 3),
                      Text(
                        report.reference!,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ],
                ),
              ),
              const Icon(
                Icons.arrow_forward_rounded,
                color: AppColors.muted,
                size: 20,
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            report.description,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.bodyLarge,
          ),
          const SizedBox(height: 16),
          StatusChip(report.status),
          const SizedBox(height: 16),
          const Divider(height: 1),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(
                Icons.schedule_rounded,
                size: 16,
                color: AppColors.muted,
              ),
              const SizedBox(width: 7),
              Expanded(
                child: Text(
                  formatWhen(report.createdAt),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
