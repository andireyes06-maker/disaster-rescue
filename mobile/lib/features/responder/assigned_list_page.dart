import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../auth/auth_controller.dart';
import '../../data/report_models.dart';
import '../../data/services.dart';
import '../../theme/app_theme.dart';
import '../auth/auth_widgets.dart';
import '../map/incident_map_page.dart';
import '../my_reports/my_reports_page.dart' show StatusChip, formatWhen;
import 'incident_detail_page.dart';
import '../../theme/product_widgets.dart';
import '../report/report_flow_page.dart' show reportTypeInfo;

class AssignedListPage extends StatefulWidget {
  const AssignedListPage({super.key});

  @override
  State<AssignedListPage> createState() => _AssignedListPageState();
}

class _AssignedListPageState extends State<AssignedListPage> {
  Stream<List<AssignedReport>>? _stream;
  String? _teamId;
  int _windowSize = 50;
  Stream<List<AssignedReport>>? _closed;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final team = context.watch<AuthController>().user?.team;
    if (team != _teamId) {
      _teamId = team;
      _closed = team == null
          ? null
          : context.read<ResponderRepository>().watchRecentlyClosed(team);
      _stream = team == null
          ? null
          : context.read<ResponderRepository>().watchAssigned(team);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthController>();
    final team = _teamId;
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Assigned'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Active'),
              Tab(text: 'Recently closed'),
            ],
          ),
          actions: [
            if (team != null)
              IconButton(
                tooltip: 'Incident map',
                icon: const Icon(Icons.map_outlined),
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => IncidentMapPage(
                      reports: context
                          .read<ResponderRepository>()
                          .watchAssigned(team),
                      viewerUid: auth.user?.uid ?? '',
                      viewerTeam: team,
                    ),
                  ),
                ),
              ),
            TextButton(
              onPressed: auth.logout,
              style: TextButton.styleFrom(foregroundColor: Colors.white),
              child: const Text('Log out'),
            ),
          ],
        ),
        body: ProductViewport(
          child: _stream == null
              ? const ProductEmpty(
                  title: 'No response team yet.',
                  description:
                      'Assignments will appear here once your account is added to a response team.',
                  icon: Icons.groups_outlined,
                )
              : TabBarView(
                  children: [
                    StreamBuilder<List<AssignedReport>>(
                      stream: _stream,
                      builder: (context, snap) {
                        if (snap.hasError) {
                          return _retry(
                            'Could not load assigned reports. Check your connection and try again.',
                            () => setState(
                              () => _stream = context
                                  .read<ResponderRepository>()
                                  .watchAssigned(
                                    team!,
                                    windowSize: _windowSize,
                                  ),
                            ),
                          );
                        }
                        if (!snap.hasData) return const ProductLoading();
                        final active =
                            snap.data!
                                .where((r) => !isHistoryStatus(r.status))
                                .toList()
                              ..sort((a, b) {
                                final x = a.createdAt, y = b.createdAt;
                                if (x == null && y == null) {
                                  return a.id.compareTo(b.id);
                                }
                                if (x == null) return 1;
                                if (y == null) return -1;
                                final byTime = x.compareTo(y);
                                return byTime != 0
                                    ? byTime
                                    : a.id.compareTo(b.id);
                              });
                        if (active.isEmpty) {
                          return const ProductEmpty(
                            title: 'No assigned reports right now.',
                            description:
                                'New assignments from your administrator will appear here.',
                            icon: Icons.assignment_turned_in_outlined,
                          );
                        }
                        return Column(
                          children: [
                            if (active.length >= _windowSize)
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 20,
                                ),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        'Showing ${active.length} oldest active reports.',
                                      ),
                                    ),
                                    TextButton(
                                      onPressed: () => setState(() {
                                        _windowSize += 50;
                                        _stream = context
                                            .read<ResponderRepository>()
                                            .watchAssigned(
                                              team!,
                                              windowSize: _windowSize,
                                            );
                                      }),
                                      child: const Text('Load older'),
                                    ),
                                  ],
                                ),
                              ),
                            Expanded(
                              child: ListView.separated(
                                padding: const EdgeInsets.all(20),
                                itemCount: active.length,
                                separatorBuilder: (_, _) =>
                                    const SizedBox(height: 14),
                                itemBuilder: (_, i) =>
                                    _AssignedTile(report: active[i]),
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                    StreamBuilder<List<AssignedReport>>(
                      stream: _closed,
                      builder: (context, snap) {
                        if (snap.hasError) {
                          return _retry(
                            'Could not load closed reports. Check your connection and return to this tab.',
                            () => setState(
                              () => _closed = context
                                  .read<ResponderRepository>()
                                  .watchRecentlyClosed(team!),
                            ),
                          );
                        }
                        if (!snap.hasData) return const ProductLoading();
                        final reports = snap.data!;
                        if (reports.isEmpty) {
                          return const ProductEmpty(
                            title: 'No recently closed reports.',
                            description:
                                'The ten most recent completed reports for your team appear here.',
                          );
                        }
                        return ListView.separated(
                          padding: const EdgeInsets.all(20),
                          itemCount: reports.length,
                          separatorBuilder: (_, _) =>
                              const SizedBox(height: 14),
                          itemBuilder: (_, i) =>
                              _AssignedTile(report: reports[i]),
                        );
                      },
                    ),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _retry(String message, VoidCallback action) => ListView(
    padding: const EdgeInsets.all(20),
    children: [
      InlineError(message),
      const SizedBox(height: 16),
      OutlinedButton.icon(
        onPressed: action,
        icon: const Icon(Icons.refresh_rounded),
        label: const Text('Try again'),
      ),
    ],
  );
}

class _AssignedTile extends StatelessWidget {
  const _AssignedTile({required this.report});
  final AssignedReport report;
  @override
  Widget build(BuildContext context) {
    final info = reportTypeInfo[report.type] ?? reportTypeInfo['other']!;
    final place = report.addressText?.trim();
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => IncidentDetailPage(report: report)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.primarySoft,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(info.icon, color: AppColors.primary, size: 23),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          info.label,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 3),
                        Text(
                          report.reference ?? report.id,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  const Icon(
                    Icons.arrow_forward_rounded,
                    size: 20,
                    color: AppColors.muted,
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
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  StatusChip(report.status),
                  if (report.priority != null)
                    ProductPriority(report.priority!),
                ],
              ),
              const SizedBox(height: 16),
              const Divider(height: 1),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.location_on_outlined,
                    size: 17,
                    color: AppColors.muted,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      place != null && place.isNotEmpty
                          ? place
                          : 'Location in incident details',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 5),
              Text(
                formatWhen(report.createdAt),
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
