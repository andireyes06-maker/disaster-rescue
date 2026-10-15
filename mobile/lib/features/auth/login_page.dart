import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../auth/auth_controller.dart';
import 'auth_widgets.dart';
import 'register_page.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    await context.read<AuthController>().login(_email.text, _password.text);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Form(
                key: _form,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text('Welcome back', style: Theme.of(context).textTheme.headlineMedium),
                    const SizedBox(height: 8),
                    const Text('Log in to report an incident or see your assignments.'),
                    const SizedBox(height: 24),
                    const DisclaimerBox(),
                    const SizedBox(height: 24),
                    TextFormField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      autofillHints: const [AutofillHints.email],
                      decoration: const InputDecoration(labelText: 'Email'),
                      validator: (v) => (v == null || !v.contains('@')) ? 'Enter your email address.' : null,
                    ),
                    const SizedBox(height: 16),
                    PasswordField(
                      controller: _password,
                      autofillHints: const [AutofillHints.password],
                      validator: (v) => (v == null || v.isEmpty) ? 'Enter your password.' : null,
                    ),
                    if (auth.error != null) ...[
                      const SizedBox(height: 16),
                      InlineError(failureMessage(auth.error!, auth.errorDetail)),
                    ],
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: auth.busy ? null : _submit,
                      child: Text(auth.busy ? 'Logging in...' : 'Log in'),
                    ),
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: auth.busy
                          ? null
                          : () => Navigator.of(context)
                              .push(MaterialPageRoute<void>(builder: (_) => const RegisterPage())),
                      child: const Text('Create an account'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
