import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../auth/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../../theme/product_motion.dart';
import '../../theme/product_navigation.dart';
import '../auth/auth_widgets.dart';
import '../auth/login_page.dart';
import '../auth/register_page.dart';

/// Public service introduction; no invented incidents or response guarantees.
class WelcomePage extends StatelessWidget {
  const WelcomePage({super.key});
  void _open(BuildContext context, Widget screen) => Navigator.of(
    context,
  ).push(MaterialPageRoute<void>(builder: (_) => screen));

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
        systemNavigationBarColor: AppColors.bg,
        systemNavigationBarIconBrightness: Brightness.dark,
      ),
      child: Scaffold(
        body: ListView(
          padding: EdgeInsets.zero,
          children: [
            ColoredBox(
              color: AppColors.harbor,
              child: SafeArea(
                bottom: false,
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 1120),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(24, 20, 24, 34),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const ProductMark(size: 38),
                              const SizedBox(width: 12),
                              const Expanded(
                                child: Text(
                                  'I-Report',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 18,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              TextButton(
                                onPressed: () =>
                                    _open(context, const LoginPage()),
                                style: TextButton.styleFrom(
                                  foregroundColor: Colors.white,
                                ),
                                child: const Text('Sign in'),
                              ),
                            ],
                          ),
                          const SizedBox(height: 36),
                          LayoutBuilder(
                            builder: (context, box) => ProductArrival(
                              distance: 16,
                              duration: const Duration(milliseconds: 420),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Semantics(
                                    header: true,
                                    child: Text(
                                      'A clear report.\nA connected\nresponse.',
                                      style: TextStyle(
                                        fontSize: box.maxWidth > 700 ? 58 : 40,
                                        height: 1.05,
                                        letterSpacing: -1.1,
                                        fontWeight: FontWeight.w700,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 20),
                                  ConstrainedBox(
                                    constraints: BoxConstraints(maxWidth: 520),
                                    child: Text(
                                      'Share what is happening and where. Follow the next step, from your first report to the latest response update.',
                                      style: TextStyle(
                                        color: AppColors.onHarbor,
                                        fontSize: 15,
                                        height: 1.6,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 28),
                          const _ServicePath(),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
            Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 560),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 26, 24, 32),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (auth.error != null) ...[
                        InlineError(
                          failureMessage(auth.error!, auth.errorDetail),
                        ),
                        const SizedBox(height: 16),
                      ],
                      FilledButton.icon(
                        onPressed: () => _open(context, const RegisterPage()),
                        icon: const Icon(Icons.arrow_forward_rounded),
                        label: const Text('Create a resident account'),
                      ),
                      const SizedBox(height: 12),
                      OutlinedButton(
                        onPressed: () => _open(context, const LoginPage()),
                        child: const Text('I already have an account'),
                      ),
                      const SizedBox(height: 24),
                      const DisclaimerBox(),
                      const SizedBox(height: 32),
                      Text(
                        'The right details.\nA clearer next step.',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 24),
                      const _Feature(
                        icon: Icons.location_on_outlined,
                        title: 'Start with the location',
                        detail:
                            'Use GPS or choose a place on the map so staff can understand where help is needed.',
                      ),
                      const _Feature(
                        icon: Icons.add_photo_alternate_outlined,
                        title: 'Show what is happening',
                        detail:
                            'Add a description, photos when available, and a way for the response team to reach you.',
                      ),
                      const _Feature(
                        icon: Icons.notifications_active_outlined,
                        title: 'Follow the response',
                        detail:
                            'Keep your report reference and check your status and notifications as the situation changes.',
                      ),
                      const Divider(),
                      Text(
                        'Part of the response team?',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Sign in with your assigned account to see your rescue assignments.',
                        style: TextStyle(color: AppColors.muted, height: 1.5),
                      ),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: TextButton.icon(
                          onPressed: () => _open(context, const LoginPage()),
                          icon: const Icon(Icons.badge_outlined),
                          label: const Text('Response team sign in'),
                        ),
                      ),
                      const SizedBox(height: 24),
                      const Text(
                        'I-Report',
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Report clearly. Respond together.',
                        style: TextStyle(color: AppColors.muted, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// The three labels describe the service, not a live incident or response timer.
class _ServicePath extends StatelessWidget {
  const _ServicePath();
  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 12,
    runSpacing: 12,
    crossAxisAlignment: WrapCrossAlignment.center,
    children: [
      for (final item in const [
        (Icons.edit_location_alt_outlined, 'Report'),
        (Icons.fact_check_outlined, 'Review'),
        (Icons.groups_outlined, 'Respond'),
      ])
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(item.$1, color: const Color(0xFFC0A2FF), size: 18),
            const SizedBox(width: 7),
            Text(
              item.$2,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
    ],
  );
}

class RescueMark extends StatelessWidget {
  const RescueMark({super.key, this.size = 40});
  final double size;
  @override
  Widget build(BuildContext context) => ProductMark(size: size);
}

class _Feature extends StatelessWidget {
  const _Feature({
    required this.icon,
    required this.title,
    required this.detail,
  });
  final IconData icon;
  final String title, detail;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 24),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: AppColors.primarySoft,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: AppColors.primary, size: 22),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 5),
              Text(
                detail,
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium?.copyWith(color: AppColors.muted),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}
