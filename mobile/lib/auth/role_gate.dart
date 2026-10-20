import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../features/welcome/welcome_page.dart';
import '../features/home/resident_home.dart';
import '../features/notifications/notifications_page.dart';
import '../features/notifications/push_registration.dart';
import '../features/responder/assigned_list_page.dart';

export '../features/home/resident_home.dart';
import 'auth_controller.dart';
import 'profile_sync.dart';
import '../theme/product_motion.dart';

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
        return const ResidentHome();
      case 'responder':
        return const ResponderHome();
      default:
        return const WebDashboardNotice();
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
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Semantics(
                header: true,
                child: Text(
                  'Checking your access',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ),
              const SizedBox(height: 12),
              Text(_message, textAlign: TextAlign.center),
              const SizedBox(height: 24),
              if (retryAvailable && onRetry != null)
                FilledButton(
                  onPressed: onRetry,
                  child: const Text('Retry access check'),
                )
              else
                const Center(child: CircularProgressIndicator()),
            ],
          ),
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
    return Scaffold(
      body: ProductTabHost(
        index: _index,
        children: [
          const AssignedListPage(),
          NotificationsPage(uid: user.uid),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            selectedIcon: Icon(Icons.assignment),
            label: 'Assigned',
          ),
          NavigationDestination(
            icon: Icon(Icons.notifications_outlined),
            selectedIcon: Icon(Icons.notifications),
            label: 'Notifications',
          ),
        ],
      ),
    );
  }
}

class WebDashboardNotice extends StatelessWidget {
  const WebDashboardNotice({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthController>();
    return Scaffold(
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
                'Use the web dashboard',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 12),
              const Text(
                'Your account is for the web dashboard. Please open it in a browser on a computer.',
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
