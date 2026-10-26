import '../notifications/notification_action.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../auth/auth_controller.dart';
import '../../data/photo_identity.dart';
import '../../data/submission_key.dart';
import '../../data/api_client.dart';
import '../../data/report_models.dart';
import '../../data/services.dart';
import '../../theme/app_theme.dart';
import '../../theme/product_widgets.dart';
import '../../theme/product_motion.dart';
import '../auth/auth_widgets.dart';
import '../offline/offline_help_page.dart';
import 'hotline_button.dart';
import 'location_picker.dart';
import 'photo_picker.dart';
import 'report_draft_store.dart';
import 'submission_result_page.dart';

export '../../data/report_models.dart'
    show validatePhone, validatePhoto, validateDescription;

class ReportTypeInfo {
  final String label;
  final IconData icon;
  final String detail;
  const ReportTypeInfo(this.label, this.icon, [this.detail = '']);
}

const reportTypeInfo = <String, ReportTypeInfo>{
  'flood': ReportTypeInfo('Flood', Icons.water, 'Rising water or flooding'),
  'fire': ReportTypeInfo(
    'Fire',
    Icons.local_fire_department_outlined,
    'Flames, smoke or a fire',
  ),
  'earthquake': ReportTypeInfo(
    'Earthquake',
    Icons.vibration,
    'Ground shaking or damage',
  ),
  'landslide': ReportTypeInfo(
    'Landslide',
    Icons.landscape_outlined,
    'Moving soil or blocked slopes',
  ),
  'other': ReportTypeInfo(
    'Other',
    Icons.report_problem_outlined,
    'Another urgent situation',
  ),
};

const _stepTitles = [
  'What is happening?',
  'Where is it?',
  'Tell us more',
  'Check and send',
];

class ReportFlowPage extends StatefulWidget {
  const ReportFlowPage({super.key, this.onViewReports});

  /// Called after the success page, to show the My Reports tab.
  final VoidCallback? onViewReports;

  @override
  State<ReportFlowPage> createState() => _ReportFlowPageState();
}

class _ReportFlowPageState extends State<ReportFlowPage> {
  final _formKey = GlobalKey<FormState>();
  final _description = TextEditingController();
  final _address = TextEditingController();
  final _name = TextEditingController();
  final _phone = TextEditingController();

  int _step = 0;
  String? _type;
  double? _lat;
  double? _lng;
  String? _source;
  List<PickedPhoto> _photos = [];
  // How far the danger reaches from the point. Responders may act only within this distance.
  int _reachM = 500;
  static const _reachOptions = [100, 250, 500, 1000, 2000, 5000];
  bool _submitting = false;
  // One key per submission attempt. Kept across network retries; replaced when the content changes.
  String? _submitKey;
  String? _submitKeySignature;
  ReportDraft? _savedDraft;
  // Set on restart when the last send was uncertain (F02, D2). Submit waits for the explicit new-report action.
  bool _blockedByUncertain = false;

  @override
  void initState() {
    super.initState();
    _loadDraft();
    _loadUncertain();
    _loadProfile();
  }

  Future<void> _loadDraft() async {
    final d = await context.read<DraftStore>().load();
    if (mounted && d != null) setState(() => _savedDraft = d);
  }

  Future<void> _loadUncertain() async {
    // If the flag cannot be read, the state is unknown, so the form stays blocked. The explicit
    // new-report action remains available, so a broken store cannot lock the resident out for good.
    var uncertain = true;
    try {
      uncertain = await context.read<DraftStore>().loadUncertainSend();
    } catch (_) {}
    if (mounted && uncertain) setState(() => _blockedByUncertain = true);
  }

  Future<void> _loadProfile() async {
    final uid = context.read<AuthController>().user?.uid ?? '';
    final p = await context.read<ProfileRepository>().load(uid);
    if (!mounted || p == null) return;
    if (_name.text.isEmpty && (p.name ?? '').isNotEmpty) _name.text = p.name!;
    if (_phone.text.isEmpty && (p.phone ?? '').isNotEmpty) {
      _phone.text = p.phone!;
    }
  }

  @override
  void dispose() {
    _description.dispose();
    _address.dispose();
    _name.dispose();
    _phone.dispose();
    super.dispose();
  }

  bool get _hasLocation => _lat != null && _lng != null && _source != null;

  ReportDraft _currentDraft() => ReportDraft(
    type: _type,
    description: _description.text,
    lat: _lat,
    lng: _lng,
    source: _source,
    addressText: _address.text,
    contactName: _name.text,
    contactPhone: _phone.text,
  );

  bool _complete(ReportDraft d) =>
      d.type != null &&
      d.lat != null &&
      d.lng != null &&
      d.source != null &&
      validateDescription(d.description) == null &&
      d.contactName.trim().isNotEmpty &&
      validatePhone(d.contactPhone) == null;

