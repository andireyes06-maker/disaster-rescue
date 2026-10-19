import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../auth/auth_controller.dart';
import 'auth_widgets.dart';
import '../../theme/product_widgets.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  bool _consent = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    await context.read<AuthController>().register(
          email: _email.text,
          password: _password.text,
          name: _name.text,
          phone: _phone.text,
        );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    if (auth.user != null && Navigator.of(context).canPop()) {
      // Signed in: hand control back to the role gate underneath.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) Navigator.of(context).maybePop();
      });
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Create account')),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Form(
                key: _form,
                autovalidateMode: AutovalidateMode.onUserInteraction,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const ProductIntro(title: 'Join as a resident', description: 'Share the situation. Pin the location. Stay connected to the response.', icon: Icons.person_add_alt_outlined),
                    TextFormField(
                      controller: _name,
                      textCapitalization: TextCapitalization.words,
                      autofillHints: const [AutofillHints.name],
                      decoration: InputDecoration(label: requiredFieldLabel('Full name')),
                      onChanged: (_) => setState(() {}),
                      validator: (v) => (v == null || v.trim().isEmpty) ? 'Enter your name.' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      autofillHints: const [AutofillHints.email],
                      decoration: InputDecoration(label: requiredFieldLabel('Email')),
                      onChanged: (_) => setState(() {}),
                      validator: (v) => (v == null || !v.contains('@')) ? 'Enter a valid email address.' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _phone,
                      keyboardType: TextInputType.phone,
                      autofillHints: const [AutofillHints.telephoneNumber],
                      decoration: const InputDecoration(labelText: 'Phone number (optional)'),
                    ),
                    const SizedBox(height: 16),
                    PasswordField(
                      controller: _password,
                      required: true,
                      autofillHints: const [AutofillHints.newPassword],
                      validator: (v) => (v == null || v.length < 8) ? 'Use at least 8 characters.' : null,
                    ),
                    const SizedBox(height: 16),
                    CheckboxListTile(
                      value: _consent,
                      onChanged: (v) => setState(() => _consent = v ?? false),
                      controlAffinity: ListTileControlAffinity.leading,
                      contentPadding: EdgeInsets.zero,
                      title: const Text(consentText),
                      subtitle: const Text('Required to create an account.'),
                    ),
                    if (auth.error != null) ...[
                      const SizedBox(height: 8),
                      InlineError(failureMessage(auth.error!, auth.errorDetail)),
                    ],
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: (_consent && !auth.busy) ? _submit : null,
                      child: Text(auth.busy ? 'Creating account...' : 'Create account'),
                    ),
                    const SizedBox(height: 24),
                    const DisclaimerBox(),
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
