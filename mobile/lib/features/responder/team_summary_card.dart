import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../data/services.dart';
import '../../theme/app_theme.dart';

/// Totals for the responder's own team. Shows nothing when the summary cannot load.
class TeamSummaryCard extends StatefulWidget {
  const TeamSummaryCard({super.key});

  @override
  State<TeamSummaryCard> createState() => _TeamSummaryCardState();
}

class _TeamSummaryCardState extends State<TeamSummaryCard> {
  late Future<TeamSummary> _summary;

  @override
  void initState() {
    super.initState();
    _summary = context.read<ResponderRepository>().teamSummary();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<TeamSummary>(
      future: _summary,
      builder: (context, snap) {
        if (!snap.hasData) return const SizedBox.shrink();
        final s = snap.data!;
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.primarySoft,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Your team',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 18,
                  runSpacing: 10,
                  children: [
                    _Stat(label: 'Assigned', value: s.total),
                    _Stat(label: 'Open', value: s.open),
                    _Stat(label: 'Resolved or closed', value: s.resolved),
                    _Stat(label: 'People rescued', value: s.peopleRescued),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Totals for your team only.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});
  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('$value', style: Theme.of(context).textTheme.headlineSmall),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}