  void _continueDraft() {
    final d = _savedDraft!;
    setState(() {
      _type = reportTypeInfo.containsKey(d.type) ? d.type : null;
      _description.text = d.description;
      _lat = d.lat;
      _lng = d.lng;
      _source = d.source;
      _address.text = d.addressText;
      _name.text = d.contactName;
      _phone.text = d.contactPhone;
      _savedDraft = null;
      if (_type == null) {
        _step = 0;
      } else if (!_hasLocation) {
        _step = 1;
      } else {
        _step = _complete(d) ? 3 : 2;
      }
    });
  }

  Future<void> _discardDraft() async {
    final drafts = context.read<DraftStore>();
    await drafts.clear();
    // Discarding the saved report also ends the uncertain-send block (F02).
    try {
      await drafts.setUncertainSend(false);
    } catch (_) {}
    if (mounted) {
      setState(() {
        _savedDraft = null;
        _blockedByUncertain = false;
      });
    }
  }

  void _reset() {
    _submitKey = null;
    _submitKeySignature = null;
    setState(() {
      _step = 0;
      _type = null;
      _lat = _lng = _source = null;
      _photos = [];
      _description.clear();
      _address.clear();
    });
  }

  bool get _canNext {
    switch (_step) {
      case 0:
        return _type != null;
      case 1:
        return _hasLocation;
      default:
        return true;
    }
  }

  static const _needPhoto = 'Add at least one photo as proof.';
  static const _needLocation =
      'Choose a location first: use your current location or pick on a map.';

  void _notify(String message) {
    ScaffoldMessenger.maybeOf(
      context,
    )?.showSnackBar(SnackBar(content: Text(message)));
  }

  void _next() {
    if (_step == 2 && !(_formKey.currentState?.validate() ?? false)) return;
    if (_step == 2 && _photos.isEmpty) {
      _notify(_needPhoto);
      return;
    }
    setState(() => _step++);
  }

  /// The explicit replay resolution (D2): the user checked My reports and chose to send as a new report.
  Future<void> _sendAsNewReport() async {
    try {
      await context.read<DraftStore>().setUncertainSend(false);
    } catch (_) {}
    _submitKey = null;
    _submitKeySignature = null;
    setState(() => _blockedByUncertain = false);
    await _submit();
  }

