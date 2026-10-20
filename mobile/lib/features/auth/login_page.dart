import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../auth/auth_controller.dart';
import '../../auth/auth_repository.dart';
import 'auth_widgets.dart';
import 'register_page.dart';
import '../../theme/product_widgets.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _emailFocus = FocusNode();
  bool _resetting = false;
  String? _resetNotice;
  String? _resetError;
  String? _emailResetError;

  @override
  void dispose() {
    _email.dispose();
    _emailFocus.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    await context.read<AuthController>().login(_email.text, _password.text);
  }

  Future<void> _resetPassword() async {
    if (_resetting) return;
    final email = _email.text.trim();
    setState(() {
      _resetNotice = null;
      _resetError = null;
      _emailResetError = null;
    });
    if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(email)) {
      setState(() => _emailResetError = 'Enter a valid email address.');
      _emailFocus.requestFocus();
      return;
    }
    setState(() => _resetting = true);
    try {
      await context.read<AuthController>().requestPasswordReset(email);
      if (mounted) {
        setState(
          () => _resetNotice =
              'If an account uses this email, a password reset link will be sent.',
        );
      }
    } on AuthException catch (e) {
      if (mounted) {
        setState(
          () => _resetError = e.failure == AuthFailure.network
              ? 'Could not connect. Check your internet and try again.'
              : 'Could not request a reset link. Try again.',
        );
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => _resetError = 'Could not request a reset link. Try again.',
        );
      }
    } finally {
      if (mounted) setState(() => _resetting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    return Scaffold(
      appBar: AppBar(title: const Text('Sign in')),
      body: ProductFormBody(
        child: Form(
          key: _form,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const ProductIntro(
                title: 'Welcome back',
                description:
                    'Your reports, your updates, and the next step. Log in to report an incident or see your assignments.',
              ),
              TextFormField(
                errorBuilder: fieldErrorBuilder,
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                autofillHints: const [AutofillHints.email],
                focusNode: _emailFocus,
                forceErrorText: _emailResetError,
                onChanged: (_) {
                  if (_emailResetError != null) {
                    setState(() => _emailResetError = null);
                  }
                },
                decoration: InputDecoration(
                  label: requiredFieldLabel('Email'),
                  prefixIcon: const Icon(Icons.alternate_email_rounded),
                ),
                validator: (v) =>
                    !RegExp(
                      r'^[^\s@]+@[^\s@]+\.[^\s@]+$',
                    ).hasMatch((v ?? '').trim())
                    ? 'Enter your email address.'
                    : null,
              ),
              const SizedBox(height: 16),
              PasswordField(
                controller: _password,
                required: true,
                autofillHints: const [AutofillHints.password],
                validator: (v) =>
                    (v == null || v.isEmpty) ? 'Enter your password.' : null,
              ),
              if (auth.error != null) ...[
                const SizedBox(height: 16),
                InlineError(failureMessage(auth.error!, auth.errorDetail)),
              ],
              const SizedBox(height: 24),
              FilledButton(
                onPressed: auth.busy ? null : _submit,
                child: Text(auth.busy ? 'Logging in…' : 'Log in'),
              ),
              const SizedBox(height: 24),
              const Divider(),
              const SizedBox(height: 12),
              Text(
                'Need a password?',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              const Text(
                'Enter your email above to set or reset your password.',
              ),
              if (_resetError != null) InlineError(_resetError!),
              if (_resetNotice != null)
                Semantics(
                  liveRegion: true,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Text(_resetNotice!),
                  ),
                ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: _resetting || auth.busy ? null : _resetPassword,
                child: Text(
                  _resetting ? 'Requesting link…' : 'Forgot password?',
                ),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: auth.busy
                    ? null
                    : () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const RegisterPage(),
                        ),
                      ),
                child: const Text('Create an account'),
              ),
              const SizedBox(height: 24),
              const DisclaimerBox(),
            ],
          ),
        ),
      ),
    );
  }
}
