import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../auth/auth_repository.dart';

/// The shortest new password. Matches the registration copy: "Choose a longer password (at least 8 characters)."
const minNewPasswordLength = 8;

/// Lets a signed-in resident or responder change their own password from the profile.
/// Returns true when the password changed. Passwords are never logged or stored outside the text fields.
Future<bool?> showChangePasswordDialog(BuildContext context) {
  return showDialog<bool>(
    context: context,
    builder: (_) => const _ChangePasswordDialog(),
  );
}

/// Which field a message belongs to. Null means the message applies to the whole form.
enum _Field { current, next, confirm }

class _ChangePasswordDialog extends StatefulWidget {
  const _ChangePasswordDialog();

  @override
  State<_ChangePasswordDialog> createState() => _ChangePasswordDialogState();
}

class _ChangePasswordDialogState extends State<_ChangePasswordDialog> {
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _confirm = TextEditingController();
  final _currentFocus = FocusNode();
  final _nextFocus = FocusNode();
  final _confirmFocus = FocusNode();

  bool _showCurrent = false;
  bool _showNext = false;
  bool _showConfirm = false;
  bool _busy = false;
  bool _done = false;

  // Inline errors for each field, plus one summary for failures that are not about a single field.
  final Map<_Field, String> _fieldErrors = {};
  String? _summary;
  bool _summaryIsSuccess = false;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _confirm.dispose();
    _currentFocus.dispose();
    _nextFocus.dispose();
    _confirmFocus.dispose();
    super.dispose();
  }

  /// Checks what can be checked on the phone. Returns true when the form may be sent.
  bool _validate() {
    final errors = <_Field, String>{};
    if (_current.text.isEmpty) {
      errors[_Field.current] = 'Enter your current password.';
    }
    if (_next.text.length < minNewPasswordLength) {
      errors[_Field.next] = 'Use at least $minNewPasswordLength characters.';
    } else if (_next.text == _current.text) {
      errors[_Field.next] = 'Choose a password different from the current one.';
    }
    if (_confirm.text != _next.text) {
      errors[_Field.confirm] = 'The new passwords do not match.';
    }
    setState(() {
      _fieldErrors
        ..clear()
        ..addAll(errors);
      _summary = null;
      _summaryIsSuccess = false;
    });
    if (errors.isEmpty) return true;
    // Move focus to the first problem, so keyboard and screen reader users land on it.
    final first = errors.keys.first;
    (switch (first) {
      _Field.current => _currentFocus,
      _Field.next => _nextFocus,
      _Field.confirm => _confirmFocus,
    }).requestFocus();
    return false;
  }

  /// Maps a failure to the field it concerns, or to the summary. Wording says what happened to the password.
  void _showFailure(PasswordChangeFailure failure) {
    final (_Field? field, String text) = switch (failure) {
      PasswordChangeFailure.wrongCurrent => (_Field.current, 'The current password is not correct.'),
      PasswordChangeFailure.weakPassword => (_Field.next, 'Choose a stronger password.'),
      PasswordChangeFailure.sessionEnded => (null, 'Your session has ended. Sign out, sign in again, then change your password.'),
      PasswordChangeFailure.network => (null, 'No connection. Check your internet and try again. If the change did not go through, your current password still works.'),
      PasswordChangeFailure.tooManyAttempts => (null, 'Too many attempts. Wait a few minutes, then try again.'),
      PasswordChangeFailure.unknown => (null, 'Could not change the password. Try again.'),
    };
    setState(() {
      _fieldErrors.clear();
      if (field != null) {
        _fieldErrors[field] = text;
      } else {
        _summary = text;
      }
    });
    switch (field) {
      case _Field.current:
        _currentFocus.requestFocus();
      case _Field.next:
        _nextFocus.requestFocus();
      case _Field.confirm:
        _confirmFocus.requestFocus();
      case null:
        break;
    }
  }

  Future<void> _save() async {
    // A second tap while the first request is running, or after success, must not send another request.
    if (_busy || _done) return;
    if (!_validate()) return;
    setState(() {
      _busy = true;
      _summary = null;
    });
    try {
      await context.read<AuthRepository>().changePassword(
            currentPassword: _current.text,
            newPassword: _next.text,
          );
      if (!mounted) return;
      _current.clear();
      _next.clear();
      _confirm.clear();
      setState(() {
        _done = true;
        _summary = 'Your password has been changed.';
        _summaryIsSuccess = true;
      });
    } on PasswordChangeException catch (e) {
      if (!mounted) return;
      _showFailure(e.failure);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String? _errorFor(_Field field) => _fieldErrors[field];

  Widget _passwordField({
    required TextEditingController controller,
    required FocusNode focusNode,
    required String label,
    required bool visible,
    required VoidCallback onToggle,
    required _Field field,
    required Iterable<String> autofill,
    TextInputAction action = TextInputAction.next,
    ValueChanged<String>? onSubmitted,
  }) {
    final error = _errorFor(field);
    return TextField(
      controller: controller,
      focusNode: focusNode,
      enabled: !_busy && !_done,
      obscureText: !visible,
      autofillHints: autofill,
      textInputAction: action,
      onSubmitted: onSubmitted,
      decoration: InputDecoration(
        labelText: '$label *',
        errorText: error,
        suffixIcon: IconButton(
          // The tooltip names the action, so the button makes sense to screen readers without the icon.
          tooltip: visible ? 'Hide password' : 'Show password',
          icon: Icon(visible ? Icons.visibility_off_outlined : Icons.visibility_outlined),
          onPressed: _busy || _done ? null : onToggle,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return PopScope(
      // Stop closing while a request is running, so the outcome is never lost.
      canPop: !_busy,
      child: AlertDialog(
        title: const Text('Change your password'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('* Required', style: theme.textTheme.bodySmall),
              const SizedBox(height: 12),
              if (!_done) ...[
                _passwordField(
                  controller: _current,
                  focusNode: _currentFocus,
                  label: 'Current password',
                  visible: _showCurrent,
                  onToggle: () => setState(() => _showCurrent = !_showCurrent),
                  field: _Field.current,
                  autofill: const [AutofillHints.password],
                ),
                const SizedBox(height: 12),
                _passwordField(
                  controller: _next,
                  focusNode: _nextFocus,
                  label: 'New password (at least $minNewPasswordLength characters)',
                  visible: _showNext,
                  onToggle: () => setState(() => _showNext = !_showNext),
                  field: _Field.next,
                  autofill: const [AutofillHints.newPassword],
                ),
                const SizedBox(height: 12),
                _passwordField(
                  controller: _confirm,
                  focusNode: _confirmFocus,
                  label: 'Repeat the new password',
                  visible: _showConfirm,
                  onToggle: () => setState(() => _showConfirm = !_showConfirm),
                  field: _Field.confirm,
                  autofill: const [AutofillHints.newPassword],
                  action: TextInputAction.done,
                  onSubmitted: (_) => _save(),
                ),
              ],
              if (_busy) ...[
                const SizedBox(height: 12),
                const LinearProgressIndicator(),
              ],
              if (_summary != null) ...[
                const SizedBox(height: 12),
                // A live region, so the result is announced without moving focus away from the form.
                Semantics(
                  liveRegion: true,
                  child: Text(
                    _summary!,
                    style: TextStyle(color: _summaryIsSuccess ? null : theme.colorScheme.error),
                  ),
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: _busy ? null : () => Navigator.of(context).pop(_done),
            child: Text(_done ? 'Done' : 'Cancel'),
          ),
          if (!_done)
            FilledButton(
              onPressed: _busy ? null : _save,
              child: Text(_busy ? 'Saving…' : 'Save password'),
            ),
        ],
      ),
    );
  }
}
