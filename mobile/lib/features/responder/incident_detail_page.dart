import '../../theme/product_widgets.dart';
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../data/api_client.dart';
import '../../data/report_models.dart';
import '../../data/services.dart';
import '../../theme/app_theme.dart';
import '../../theme/confirm_dialog.dart';
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

  // Progress history, newest first. It is bounded: a page of entries is fetched, five are shown at first, and the
  // next page is fetched only when the person asks for older entries. It clears with the report's access.
  static const _historyStep = 5;
  static const _historyPage = 20;
  StreamSubscription<List<ProgressEntry>>? _progressSub;
  List<ProgressEntry>? _progress;
  bool _progressFailed = false;
  int _progressLimit = _historyPage;
  int _progressShown = _historyStep;

  static const _closedStatuses = {
    'Resolved',
    'Closed',
    'Rejected',
    'Duplicate',
    'Cancelled',
  };

  @override
  void initState() {
    super.initState();
    _current = widget.report;
    _liveStatus.value = widget.report.status;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sub ??= context
        .read<ResponderRepository>()
        .watchReport(widget.report.id)
        .listen(
          (r) {
            setState(() {
              _current = r;
              _liveStatus.value = r?.status ?? '';
              _error = null;
              if (r == null) _clearProgress();
            });
            // Access came back (or the first answer arrived): the history starts again.
            if (r != null && _progressSub == null) _watchProgress();
          },
          onError: (_) => setState(() {
            _current = null;
            _liveStatus.value = '';
            _clearProgress();
          }),
        );
    if (_progressSub == null && _current != null) _watchProgress();
  }

  @override
  void dispose() {
    _sub?.cancel();
    _progressSub?.cancel();
    _liveStatus.dispose();
    super.dispose();
  }

  void _watchProgress() {
    _progressSub?.cancel();
    _progressFailed = false;
    _progressSub = context
        .read<ResponderRepository>()
        .watchUpdates(widget.report.id, limit: _progressLimit)
        .listen(
          (entries) => setState(() {
            _progress = entries;
            _progressFailed = false;
          }),
          onError: (_) => setState(() => _progressFailed = true),
        );
  }

  /// Drops the history and stops its listener. Used when the team loses access to the report.
  void _clearProgress() {
    _progressSub?.cancel();
    _progressSub = null;
    _progress = null;
    _progressFailed = false;
    _progressLimit = _historyPage;
    _progressShown = _historyStep;
  }

  void _showMoreProgress() => setState(() => _progressShown += _historyStep);

  void _loadOlderProgress() {
    setState(() {
      _progressLimit += _historyPage;
      _progressShown += _historyStep;
    });
    _watchProgress();
  }

  // Acknowledging is once per team member. The person confirms first; the server also treats a repeat as already done.
  Future<void> _confirmAcknowledge() async {
    final ok = await confirmAction(
      context,
      message: 'Acknowledge this incident for your team? This can only be done once.',
      confirmLabel: 'Acknowledge',
    );
    if (!ok || !mounted) return;
    await _acknowledge();
  }

  Future<void> _acknowledge() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      // Acknowledging needs only assignment to the team, so no location is sent.
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
        builder: (_) => OperationFormPage(
          reportId: widget.report.id,
          reportStatus: _liveStatus,
        ),
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
        body: ProductViewport(
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
      body: ProductViewport(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            ProductSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      StatusChip(r.status),
                      if (r.priority != null) ProductPriority(r.priority!),
                    ],
                  ),
                  if (closed)
                    const Padding(
                      padding: EdgeInsets.only(top: 12),
                      child: Text('Completed report · Read only.'),
                    ),
                  const SizedBox(height: 16),
                  Text(
                    'What is happening',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 4),
                  Text(r.description),
                  const SizedBox(height: 16),
                  Text(
                    'Location',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 4),
                  if (r.addressText != null && r.addressText!.trim().isNotEmpty)
                    Text(r.addressText!.trim()),
                  if (hasLocation && r.addressText != null && r.addressText!.trim().isNotEmpty)
                    const SizedBox(height: 4),
                  if (hasLocation)
                    Text(
                      (r.placeName ?? '').trim().isNotEmpty
                          ? r.placeName!.trim()
                          : (r.area ?? '').trim().isNotEmpty
                          ? r.area!.trim()
                          : 'Place not named',
                    ),
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
                ],
              ),
            ),
            const SizedBox(height: 24),
            if (_error != null) ...[
              InlineError(_error!),
              const SizedBox(height: 16),
            ],
            if (!closed)
              FilledButton.icon(
                onPressed: _acknowledged || _busy || closed
                    ? null
                    : _confirmAcknowledge,
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
            const SizedBox(height: 28),
            ProductSurface(child: _progressSection(context)),
          ],
        ),
      ),
    );
  }

  Widget _progressSection(BuildContext context) {
    final heading = Semantics(
      header: true,
      child: Text(
        'Progress history',
        style: Theme.of(context).textTheme.titleMedium,
      ),
    );
    if (_progressFailed) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          heading,
          const SizedBox(height: 8),
          const InlineError('Could not load the progress history. Try again.'),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: () => setState(_watchProgress),
            child: const Text('Try again'),
          ),
        ],
      );
    }
    final entries = _progress;
    if (entries == null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          heading,
          const SizedBox(height: 8),
          const Text('Loading progress history'),
        ],
      );
    }
    if (entries.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          heading,
          const SizedBox(height: 8),
          const Text('No progress entries have been recorded yet.'),
        ],
      );
    }
    final shown = entries.take(_progressShown).toList();
    final moreLoaded = entries.length > shown.length;
    // A full page means older entries may exist on the server.
    final mayHaveOlder = entries.length >= _progressLimit;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        heading,
        const SizedBox(height: 8),
        for (final e in shown) _progressTile(context, e),
        if (moreLoaded)
          OutlinedButton(
            onPressed: _showMoreProgress,
            child: const Text('Show more entries'),
          )
        else if (mayHaveOlder)
          OutlinedButton(
            onPressed: _loadOlderProgress,
            child: const Text('Load older entries'),
          ),
      ],
    );
  }

  Widget _progressTile(BuildContext context, ProgressEntry e) {
    final note = e.note.trim();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 9,
            height: 9,
            margin: const EdgeInsets.only(top: 7),
            decoration: const BoxDecoration(
              color: AppColors.primary,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(e.status, style: Theme.of(context).textTheme.titleMedium),
                if (e.peopleRescued > 0) ...[
                  const SizedBox(height: 4),
                  Text(
                    '${e.peopleRescued} rescued',
                    style: const TextStyle(
                      color: AppColors.success,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
                if (note.isNotEmpty) ...[const SizedBox(height: 6), Text(note)],
                const SizedBox(height: 6),
                Text(
                  formatWhen(e.at),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
