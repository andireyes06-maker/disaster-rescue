import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

const _minPassword = 10;

/// Lets a signed-in resident or responder change their own password. Firebase asks for the current password first.
Future<void> showChangePasswordDialog(BuildContext context) {
  return showDialog<void>(
    context: context,
    builder: (_) => const _ChangePasswordDialog(),
  );
}

class _ChangePasswordDialog extends StatefulWidget {
  const _ChangePasswordDialog();

  @override
  State<_ChangePasswordDialog> createState() => _ChangePasswordDialogState();
}

class _ChangePasswordDialogState extends State<_ChangePasswordDialog> {
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _confirm = TextEditingController();
  bool _busy = false;
  String? _message;
  bool _ok = false;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_next.text.length < _minPassword) {
      setState(() => _message = 'The new password needs at least $_minPassword characters.');
      return;
    }
    if (_next.text != _confirm.text) {
      setState(() => _message = 'The new passwords do not match.');
      return;
    }
    final user = FirebaseAuth.instance.currentUser;
    if (user?.email == null) {
      setState(() => _message = 'Sign in again, then change your password.');
      return;
    }
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      await user!.reauthenticateWithCredential(
        EmailAuthProvider.credential(email: user.email!, password: _current.text),
      );
      await user.updatePassword(_next.text);
      if (!mounted) return;
      setState(() {
        _ok = true;
        _message = 'Your password has been changed.';
      });
    } on FirebaseAuthException catch (e) {
      if (!mounted) return;
      setState(() => _message = switch (e.code) {
            'wrong-password' || 'invalid-credential' => 'The current password is not correct.',
            'weak-password' => 'Choose a stronger password.',
            'requires-recent-login' => 'Sign out and sign in again, then change your password.',
            _ => 'Could not change the password. Try again.',
          });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Change your password'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _current,
              obscureText: true,
              autofillHints: const [AutofillHints.password],
              decoration: const InputDecoration(labelText: 'Current password'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _next,
              obscureText: true,
              autofillHints: const [AutofillHints.newPassword],
              decoration: InputDecoration(labelText: 'New password (at least $_minPassword characters)'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _confirm,
              obscureText: true,
              autofillHints: const [AutofillHints.newPassword],
              decoration: const InputDecoration(labelText: 'Repeat the new password'),
            ),
            if (_message != null) ...[
              const SizedBox(height: 12),
              Semantics(
                liveRegion: true,
                child: Text(_message!, style: TextStyle(color: _ok ? null : Theme.of(context).colorScheme.error)),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _busy ? null : () => Navigator.of(context).pop(),
          child: Text(_ok ? 'Done' : 'Cancel'),
        ),
        if (!_ok)
          FilledButton(
            onPressed: _busy ? null : _save,
            child: Text(_busy ? 'Saving…' : 'Save password'),
          ),
      ],
    );
  }
}
