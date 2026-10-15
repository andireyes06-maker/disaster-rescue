import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../auth/auth_controller.dart';
import '../../data/api_client.dart';
import '../../data/report_models.dart';
import '../../data/services.dart';
import '../../theme/app_theme.dart';
import '../auth/auth_widgets.dart';
import '../offline/offline_help_page.dart';
import 'hotline_button.dart';
import 'location_picker.dart';
import 'photo_picker.dart';
import 'report_draft_store.dart';
import 'submission_result_page.dart';

export '../../data/report_models.dart' show validatePhone, validatePhoto, validateDescription;

class ReportTypeInfo {
  final String label;
  final IconData icon;
  const ReportTypeInfo(this.label, this.icon);
}

const reportTypeInfo = <String, ReportTypeInfo>{
  'flood': ReportTypeInfo('Flood', Icons.water),
  'fire': ReportTypeInfo('Fire', Icons.local_fire_department_outlined),
  'earthquake': ReportTypeInfo('Earthquake', Icons.vibration),
  'landslide': ReportTypeInfo('Landslide', Icons.landscape_outlined),
  'other': ReportTypeInfo('Other', Icons.report_problem_outlined),
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
  bool _submitting = false;
  ReportDraft? _savedDraft;

  @override
  void initState() {
    super.initState();
    _loadDraft();
    _loadProfile();
  }

  Future<void> _loadDraft() async {
    final d = await context.read<DraftStore>().load();
    if (mounted && d != null) setState(() => _savedDraft = d);
  }

  Future<void> _loadProfile() async {
    final uid = context.read<AuthController>().user?.uid ?? '';
    final p = await context.read<ProfileRepository>().load(uid);
    if (!mounted || p == null) return;
    if (_name.text.isEmpty && (p.name ?? '').isNotEmpty) _name.text = p.name!;
    if (_phone.text.isEmpty && (p.phone ?? '').isNotEmpty) _phone.text = p.phone!;
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
    await context.read<DraftStore>().clear();
    if (mounted) setState(() => _savedDraft = null);
  }

  void _reset() {
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

  void _next() {
    if (_step == 2 && !(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _step++);
  }

  Future<void> _submit() async {
    if (_submitting) return;
    setState(() => _submitting = true);
    final nav = Navigator.of(context);
    final reports = context.read<ReportsRepository>();
    final drafts = context.read<DraftStore>();
    var retry = false;
    try {
      final res = await reports.create(NewReport(
        type: _type!,
        description: _description.text.trim(),
        lat: _lat!,
        lng: _lng!,
        source: _source!,
        addressText: _address.text.trim(),
        contactName: _name.text.trim(),
        contactPhone: _phone.text.trim(),
        photos: _photos,
      ));
      await drafts.clear();
      if (!mounted) return;
      _reset();
      await nav.push(MaterialPageRoute(
        builder: (_) => SubmissionSuccessPage(
          reference: res.reference,
          onViewReports: widget.onViewReports ?? () {},
        ),
      ));
    } catch (e) {
      final network = e is ApiException && e.status == 0 && e.code != 'auth';
      if (network) {
        await drafts.save(_currentDraft());
        if (!mounted) return;
        retry = (await nav.push<bool>(MaterialPageRoute(builder: (_) => const OfflineHelpPage()))) ?? false;
      } else {
        if (!mounted) return;
        await nav.push(MaterialPageRoute(
          builder: (_) => SubmissionFailurePage(reason: submitFailureReason(e)),
        ));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
    if (retry && mounted) _submit();
  }

  @override
  Widget build(BuildContext context) {
    final scale = MediaQuery.textScalerOf(context).scale(1);
    return Scaffold(
      appBar: AppBar(title: const Text('Report an emergency')),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Wrap(
                    alignment: WrapAlignment.spaceBetween,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 8,
                    children: [
                      Text('Step ${_step + 1} of 4', style: const TextStyle(fontWeight: FontWeight.w600)),
                      const HotlineButton(),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Semantics(
                    label: 'Step ${_step + 1} of 4',
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(value: (_step + 1) / 4, minHeight: 8),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (_step == 0 && _savedDraft != null) _draftCard(),
                    Text(_stepTitles[_step], style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 16),
                    _body(scale),
                  ],
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
              FilledButton(onPressed: _continueDraft, child: const Text('Continue your saved report')),
              const SizedBox(height: 8),
              OutlinedButton(onPressed: _discardDraft, child: const Text('Discard')),
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

  Widget _typeStep(double scale) {
    final cols = scale > 1.3 ? 1 : 2;
    return GridView.count(
      crossAxisCount: cols,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: cols == 1 ? 4 : 1.5,
      children: [
        for (final e in reportTypeInfo.entries)
          _TypeTile(
            info: e.value,
            selected: _type == e.key,
            onTap: () => setState(() => _type = e.key),
          ),
      ],
    );
  }

  Widget _detailsStep() {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            key: const Key('description'),
            controller: _description,
            minLines: 3,
            maxLines: 6,
            maxLength: 1000,
            textCapitalization: TextCapitalization.sentences,
            validator: validateDescription,
            decoration: const InputDecoration(
              labelText: 'What is happening?',
              hintText: 'Who is in danger, and what do they need?',
            ),
          ),
          const SizedBox(height: 16),
          PhotoPickerSection(
            service: context.read<PhotoService>(),
            photos: _photos,
            onChanged: (p) => setState(() => _photos = p),
          ),
          const SizedBox(height: 24),
          Text('Who can we call?', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          TextFormField(
            key: const Key('contactName'),
            controller: _name,
            textCapitalization: TextCapitalization.words,
            validator: (v) => (v ?? '').trim().isEmpty ? 'Enter your name.' : null,
            decoration: const InputDecoration(labelText: 'Your name'),
          ),
          const SizedBox(height: 16),
          TextFormField(
            key: const Key('contactPhone'),
            controller: _phone,
            keyboardType: TextInputType.phone,
            validator: validatePhone,
            decoration: const InputDecoration(labelText: 'Phone number'),
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
                Row(children: [
                  Icon(info.icon, color: AppColors.primary),
                  const SizedBox(width: 8),
                  Expanded(child: Text(info.label, style: const TextStyle(fontWeight: FontWeight.w700))),
                ]),
                row('Location',
                    '${_lat!.toStringAsFixed(5)}, ${_lng!.toStringAsFixed(5)} (${_source == 'gps' ? 'from GPS' : 'picked on map'})'),
                if (_address.text.trim().isNotEmpty) row('Address or landmark', _address.text.trim()),
                row('Description', _description.text.trim()),
                row('Photos', _photos.isEmpty ? 'None' : '${_photos.length} attached'),
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
              child: Text('Choose a location to continue.', textAlign: TextAlign.center),
            ),
          if (last)
            FilledButton(
              onPressed: _submitting ? null : _submit,
              style: FilledButton.styleFrom(backgroundColor: AppColors.critical, foregroundColor: Colors.white),
              child: _submitting
                  ? const Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                      SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)),
                      SizedBox(width: 12),
                      Text('Sending'),
                    ])
                  : const Text('Submit report'),
            )
          else
            FilledButton(onPressed: _canNext ? _next : null, child: const Text('Next')),
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
  const _TypeTile({required this.info, required this.selected, required this.onTap});
  final ReportTypeInfo info;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      label: info.label,
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        child: Ink(
          decoration: BoxDecoration(
            color: selected ? AppColors.primarySoft : AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: selected ? AppColors.primary : AppColors.muted.withValues(alpha: 0.5), width: selected ? 3 : 1),
          ),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(info.icon, size: 28, color: AppColors.primary),
                const SizedBox(width: 8),
                Flexible(child: Text(info.label, style: const TextStyle(fontWeight: FontWeight.w600))),
                if (selected) ...[
                  const SizedBox(width: 6),
                  const Icon(Icons.check_circle, color: AppColors.primary, size: 20),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