  Future<void> _submit() async {
    if (_submitting || _blockedByUncertain) return;
    if (_photos.isEmpty) {
      _notify(_needPhoto);
      return;
    }
    if (!_hasLocation) {
      _notify(_needLocation);
      return;
    }
    setState(() => _submitting = true);
    final nav = Navigator.of(context);
    final reports = context.read<ReportsRepository>();
    final drafts = context.read<DraftStore>();
    var retry = false;
    SubmitResult? created;
    final signature = submissionSignature(_currentDraft(), _photos);
    if (_submitKey == null || _submitKeySignature != signature) {
      _submitKey = newSubmissionKey();
      _submitKeySignature = signature;
    }
    try {
      created = await reports.create(
        NewReport(
          type: _type!,
          description: _description.text.trim(),
          lat: _lat!,
          lng: _lng!,
          source: _source!,
          addressText: _address.text.trim(),
          contactName: _name.text.trim(),
          contactPhone: _phone.text.trim(),
          photos: _photos,
          affectedRadiusM: _reachM,
          idempotencyKey: _submitKey,
        ),
      );
    } catch (e) {
      if (isUncertainSubmission(e)) {
        // The outcome is uncertain, so the key stays: a retry cannot create a second report.
        // The flag and draft survive a restart, so the app does not silently send again (F02, D2).
        // A storage failure must not hide the uncertain outcome, so each write is guarded on its own.
        // The pages say when a write failed, rather than claiming the warning survives a restart.
        var draftNotSaved = false;
        var warningNotSaved = false;
        try {
          await drafts.save(_currentDraft());
        } catch (_) {
          draftNotSaved = true;
        }
        try {
          await drafts.setUncertainSend(true);
        } catch (_) {
          warningNotSaved = true;
        }
        if (!mounted) return;
        if (e is ApiException && e.status == 0) {
          retry =
              (await nav.push<bool>(
                MaterialPageRoute(
                  builder: (_) => OfflineHelpPage(
                    draftNotSaved: draftNotSaved,
                    warningNotSaved: warningNotSaved,
                  ),
                ),
              )) ??
              false;
        } else {
          await nav.push(
            MaterialPageRoute(
              builder: (_) => SubmissionFailurePage(
                reason: submitFailureReason(e),
                uncertain: true,
                draftNotSaved: draftNotSaved,
                warningNotSaved: warningNotSaved,
              ),
            ),
          );
        }
      } else {
        // A definite refusal: no report was made, so the key is dropped and the next attempt is new.
        _submitKey = null;
        _submitKeySignature = null;
        if (!mounted) return;
        await nav.push(
          MaterialPageRoute(
            builder: (_) =>
                SubmissionFailurePage(reason: submitFailureReason(e)),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
    if (created == null) {
      if (retry && mounted) _submit();
      return;
    }
    _submitKey = null;
    _submitKeySignature = null;
    // The report exists on the server now. Clearing the local draft is best effort: a failure here
    // must not turn a confirmed submission into "not sent" or allow a second send.
    try {
      await drafts.clear();
    } catch (_) {}
    try {
      await drafts.setUncertainSend(false);
    } catch (_) {}
    _blockedByUncertain = false;
    if (!mounted) return;
    _reset();
    await nav.push(
      MaterialPageRoute(
        builder: (_) => SubmissionSuccessPage(
          reference: created!.reference,
          onViewReports: widget.onViewReports ?? () {},
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final scale = MediaQuery.textScalerOf(context).scale(1);
    return Scaffold(
      appBar: AppBar(
        actions: const [NotificationAction()],
        title: const Text('Report an emergency'),
        leading: Padding(
          padding: const EdgeInsets.all(14),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: AppColors.primarySoft,
              borderRadius: BorderRadius.circular(9),
            ),
            child: const Icon(Icons.add, color: AppColors.primary, size: 19),
          ),
        ),
      ),
      body: ProductViewport(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Wrap(
                    alignment: WrapAlignment.spaceBetween,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 8,
                    children: [
                      Text(
                        'Step ${_step + 1} of 4',
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      const HotlineButton(),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ProductSteps(current: _step),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
                child: ProductArrival(
                  key: ValueKey('report-step-$_step'),
                  duration: const Duration(milliseconds: 240),
                  distance: 10,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (_step == 0 && _savedDraft != null) _draftCard(),
                      Text(
                        _stepTitles[_step],
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        const [
                          'Choose the situation that best describes the emergency.',
                          'A precise location helps the response team find you.',
                          'Share useful details and a way to reach you.',
                          'Make sure the information is right before you send.',
                        ][_step],
                        style: const TextStyle(
                          color: AppColors.muted,
                          height: 1.5,
                        ),
                      ),
                      const SizedBox(height: 16),
                      if (_step <= 1) ...[
                        const Text(
                          '* Required',
                          semanticsLabel: 'Required',
                          style: TextStyle(color: AppColors.muted),
                        ),
                        const SizedBox(height: 12),
                        Semantics(
                          container: true,
                          explicitChildNodes: true,
                          label: '${_stepTitles[_step]}, required',
                          child: _body(scale),
                        ),
                      ] else
                        _body(scale),
                    ],
                  ),
                ),
              ),
            ),
            _bottomBar(),
          ],
        ),
      ),
    );
  }

  Widget _draftCard() => Card(
    margin: const EdgeInsets.only(bottom: 16),
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('You have a report that was not sent.'),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _continueDraft,
            child: const Text('Continue your saved report'),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: _discardDraft,
            child: const Text('Discard'),
          ),
        ],
      ),
    ),
  );

  Widget _body(double scale) {
    switch (_step) {
      case 0:
        return _typeStep(scale);
      case 1:
        return LocationStep(
          service: context.read<LocationService>(),
          lat: _lat,
          lng: _lng,
          source: _source,
          radiusM: _reachM,
          addressController: _address,
          onPicked: (lat, lng, source) => setState(() {
            _lat = lat;
            _lng = lng;
            _source = source;
          }),
        );
      case 2:
        return _detailsStep();
      default:
        return _confirmStep();
    }
  }

  Widget _typeStep(double scale) => LayoutBuilder(
    builder: (context, box) {
      final tiles = [
        for (final e in reportTypeInfo.entries)
          _TypeTile(
            info: e.value,
            selected: _type == e.key,
            onTap: () => setState(() => _type = e.key),
          ),
      ];
      if (box.maxWidth >= 640 && scale < 1.4) {
        return Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            for (final tile in tiles)
              SizedBox(width: (box.maxWidth - 12) / 2, child: tile),
          ],
        );
      }
      return Column(
        children: [
          for (var i = 0; i < tiles.length; i++) ...[
            if (i > 0) const SizedBox(height: 10),
            tiles[i],
          ],
        ],
      );
    },
  );

  Widget _detailsStep() {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            errorBuilder: fieldErrorBuilder,
            key: const Key('description'),
            controller: _description,
            minLines: 3,
            maxLines: 6,
            maxLength: 1000,
            textCapitalization: TextCapitalization.sentences,
            validator: validateDescription,
            decoration: InputDecoration(
              label: requiredFieldLabel('What is happening?'),
              hintText: 'Who is in danger, and what do they need?',
            ),
          ),
          const SizedBox(height: 16),
          PhotoPickerSection(
            service: context.read<PhotoService>(),
            photos: _photos,
            onChanged: (p) => setState(() => _photos = p),
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<int>(
            key: const Key('reach'),
            initialValue: _reachM,
            decoration: InputDecoration(
              label: requiredFieldLabel('How far does the danger reach?'),
              helperText:
                  'Responders can act only within this distance of the point you marked.',
            ),
            items: [
              for (final m in _reachOptions)
                DropdownMenuItem(
                  value: m,
                  child: Text(m >= 1000 ? '${m ~/ 1000} km' : '$m m'),
                ),
            ],
            onChanged: (v) => setState(() => _reachM = v ?? _reachM),
          ),
          const SizedBox(height: 24),
          Text(
            'Who can we call?',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          TextFormField(
            errorBuilder: fieldErrorBuilder,
            key: const Key('contactName'),
            controller: _name,
            textCapitalization: TextCapitalization.words,
            validator: (v) =>
                (v ?? '').trim().isEmpty ? 'Enter your name.' : null,
            decoration: InputDecoration(label: requiredFieldLabel('Your name')),
          ),
          const SizedBox(height: 16),
          TextFormField(
            errorBuilder: fieldErrorBuilder,
            key: const Key('contactPhone'),
            controller: _phone,
            keyboardType: TextInputType.phone,
            validator: validatePhone,
            decoration: InputDecoration(
              label: requiredFieldLabel('Phone number'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _confirmStep() {
    final info = reportTypeInfo[_type] ?? reportTypeInfo['other']!;
    Widget row(String k, String v) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(k, style: const TextStyle(color: AppColors.muted, fontSize: 13)),
          Text(v),
        ],
      ),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(info.icon, color: AppColors.primary),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        info.label,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                  ],
                ),
                row(
                  'Location',
                  '${_lat!.toStringAsFixed(5)}, ${_lng!.toStringAsFixed(5)} (${_source == 'gps' ? 'from GPS' : 'picked on map'})',
                ),
                if (_address.text.trim().isNotEmpty)
                  row('Address or landmark', _address.text.trim()),
                row('Description', _description.text.trim()),
                row(
                  'Photos',
                  _photos.isEmpty ? 'None' : '${_photos.length} attached',
                ),
                row('Contact', '${_name.text.trim()}, ${_phone.text.trim()}'),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        const DisclaimerBox(),
      ],
    );
  }

  Widget _bottomBar() {
    final last = _step == 3;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_step == 1 && !_hasLocation)
            const Padding(
              padding: EdgeInsets.only(bottom: 8),
              child: Text(
                'Choose a location to continue.',
                textAlign: TextAlign.center,
              ),
            ),
          if (last && _blockedByUncertain) ...[
            Text(uncertainCopy, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: _submitting ? null : _sendAsNewReport,
              child: const Text('I checked, send as a new report'),
            ),
            const SizedBox(height: 8),
          ],
          if (last)
            FilledButton(
              onPressed: _submitting ? null : _submit,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
              ),
              child: _submitting
                  ? const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        ),
                        SizedBox(width: 12),
                        Text('Sending'),
                      ],
                    )
                  : const Text('Submit report'),
            )
          else
            FilledButton(
              onPressed: _canNext ? _next : null,
              child: const Text('Next'),
            ),
          if (_step > 0) ...[
            const SizedBox(height: 8),
            TextButton(
              onPressed: _submitting ? null : () => setState(() => _step--),
              child: const Text('Back'),
            ),
          ],
        ],
      ),
    );
  }
}

class _TypeTile extends StatelessWidget {
  const _TypeTile({
    required this.info,
    required this.selected,
    required this.onTap,
  });
  final ReportTypeInfo info;
  final bool selected;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    selected: selected,
    label: info.label,
    onTap: onTap,
    excludeSemantics: true,
    child: Material(
      color: selected ? AppColors.primarySoft : AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(
          color: selected ? AppColors.primary : AppColors.border,
          width: selected ? 1.5 : 1,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: selected ? AppColors.primary : AppColors.bg,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  info.icon,
                  size: 24,
                  color: selected ? Colors.white : AppColors.primary,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      info.label,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 3),
                    Text(
                      info.detail,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Icon(
                selected
                    ? Icons.check_circle_rounded
                    : Icons.radio_button_unchecked_rounded,
                size: 21,
                color: selected ? AppColors.primary : AppColors.controlOutline,
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
