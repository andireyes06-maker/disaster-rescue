import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../data/services.dart';
import '../../theme/product_widgets.dart';
import '../auth/auth_widgets.dart';

/// Keyed by account and team in ProfilePage, so old team data disappears
/// immediately when membership changes, including while a new read is pending.
class ResponderTeamDetails extends StatefulWidget {
  const ResponderTeamDetails({super.key, required this.teamId});
  final String? teamId;

  @override
  State<ResponderTeamDetails> createState() => _ResponderTeamDetailsState();
}

class _ResponderTeamDetailsState extends State<ResponderTeamDetails> {
  Stream<ResponderTeam?>? _stream;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    final id = widget.teamId?.trim();
    _stream = id == null || id.isEmpty
        ? null
        : context.read<ResponderRepository>().watchOwnTeam(id);
  }

  @override
  Widget build(BuildContext context) {
    if (_stream == null) {
      return const ProductDatum(
        label: 'Team',
        value: 'No team assigned',
        icon: Icons.groups_outlined,
      );
    }
    return StreamBuilder<ResponderTeam?>(
      stream: _stream,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const InlineError('Could not load your team details.'),
              TextButton.icon(
                onPressed: () => setState(_load),
                icon: const Icon(Icons.refresh),
                label: const Text('Retry team details'),
              ),
            ],
          );
        }
        if (snapshot.connectionState == ConnectionState.waiting) {
          return Semantics(
            liveRegion: true,
            child: const ProductDatum(
              label: 'Team',
              value: 'Loading your team…',
              icon: Icons.groups_outlined,
            ),
          );
        }
        final team = snapshot.data;
        if (team == null) {
          return const ProductDatum(
            label: 'Team',
            value: 'Your assigned team could not be found.',
            icon: Icons.groups_outlined,
          );
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ProductDatum(
              label: 'Team',
              value: team.name,
              icon: Icons.groups_outlined,
            ),
            ProductDatum(
              label: 'Team identity',
              value: team.identity,
              icon: Icons.verified_user_outlined,
            ),
          ],
        );
      },
    );
  }
}
