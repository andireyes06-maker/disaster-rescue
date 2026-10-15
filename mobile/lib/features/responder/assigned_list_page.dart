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

class AssignedListPage extends StatefulWidget {
  const AssignedListPage({super.key});

  @override
  State<AssignedListPage> createState() => _AssignedListPageState();
}

class _AssignedListPageState extends State<AssignedListPage> {
  Stream<List<AssignedReport>>? _stream;
  String? _teamId;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final team = context.watch<AuthController>().user?.team;
    if (team != _teamId) {
      _teamId = team;
      _stream = team == null
          ? null
          : context.read<ResponderRepository>().watchAssigned(team);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthController>();
    final team = _teamId;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Assigned'),
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
          : StreamBuilder<List<AssignedReport>>(
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
                  return const Center(child: CircularProgressIndicator());
                }
                final active =
                    snap.data!.where((r) => !isHistoryStatus(r.status)).toList()
                      ..sort((a, b) {
                        final x = a.createdAt, y = b.createdAt;
                        if (x == null && y == null) return 0;
                        if (x == null) return 1;
                        if (y == null) return -1;
                        return y.compareTo(x);
                      });
                if (active.isEmpty) {
                  return const Center(
                    child: Text('No assigned reports right now.'),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: active.length,
                  separatorBuilder: (context, index) =>
                      const SizedBox(height: 12),
                  itemBuilder: (context, i) => _AssignedTile(report: active[i]),
                );
              },
            ),
    );
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
