import 'dart:async';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../../data/api_client.dart';
import 'hotline_button.dart';
import '../../theme/product_widgets.dart';

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
  return 'This phone could not confirm the result. Check your reports before trying again.';
}

const _session =
    'There is a problem with your session. Log out, log in again, then try again.';

/// True when the server may have created the report, so the same key must be kept and a
/// resend is not automatic. Mirrors the web's apiFailure mapping (F02). Auth is never uncertain.
bool isUncertainSubmission(Object error) {
  // Only a timeout, a dropped connection, or a reply that cannot be read can mean the request reached the server.
  // Any other error that is not an ApiException happened on this phone (for example a file or validation error)
  // before the request was sent, so it cannot have created a report.
  if (error is! ApiException) {
    return error is TimeoutException ||
        error is http.ClientException ||
        error is FormatException;
  }
  if (error.code == 'bad_response' ||
      (error.status >= 200 && error.status < 300)) {
    return true;
  }
  if (error.status == 0) return error.code != 'auth';
  if (error.status >= 500 || error.status == 429) return true;
  return error.code == 'submission_in_progress' ||
      error.code == 'submission_unresolved';
}

/// Copy for an uncertain outcome. It never says the report was NOT submitted.
const uncertainCopy =
    'We could not confirm your report was sent. Check My reports before sending it again.';

/// Copy for local storage failures during an uncertain send. Only the item that failed to save is named,
/// and no copy claims the retry protection survives a restart. Returns null when both writes succeeded.
String? storageFailureCopy({
  required bool draftNotSaved,
  required bool warningNotSaved,
}) {
  const check =
      'Before sending again, even after reopening the app, check My reports to avoid sending a duplicate.';
  if (draftNotSaved && warningNotSaved) {
    return 'We couldn’t save your report details or retry warning on this phone. $check';
  }
  if (draftNotSaved) {
    return 'We couldn’t save your report details on this phone. $check';
  }
  if (warningNotSaved) {
    return 'We couldn’t save your retry warning on this phone. $check';
  }
  return null;
}

const alternativeReporting =
    'You can also call the hotline, or send an SMS to your local disaster office.';

class SubmissionSuccessPage extends StatelessWidget {
  const SubmissionSuccessPage({
    super.key,
    required this.reference,
    required this.onViewReports,
  });
  final String reference;
  final VoidCallback onViewReports;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('Report sent'),
      ),
      body: ProductViewport(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const ProductIntro(
              title: 'Your report is on its way.',
              description:
                  'Keep this reference so you can follow the response.',
              icon: Icons.check_circle_outline,
            ),
            ProductSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Reference ID',
                    style: Theme.of(context).textTheme.labelLarge,
                  ),
                  SelectableText(
                    reference,
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 12),
                  const Text('Your report was submitted. Status: Submitted.'),
                  const SizedBox(height: 8),
                  const Text(
                    'Keep this reference ID. A dispatcher will review your report.',
                  ),
                ],
              ),
            ),
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
  const SubmissionFailurePage({
    super.key,
    required this.reason,
    this.uncertain = false,
    this.draftNotSaved = false,
    this.warningNotSaved = false,
  });
  final String reason;

  /// True for an uncertain outcome: the report may exist, so the page does not say it was NOT sent.
  final bool uncertain;

  /// Names only the local write that failed, so the resident knows what to check.
  final bool draftNotSaved;
  final bool warningNotSaved;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(uncertain ? 'Report not confirmed' : 'Report not sent'),
      ),
      body: ProductViewport(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            ProductIntro(
              title: uncertain
                  ? 'Let’s check before sending again.'
                  : 'Let’s try that again.',
              description:
                  'Your information is still here. Check the problem below before retrying.',
              icon: uncertain ? Icons.help_outline : Icons.error_outline,
            ),
            ProductSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (uncertain)
                    Text(
                      uncertainCopy,
                      style: Theme.of(context).textTheme.titleLarge,
                    )
                  else
                    Text(
                      'Your report was NOT submitted.',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  if (uncertain &&
                      storageFailureCopy(
                            draftNotSaved: draftNotSaved,
                            warningNotSaved: warningNotSaved,
                          ) !=
                          null) ...[
                    const SizedBox(height: 12),
                    Text(
                      storageFailureCopy(
                        draftNotSaved: draftNotSaved,
                        warningNotSaved: warningNotSaved,
                      )!,
                    ),
                  ],
                  const SizedBox(height: 12),
                  Text(reason),
                  const SizedBox(height: 12),
                  const Text(alternativeReporting),
                ],
              ),
            ),
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
