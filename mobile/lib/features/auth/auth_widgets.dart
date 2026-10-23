import 'package:flutter/material.dart';

import '../../auth/auth_repository.dart';
import '../../theme/app_theme.dart';
import '../../theme/product_motion.dart';

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
      return 'Choose a longer password (at least 8 characters).';
    case AuthFailure.registrationUncertain:
      return 'Your account may have been created. Try signing in.';
    case AuthFailure.registrationIncomplete:
      return 'We could not finish creating your account. Try signing in, or contact support.';
    case AuthFailure.registrationFailed:
      return detail ?? 'We could not create your account. Please try again.';
    case AuthFailure.sessionEnded:
      return 'Your session has ended. Please sign in again.';
  }
}

/// Inline error: icon and text, in the amber tone, never the critical color.
class InlineError extends StatelessWidget {
  const InlineError(this.message, {super.key});
  final String message;

  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    child: ProductArrival(
      key: ValueKey(message),
      duration: const Duration(milliseconds: 160),
      distance: 4,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF8ED),
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: const Color(0xFFE3C8A0), width: 1),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.error_outline, color: AppColors.high),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(color: AppColors.text),
              ),
            ),
          ],
        ),
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

/// Error content keeps an icon, clear text and the field's error semantics.
Widget fieldErrorBuilder(BuildContext context, String message) => Semantics(
  liveRegion: true,
  child: Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const Padding(
        padding: EdgeInsets.only(top: 1),
        child: Icon(
          Icons.error_outline_rounded,
          size: 16,
          color: AppColors.critical,
        ),
      ),
      const SizedBox(width: 6),
      Expanded(
        child: Text(
          message,
          style: Theme.of(
            context,
          ).textTheme.bodySmall?.copyWith(color: AppColors.critical),
        ),
      ),
    ],
  ),
);

/// Label for a required field (C6): a visible " *" and a screen-reader "required".
Widget requiredFieldLabel(String text) =>
    Text('$text *', semanticsLabel: '$text, required');

class PasswordField extends StatefulWidget {
  const PasswordField({
    super.key,
    required this.controller,
    this.validator,
    this.autofillHints,
    this.required = false,
  });
  final TextEditingController controller;
  final String? Function(String?)? validator;
  final Iterable<String>? autofillHints;
  final bool required;

  @override
  State<PasswordField> createState() => _PasswordFieldState();
}

class _PasswordFieldState extends State<PasswordField> {
  bool _hidden = true;

  @override
  Widget build(BuildContext context) => TextFormField(
    errorBuilder: fieldErrorBuilder,
    controller: widget.controller,
    obscureText: _hidden,
    validator: widget.validator,
    autofillHints: widget.autofillHints,
    decoration: InputDecoration(
      label: widget.required ? requiredFieldLabel('Password') : null,
      labelText: widget.required ? null : 'Password',
      prefixIcon: const Icon(Icons.lock_outline_rounded),
      suffixIcon: IconButton(
        tooltip: _hidden ? 'Show password' : 'Hide password',
        icon: Icon(
          _hidden ? Icons.visibility_outlined : Icons.visibility_off_outlined,
        ),
        onPressed: () => setState(() => _hidden = !_hidden),
      ),
    ),
  );
}
