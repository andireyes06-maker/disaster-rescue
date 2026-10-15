import 'package:flutter/material.dart';

import '../../data/api_client.dart';
import '../../theme/app_theme.dart';
import 'hotline_button.dart';

/// Plain-language reason for a failed submit. Status 0 with code "auth" is a
/// signed-out token, not a network problem.
String submitFailureReason(Object error) {
  if (error is ApiException) {
    if (error.status == 0 && error.code == 'auth') return _session;
    switch (error.status) {
      case 400:
      case 413:
      case 415:
      case 422:
        return 'Some details need fixing: ${error.message}';
      case 401:
      case 403:
        return _session;
      case 429:
        return 'You have sent too many reports in a short time. Please wait a few minutes before trying again.';
      default:
        return 'The server had a problem. Please try again in a moment.';
    }
  }
  return 'Something went wrong on this phone. Please try again.';
}

const _session =
    'There is a problem with your session. Log out, log in again, then try again.';

const alternativeReporting =
    'You can also call the hotline, or send an SMS to your local disaster office.';

class SubmissionSuccessPage extends StatelessWidget {
  const SubmissionSuccessPage({super.key, required this.reference, required this.onViewReports});
  final String reference;
  final VoidCallback onViewReports;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(automaticallyImplyLeading: false, title: const Text('Report sent')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const Icon(Icons.check_circle_outline, size: 56, color: AppColors.primary),
            const SizedBox(height: 12),
            Text('Reference ID', style: Theme.of(context).textTheme.labelLarge),
            SelectableText(reference, style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 12),
            const Text('Your report was submitted. Status: Submitted.'),
            const SizedBox(height: 8),
            const Text('Keep this reference ID. A dispatcher will review your report.'),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () {
                Navigator.of(context).pop();
                onViewReports();
              },
              child: const Text('View my reports'),
            ),
          ],
        ),
      ),
    );
  }
}

class SubmissionFailurePage extends StatelessWidget {
  const SubmissionFailurePage({super.key, required this.reason});
  final String reason;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Report not sent')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const Icon(Icons.error_outline, size: 56, color: AppColors.high),
            const SizedBox(height: 12),
            Text('Your report was NOT submitted.', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 12),
            Text(reason),
            const SizedBox(height: 12),
            const Text(alternativeReporting),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Try again'),
            ),
            const SizedBox(height: 12),
            const HotlineButton(),
          ],
        ),
      ),
    );
  }
}
