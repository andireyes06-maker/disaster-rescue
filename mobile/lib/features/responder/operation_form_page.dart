import '../../theme/product_widgets.dart';
import 'package:flutter/foundation.dart' show ValueListenable;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../data/api_client.dart';
import '../../data/report_models.dart';
import '../../data/services.dart';
import '../../data/responder_attempts.dart';
import '../../data/submission_key.dart';
import '../auth/auth_widgets.dart';
import '../report/submission_result_page.dart' show isUncertainSubmission;
import 'operation_transitions.dart';

// Shown when the outcome of a save is unknown. The entries stay, and a retry reuses the same key, so it cannot record the update twice.
const uncertainUpdateCopy =
    'We couldn’t confirm whether your update was saved. Your entries are still here. Retry without changing them. It will not be recorded twice.';

// Shown instead of sending when this report already has too many unconfirmed updates. Nothing is evicted silently.
const tooManyUnresolvedCopy =
    'Earlier updates for this report could not be confirmed, so a new update is not sent yet. Check the progress history. If none of them appear there, discard them to continue.';

class OperationFormPage extends StatefulWidget {
  const OperationFormPage({
    super.key,
    required this.reportId,
    this.reportStatus,
  });
  final String reportId;

  /// The live report status. The offered statuses follow it while the form is open.
  /// Null means the status is unknown and the native statuses are offered.
  final ValueListenable<String?>? reportStatus;

  @override
  State<OperationFormPage> createState() => _OperationFormPageState();
}

class _OperationFormPageState extends State<OperationFormPage> {
  static const _nativeStatuses = ['Rescue in Progress', 'Resolved'];

  final _formKey = GlobalKey<FormState>();
  final _people = TextEditingController();
  final _note = TextEditingController();
  String _status = 'Rescue in Progress';
  bool _busy = false;
  String? _error;
  // True when the form is held back by too many unconfirmed updates. Only then is the discard choice offered.
  bool _blocked = false;

  @override
  void initState() {
    super.initState();
    widget.reportStatus?.addListener(_onLiveStatus);
  }

  @override
  void didUpdateWidget(OperationFormPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.reportStatus != widget.reportStatus) {
      oldWidget.reportStatus?.removeListener(_onLiveStatus);
      widget.reportStatus?.addListener(_onLiveStatus);
    }
  }

  @override
  void dispose() {
    widget.reportStatus?.removeListener(_onLiveStatus);
    _people.dispose();
    _note.dispose();
    super.dispose();
  }

  void _onLiveStatus() {
    if (mounted) setState(() {});
  }

  /// Statuses the form offers now, in the order the native form shows them.
  List<String> get _offered => allowedOperationStatuses(
    widget.reportStatus?.value,
  ).where(_nativeStatuses.contains).toList();

  /// The selected status, moved to a valid option if the live status no longer allows the last choice.
  String? get _selected {
    final offered = _offered;
    if (offered.isEmpty) return null;
    return offered.contains(_status) ? _status : offered.first;
  }

  /// The person checked the history and none of the unconfirmed entries are there. They can send new updates again.
  void _discardUnconfirmed() {
    context.read<ResponderAttemptStore>().forgetReport(widget.reportId);
    setState(() {
      _blocked = false;
      _error = null;
    });
  }

  Future<void> _submit() async {
    // A second tap before the first save has rebuilt the button must not send another request.
    if (_busy) return;
    final status = _selected;
    if (status == null) return;
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final people = int.parse(_people.text.trim());
    final note = _note.text.trim();
    final signature = [status, people, note].join('\u0001');
    final attempts = context.read<ResponderAttemptStore>();
    // Same content as an unresolved attempt for this report reuses its key, even after other content was tried.
    final previous = attempts.attemptFor(widget.reportId, signature);
    if (previous == null && attempts.isFull(widget.reportId)) {
      setState(() {
        _error = tooManyUnresolvedCopy;
        _blocked = true;
      });
      return;
    }
    final key = previous?.key ?? newSubmissionKey();
    setState(() {
      _busy = true;
      _error = null;
      _blocked = false;
    });
    try {
      await context.read<ResponderRepository>().postUpdate(
        widget.reportId,
        OperationUpdate(status: status, peopleRescued: people, note: note),
        idempotencyKey: key,
      );
      attempts.forget(widget.reportId, signature);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Update saved.')));
      await Navigator.of(context).maybePop(
        OperationUpdate(status: status, peopleRescued: people, note: note),
      );
    } catch (e) {
      if (isUncertainSubmission(e)) {
        // The server may have recorded it. Remember the key (outside this screen too), so a retry cannot record it twice.
        attempts.remember(
          widget.reportId,
          UpdateAttempt(key: key, signature: signature),
        );
        if (mounted) setState(() => _error = uncertainUpdateCopy);
      } else {
        // A definite refusal: nothing was recorded, so the next attempt of this content gets a new key.
        attempts.forget(widget.reportId, signature);
        if (mounted) {
          setState(
            () => _error = e is ApiException
                ? e.message
                : 'Could not save the update. Please try again.',
          );
        }
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final offered = _offered;
    final selected = _selected;
    return Scaffold(
      appBar: AppBar(title: const Text('Operation update')),
      body: ProductViewport(
        child: selected == null
            ? Padding(
                padding: const EdgeInsets.all(20),
                child: Text(
                  // A known status with no allowed update means the report is closed.
                  widget.reportStatus?.value != null
                      ? 'This report is closed, so no more updates can be added.'
                      : 'No status update is available for this report yet',
                ),
              )
            : Form(
                key: _formKey,
                child: ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(bottom: 16),
                      child: Text(
                        'Record the latest status and what the team has done.',
                      ),
                    ),
                    Text(
                      'Status *',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    SegmentedButton<String>(
                      segments: [
                        for (final s in offered)
                          ButtonSegment(value: s, label: Text(s)),
                      ],
                      selected: {selected},
                      onSelectionChanged: _busy
                          ? null
                          : (s) => setState(() => _status = s.first),
                    ),
                    const SizedBox(height: 20),
                    TextFormField(
                      key: const Key('peopleRescued'),
                      controller: _people,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'People rescued *',
                      ),
                      validator: validatePeopleRescued,
                    ),
                    const SizedBox(height: 20),
                    TextFormField(
                      key: const Key('note'),
                      controller: _note,
                      maxLines: 4,
                      maxLength: 500,
                      decoration: const InputDecoration(
                        labelText: 'Note (optional)',
                      ),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 16),
                      InlineError(_error!),
                    ],
                    if (_blocked) ...[
                      const SizedBox(height: 8),
                      OutlinedButton(
                        onPressed: _discardUnconfirmed,
                        child: const Text('Discard unconfirmed updates'),
                      ),
                    ],
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: _busy ? null : _submit,
                      child: Text(_busy ? 'Saving...' : 'Save update'),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}
