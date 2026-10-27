import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../features/welcome/welcome_page.dart';
import '../features/home/resident_home.dart';
import '../features/notifications/notification_bell.dart';
import '../features/notifications/notifications_page.dart';
import '../features/notifications/push_registration.dart';
import '../features/responder/assigned_list_page.dart';

export '../features/home/resident_home.dart';
import 'auth_controller.dart';
import 'idle_sign_out.dart';
import 'profile_sync.dart';
import '../theme/product_motion.dart';
import '../theme/product_navigation.dart';
import '../features/profile/profile_page.dart';
import '../theme/product_widgets.dart';

class RoleGate extends StatelessWidget {
  const RoleGate({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    if (auth.loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final user = auth.user;
    if (user == null) return const WelcomePage();
    // The profile and the token claims disagree. Protected views stay unmounted until they agree.
    if (user.syncing) {
      return AccessHold(
        note: user.syncNote,
        retryAvailable: user.retryAvailable,
        onRetry: auth.retryAccessCheck,
      );
    }
    switch (user.role) {
      case 'resident':
        // Residents are signed out after a period with no use. Responders and staff are not.
        return IdleSignOut(onIdle: auth.logout, child: const ResidentHome());
      case 'responder':
        return const ResponderHome();
      default:
        return WebDashboardNotice(role: user.role ?? '');
    }
  }
}

/// Shown in place of the role's home while the account's access is being confirmed. It names the state in plain words
/// and offers a retry only when the automatic checks have run out.
class AccessHold extends StatelessWidget {
  const AccessHold({
    super.key,
    this.note,
    this.retryAvailable = false,
    this.onRetry,
  });

  final SyncHold? note;
  final bool retryAvailable;
  final VoidCallback? onRetry;

  String get _message {
    switch (note) {
      case SyncHold.refreshFailed:
        return 'We could not confirm your access. Check your connection, then try again.';
      case SyncHold.authSyncPending:
        return 'Your account changes are being applied. This page opens when they are finished.';
      case SyncHold.claimsNotUpdated:
        return 'Your access is still being updated. This page opens when it is finished.';
      case SyncHold.profileLoading:
      case null:
        return 'We are checking your account. This page opens when the check is finished.';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('I-Report')),
      body: ProductViewport(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const SizedBox(height: 32),
            ProductSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const ProductIntro(
                    title: 'Checking your access',
                    description:
                        'Your account is being checked before your workspace opens.',
                    icon: Icons.shield_outlined,
                  ),
                  Text(_message),
                  const SizedBox(height: 24),
                  if (retryAvailable && onRetry != null)
                    FilledButton(
                      onPressed: onRetry,
                      child: const Text('Retry access check'),
                    )
                  else
                    const Center(
                      child: SizedBox(
                        width: 28,
                        height: 28,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ResponderHome extends StatefulWidget {
  const ResponderHome({super.key});

  @override
  State<ResponderHome> createState() => _ResponderHomeState();
}

class _ResponderHomeState extends State<ResponderHome> {
  int _index = 0;

  @override
  void initState() {
    super.initState();
    // Push is best effort: a failed registration must not block the home screen.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<PushRegistration>().init().catchError((_) {});
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthController>().user;
    if (user == null) return const SizedBox.shrink();
    return ProductNavigation(
      index: _index,
      onChanged: (i) => setState(() => _index = i),
      body: ProductTabHost(
        index: _index,
        children: [
          const AssignedListPage(),
          NotificationsPage(uid: user.uid),
          ProfilePage(user: user),
        ],
      ),
      destinations: [
        const NavigationDestination(
          icon: Icon(Icons.assignment_outlined),
          selectedIcon: Icon(Icons.assignment),
          label: 'Assigned',
        ),
        NavigationDestination(
          icon: NotificationBell(
            uid: user.uid,
            builder: (context, unread) => UnreadDot(
              unread: unread,
              icon: const Icon(Icons.notifications_outlined),
            ),
          ),
          selectedIcon: NotificationBell(
            uid: user.uid,
            builder: (context, unread) => UnreadDot(
              unread: unread,
              icon: const Icon(Icons.notifications),
            ),
          ),
          label: 'Notifications',
        ),
        NavigationDestination(
          icon: Icon(Icons.person_outline),
          selectedIcon: Icon(Icons.person),
          label: 'Profile',
        ),
      ],
    );
  }
}

// Staff accounts do not use the mobile app. Administrators use the website; dispatcher and DMO website
// access is turned off (professor clarification, 2026-10-23).
class WebDashboardNotice extends StatelessWidget {
  const WebDashboardNotice({super.key, required this.role});

  final String role;

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthController>();
    return Scaffold(
      appBar: AppBar(title: const Text('I-Report')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(Icons.desktop_windows_outlined, size: 48),
              const SizedBox(height: 16),
              Text(
                role == 'admin'
                    ? 'Use the web dashboard'
                    : 'Website access is for administrators',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 12),
              Text(
                role == 'admin'
                    ? 'Your account is for the web dashboard. Please open it in a browser on a computer.'
                    : 'Ask your administrator about your access. Residents and rescue teams use this app.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: auth.logout,
                child: const Text('Log out'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
