import '../notifications/notification_action.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../auth/auth_controller.dart';
import '../../auth/auth_repository.dart';
import '../../data/report_models.dart';
import '../../data/services.dart';
import '../auth/auth_widgets.dart';
import '../../theme/product_widgets.dart';
import '../../theme/app_theme.dart';

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
  late Future<Profile?> _profile = context.read<ProfileRepository>().load(
    widget.user.uid,
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: const [NotificationAction()],
      ),
      body: ProductViewport(
        child: FutureBuilder<Profile?>(
          future: _profile,
          builder: (context, snap) {
            if (snap.connectionState == ConnectionState.waiting) {
              return const ProductLoading();
            }
            if (snap.hasError) {
              return ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  const InlineError(
                    'Could not load your profile. Your account details have not been changed.',
                  ),
                  const SizedBox(height: 16),
                  OutlinedButton.icon(
                    onPressed: () => setState(() {
                      _profile = context.read<ProfileRepository>().load(
                        widget.user.uid,
                      );
                    }),
                    icon: const Icon(Icons.refresh),
                    label: const Text('Try again'),
                  ),
                ],
              );
            }
            final p = snap.data;
            return ListView(
              padding: const EdgeInsets.all(20),
              children: [
                ProductSurface(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 54,
                            height: 54,
                            decoration: BoxDecoration(
                              color: AppColors.primarySoft,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: const Icon(
                              Icons.person_outline_rounded,
                              color: AppColors.primary,
                              size: 28,
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Your account',
                                  style: Theme.of(
                                    context,
                                  ).textTheme.headlineSmall,
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  widget.user.role == 'responder'
                                      ? 'Responder profile'
                                      : 'Resident profile',
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const Divider(),
                      ProductDatum(
                        label: 'Name',
                        value: p?.name?.isNotEmpty == true
                            ? p!.name!
                            : 'Not set',
                        icon: Icons.person_outline_rounded,
                      ),
                      ProductDatum(
                        label: 'Email',
                        value: widget.user.email ?? 'Not set',
                        icon: Icons.alternate_email_rounded,
                      ),
                      ProductDatum(
                        label: 'Phone',
                        value: p?.phone?.isNotEmpty == true
                            ? p!.phone!
                            : 'Not set',
                        icon: Icons.phone_outlined,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                ProductSurface(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(
                            Icons.shield_outlined,
                            color: AppColors.primary,
                            size: 21,
                          ),
                          const SizedBox(width: 10),
                          Text(
                            'Privacy',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      const Text(privacyNotice),
                    ],
                  ),
                ),
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
