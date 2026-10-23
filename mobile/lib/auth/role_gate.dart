import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../features/auth/login_page.dart';
import '../features/home/resident_home.dart';
import '../features/notifications/notifications_page.dart';
import '../features/notifications/push_registration.dart';
import '../features/responder/assigned_list_page.dart';

export '../features/home/resident_home.dart';
import 'auth_controller.dart';

class RoleGate extends StatelessWidget {
  const RoleGate({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    if (auth.loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final user = auth.user;
    if (user == null) return const LoginPage();
    switch (user.role) {
      case 'resident':
        return const ResidentHome();
      case 'responder':
        return const ResponderHome();
      default:
        return WebDashboardNotice(role: user.role ?? '');
    }
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
      body: IndexedStack(
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

// Staff accounts do not use the mobile app. Administrators use the website; dispatcher and DMO website
// access is turned off (professor clarification, 2026-10-23).
class WebDashboardNotice extends StatelessWidget {
  const WebDashboardNotice({super.key, required this.role});

  final String role;

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
