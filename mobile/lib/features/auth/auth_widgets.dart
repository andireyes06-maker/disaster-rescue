import 'package:flutter/material.dart';

import '../../auth/auth_repository.dart';
import '../../theme/app_theme.dart';

const disclaimerText =
    'Submitting a report through this app does not automatically guarantee immediate rescue. If you are in danger, call your local emergency hotline.';

const consentText =
    'We use your name, phone number and location only to coordinate rescue. See the privacy notice.';

String failureMessage(AuthFailure f, String? detail) {
  switch (f) {
    case AuthFailure.accountDisabled:
      return 'This account is turned off. Please contact your local office.';
    case AuthFailure.authFailed:
      return 'We could not sign you in. Please try again.';
    case AuthFailure.invalidCredentials:
      return 'The email or password is not correct.';
    case AuthFailure.network:
      return 'No connection. Check your internet and try again.';
    case AuthFailure.emailInUse:
      return 'That email already has an account. Try logging in.';
    case AuthFailure.weakPassword:
      return 'Choose a longer password (at least 6 characters).';
    case AuthFailure.registrationUncertain:
      return 'Your account may have been created. Try signing in.';
    case AuthFailure.registrationIncomplete:
      return 'We could not finish creating your account. Try signing in, or contact support.';
    case AuthFailure.registrationFailed:
      return detail ?? 'We could not create your account. Please try again.';
  }
}

/// Inline error: icon and text, in the amber tone, never the critical color.
class InlineError extends StatelessWidget {
  const InlineError(this.message, {super.key});
  final String message;

  @override
  Widget build(BuildContext context) => Semantics(
        liveRegion: true,
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(color: AppColors.high, width: 2),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.info_outline, color: AppColors.high),
              const SizedBox(width: 8),
              Expanded(child: Text(message, style: const TextStyle(color: AppColors.text))),
            ],
          ),
        ),
      );
}

class DisclaimerBox extends StatelessWidget {
  const DisclaimerBox({super.key});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
            color: const Color(0xFFFFF7E8),
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
        child: const Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.warning_amber_outlined, color: AppColors.text),
            SizedBox(width: 8),
            Expanded(child: Text(disclaimerText)),
          ],
        ),
      );
}

class PasswordField extends StatefulWidget {
  const PasswordField({super.key, required this.controller, this.validator, this.autofillHints});
  final TextEditingController controller;
  final String? Function(String?)? validator;
  final Iterable<String>? autofillHints;

  @override
  State<PasswordField> createState() => _PasswordFieldState();
}

class _PasswordFieldState extends State<PasswordField> {
  bool _hidden = true;

  @override
  Widget build(BuildContext context) => TextFormField(
        controller: widget.controller,
        obscureText: _hidden,
        validator: widget.validator,
        autofillHints: widget.autofillHints,
        decoration: InputDecoration(
          labelText: 'Password',
          suffixIcon: IconButton(
            tooltip: _hidden ? 'Show password' : 'Hide password',
            icon: Icon(_hidden ? Icons.visibility_outlined : Icons.visibility_off_outlined),
            onPressed: () => setState(() => _hidden = !_hidden),
          ),
        ),
      );
}
