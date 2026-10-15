import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../data/api_client.dart';
import '../../data/report_models.dart';
import '../../data/services.dart';
import '../auth/auth_widgets.dart';

class OperationFormPage extends StatefulWidget {
  const OperationFormPage({super.key, required this.reportId});
  final String reportId;

  @override
  State<OperationFormPage> createState() => _OperationFormPageState();
}

class _OperationFormPageState extends State<OperationFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _people = TextEditingController();
  final _note = TextEditingController();
  String _status = 'Rescue in Progress';
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _people.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await context.read<ResponderRepository>().postUpdate(
        widget.reportId,
        OperationUpdate(
          status: _status,
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
          status: _status,
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
    return Scaffold(
      appBar: AppBar(title: const Text('Operation update')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Text('Status', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(
                    value: 'Rescue in Progress',
                    label: Text('Rescue in Progress'),
                  ),
                  ButtonSegment(value: 'Resolved', label: Text('Resolved')),
                ],
                selected: {_status},
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
