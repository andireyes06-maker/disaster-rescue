import 'package:flutter/foundation.dart' show ValueListenable;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../data/api_client.dart';
import '../../data/report_models.dart';
import '../../data/services.dart';
import '../auth/auth_widgets.dart';
import 'operation_transitions.dart';

class OperationFormPage extends StatefulWidget {
  const OperationFormPage({super.key, required this.reportId, this.reportStatus});
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

  Future<void> _submit() async {
    final status = _selected;
    if (status == null) return;
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await context.read<ResponderRepository>().postUpdate(
        widget.reportId,
        OperationUpdate(
          status: status,
          peopleRescued: int.parse(_people.text.trim()),
          note: _note.text.trim(),
        ),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Update saved.')));
      await Navigator.of(context).maybePop(
        OperationUpdate(
          status: status,
          peopleRescued: int.parse(_people.text.trim()),
          note: _note.text.trim(),
        ),
      );
    } on ApiException catch (e) {
      if (mounted) {
        setState(() => _error = e.message);
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Could not save the update. Please try again.');
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
      body: SafeArea(
        child: selected == null
            ? const Padding(
                padding: EdgeInsets.all(20),
                child: Text('No status update is available for this report yet'),
              )
            : Form(
                key: _formKey,
                child: ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    const Padding(padding: EdgeInsets.only(bottom: 16), child: Text('Record the latest status and what the team has done.')),
                    Text('Status', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    SegmentedButton<String>(
                      segments: [
                        for (final s in offered) ButtonSegment(value: s, label: Text(s)),
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
                      decoration: const InputDecoration(labelText: 'People rescued'),
                      validator: validatePeopleRescued,
                    ),
                    const SizedBox(height: 20),
                    TextFormField(
                      key: const Key('note'),
                      controller: _note,
                      maxLines: 4,
                      maxLength: 500,
                      decoration: const InputDecoration(labelText: 'Note (optional)'),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 16),
                      InlineError(_error!),
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
