import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../features/auth/login_page.dart';
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
        return const WebDashboardNotice();
    }
  }
}

class _Placeholder extends StatelessWidget {
  const _Placeholder(this.title);
  final String title;

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthController>();
    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        actions: [TextButton(onPressed: auth.logout, child: const Text('Log out'))],
      ),
      body: const Center(child: Text('Nothing to show yet')),
    );
  }
}

class ResidentHome extends StatelessWidget {
  const ResidentHome({super.key});
  @override
  Widget build(BuildContext context) => const _Placeholder('Resident home');
}

class ResponderHome extends StatelessWidget {
  const ResponderHome({super.key});
  @override
  Widget build(BuildContext context) => const _Placeholder('Responder home');
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
              Text('Use the web dashboard',
                  textAlign: TextAlign.center, style: Theme.of(context).textTheme.headlineMedium),
              const SizedBox(height: 12),
              const Text(
                'Your account is for the web dashboard. Please open it in a browser on a computer.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              FilledButton(onPressed: auth.logout, child: const Text('Log out')),
            ],
          ),
        ),
      ),
    );
  }
}
