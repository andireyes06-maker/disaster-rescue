import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../data/api_client.dart';
import '../../data/report_models.dart';
import '../../data/services.dart';
import '../../theme/app_theme.dart';
import '../auth/auth_widgets.dart';
import '../my_reports/my_reports_page.dart' show StatusChip, formatWhen;
import 'operation_form_page.dart';

class IncidentDetailPage extends StatefulWidget {
  const IncidentDetailPage({super.key, required this.report});
  final AssignedReport report;

  @override
  State<IncidentDetailPage> createState() => _IncidentDetailPageState();
}

class _IncidentDetailPageState extends State<IncidentDetailPage> {
  // The live record. Null once the report is removed or this team no longer has access, so its details are hidden.
  AssignedReport? _current;
  bool _acknowledged = false;
  bool _busy = false;
  String? _error;
  StreamSubscription<AssignedReport?>? _sub;
  // The status the update form validates against. Empty once the report is removed, so no update is offered.
  final _liveStatus = ValueNotifier<String?>(null);

  static const _closedStatuses = {'Resolved', 'Closed', 'Rejected', 'Duplicate', 'Cancelled'};

  @override
  void initState() {
    super.initState();
    _current = widget.report;
    _liveStatus.value = widget.report.status;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sub ??= context.read<ResponderRepository>().watchReport(widget.report.id).listen(
      (r) => setState(() {
        _current = r;
        _liveStatus.value = r?.status ?? '';
        _error = null;
      }),
      onError: (_) => setState(() {
        _current = null;
        _liveStatus.value = '';
      }),
    );
  }

  @override
  void dispose() {
    _sub?.cancel();
    _liveStatus.dispose();
    super.dispose();
  }

  Future<void> _acknowledge() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await context.read<ResponderRepository>().acknowledge(widget.report.id);
      if (!mounted) return;
      setState(() => _acknowledged = true);
    } on ApiException catch (e) {
      if (mounted) {
        setState(() => _error = e.message);
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Could not acknowledge. Please try again.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _updateStatus() async {
    // The live subscription shows the new status once the server confirms it.
    await Navigator.of(context).push<OperationUpdate>(
      MaterialPageRoute(
        builder: (_) => OperationFormPage(reportId: widget.report.id, reportStatus: _liveStatus),
      ),
    );
  }

  Future<void> _openMap() async {
    final r = _current ?? widget.report;
    final uri = Uri.https('www.google.com', '/maps/search/', {
      'api': '1',
      'query': '${r.lat},${r.lng}',
    });
    try {
      final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!ok && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('No maps app is available on this phone.'),
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open the maps app.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final r = _current;
    if (r == null) {
      return Scaffold(
        appBar: AppBar(title: Text(widget.report.reference ?? 'Incident')),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'This incident is no longer assigned to your team, or it was removed. Its details are hidden.',
                ),
                const SizedBox(height: 16),
                OutlinedButton(
                  onPressed: () => Navigator.of(context).maybePop(),
                  child: const Text('Back to assignments'),
                ),
              ],
            ),
          ),
        ),
      );
    }
    final hasLocation = r.lat != null && r.lng != null;
    final closed = _closedStatuses.contains(r.status);
    return Scaffold(
      appBar: AppBar(title: Text(r.reference ?? 'Incident')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Row(children: [StatusChip(r.status)]),
            if (closed) const Padding(padding: EdgeInsets.only(top: 12), child: Text('Completed report · Read only.')),
            const SizedBox(height: 16),
            Text(
              'What is happening',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 4),
            Text(r.description),
            const SizedBox(height: 16),
            Text('Location', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 4),
            if (r.addressText != null && r.addressText!.trim().isNotEmpty)
              Text(r.addressText!.trim()),
            if (hasLocation) Text('${r.lat}, ${r.lng}'),
            if (!hasLocation) const Text('No exact location was given.'),
            const SizedBox(height: 8),
            if (hasLocation)
              OutlinedButton.icon(
                onPressed: _openMap,
                icon: const Icon(Icons.map_outlined),
                label: const Text('Open in maps'),
              ),
            const SizedBox(height: 16),
            Text(
              'Reported ${formatWhen(r.createdAt)}',
              style: const TextStyle(color: AppColors.muted),
            ),
            const SizedBox(height: 24),
            if (_error != null) ...[
              InlineError(_error!),
              const SizedBox(height: 16),
            ],
            if (!closed) FilledButton.icon(
              onPressed: _acknowledged || _busy || closed ? null : _acknowledge,
              icon: Icon(
                _acknowledged ? Icons.check : Icons.thumb_up_alt_outlined,
              ),
              label: Text(_acknowledged ? 'Acknowledged' : 'Acknowledge'),
            ),
            if (!closed) ...[
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: _updateStatus,
                icon: const Icon(Icons.edit_note),
                label: const Text('Add operation update'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
