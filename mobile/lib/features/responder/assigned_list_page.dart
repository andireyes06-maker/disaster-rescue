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
      _closed = team == null ? null : context.read<ResponderRepository>().watchRecentlyClosed(team);
      _stream = team == null
          ? null
          : context.read<ResponderRepository>().watchAssigned(team);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthController>();
    final team = _teamId;
    return DefaultTabController(length: 2, child: Scaffold(
      appBar: AppBar(
        title: const Text('Assigned'),
        bottom: const TabBar(tabs: [Tab(text: 'Active'), Tab(text: 'Recently closed')]),
        actions: [
          if (team != null)
            IconButton(
              tooltip: 'Incident map',
              icon: const Icon(Icons.map_outlined),
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => IncidentMapPage(
                    reports: context.read<ResponderRepository>().watchAssigned(
                      team,
                    ),
                    viewerUid: auth.user?.uid ?? '',
                    viewerTeam: team,
                  ),
                ),
              ),
            ),
          TextButton(onPressed: auth.logout, child: const Text('Log out')),
        ],
      ),
      body: _stream == null
          ? const Padding(
              padding: EdgeInsets.all(16),
              child: InlineError(
                'No team is assigned to your account. Ask your dispatcher.',
              ),
            )
          : TabBarView(children: [StreamBuilder<List<AssignedReport>>(
              stream: _stream,
              builder: (context, snap) {
                if (snap.hasError) {
                  return const Padding(
                    padding: EdgeInsets.all(16),
                    child: InlineError(
                      'Could not load assigned reports. Check your connection and try again.',
                    ),
                  );
                }
                if (!snap.hasData) {
                  return const ProductLoading();
                }
                final active =
                    snap.data!.where((r) => !isHistoryStatus(r.status)).toList()
                      ..sort((a, b) {
                        final x = a.createdAt, y = b.createdAt;
                        // Oldest first, ties by id so the order is the same on every load.
                        if (x == null && y == null) return a.id.compareTo(b.id);
                        if (x == null) return 1;
                        if (y == null) return -1;
                        final c = x.compareTo(y);
                        return c != 0 ? c : a.id.compareTo(b.id);
                      });
                if (active.isEmpty) {
                  return const ProductEmpty(title: 'No assigned reports right now.', description: 'New assignments from dispatch will appear here.', icon: Icons.assignment_turned_in_outlined);
                }
                return Column(children: [if (active.length >= _windowSize) Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: Row(children: [Expanded(child: Text('Showing ${active.length} newest active reports.')), if(active.length >= _windowSize) TextButton(onPressed: () => setState(() { _windowSize += 50; _stream = context.read<ResponderRepository>().watchAssigned(team!, windowSize: _windowSize); }), child: const Text('Load older'))])), Expanded(child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: active.length,
                  separatorBuilder: (context, index) =>
                      const SizedBox(height: 12),
                  itemBuilder: (context, i) => _AssignedTile(report: active[i]),
                ))]);
              },
            ),
            StreamBuilder<List<AssignedReport>>(stream: _closed, builder: (context, snap) {
              if (snap.hasError) return const ProductEmpty(title: 'Could not load closed reports.', description: 'Check your connection and return to this tab.');
              if (!snap.hasData) return const ProductLoading();
              final reports = snap.data!;
              if (reports.isEmpty) return const ProductEmpty(title: 'No recently closed reports.', description: 'The ten most recent completed reports for your team appear here.');
              return ListView.separated(padding: const EdgeInsets.all(16), itemCount: reports.length, separatorBuilder: (_, _) => const SizedBox(height: 12), itemBuilder: (context, index) => _AssignedTile(report: reports[index]));
            }),
            ]),
    ));
  }
}

class _AssignedTile extends StatelessWidget {
  const _AssignedTile({required this.report});
  final AssignedReport report;

  @override
  Widget build(BuildContext context) {
    final place = report.addressText?.trim();
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => IncidentDetailPage(report: report)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      report.reference ?? report.id,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 16,
                      ),
                    ),
                  ),
                  StatusChip(report.status),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                report.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              Text(
                [
                  if (place != null && place.isNotEmpty) place,
                  formatWhen(report.createdAt),
                ].join(' · '),
                style: const TextStyle(color: AppColors.muted, fontSize: 13),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
