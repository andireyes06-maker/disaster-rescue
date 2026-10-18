import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../auth/auth_controller.dart';
import '../../auth/auth_repository.dart';
import '../../data/report_models.dart';
import '../../data/services.dart';
import '../auth/auth_widgets.dart';
import '../../theme/product_widgets.dart';

const privacyNotice =
    '$consentText Your exact location is visible only to the dispatcher, the disaster office, the responder '
    'assigned to your report, and you. Public views show an approximate area.';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key, required this.user});
  final AuthUser user;

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  late final Future<Profile?> _profile = context.read<ProfileRepository>().load(widget.user.uid);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: SafeArea(
        child: FutureBuilder<Profile?>(
          future: _profile,
          builder: (context, snap) {
            final p = snap.data;
            Widget field(String label, String? value) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(label, style: const TextStyle(fontSize: 13)),
                      Text(value == null || value.isEmpty ? 'Not set' : value,
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                    ],
                  ),
                );
            return ListView(
              padding: const EdgeInsets.all(20),
              children: [
                const ProductIntro(title: 'Your account', description: 'Your contact details and account information, in one place.', icon: Icons.person_outline),
                field('Name', p?.name),
                field('Email', widget.user.email),
                field('Phone', p?.phone),
                const SizedBox(height: 16),
                Text('Privacy', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                const Text(privacyNotice),
                const SizedBox(height: 24),
                OutlinedButton.icon(
                  onPressed: () => context.read<AuthController>().logout(),
                  icon: const Icon(Icons.logout),
                  label: const Text('Log out'),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
