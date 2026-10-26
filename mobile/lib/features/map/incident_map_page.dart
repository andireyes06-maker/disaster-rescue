import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:share_plus/share_plus.dart';

import '../../data/report_models.dart';
import '../../theme/app_theme.dart';
import '../../theme/product_widgets.dart';
import '../report/report_flow_page.dart' show reportTypeInfo;
import '../responder/incident_detail_page.dart';
import 'map_markers.dart';

const _defaultCenter = LatLng(14.5995, 120.9842);

class IncidentMapPage extends StatefulWidget {
  const IncidentMapPage({
    super.key,
    required this.reports,
    required this.viewerUid,
    this.viewerTeam,
    this.showTiles = true,
  });

  final Stream<List<AssignedReport>> reports;
  final String viewerUid;
  final String? viewerTeam;

  /// Tests pass false so no tile request is made.
  final bool showTiles;

  @override
  State<IncidentMapPage> createState() => _IncidentMapPageState();
}

class _IncidentMapPageState extends State<IncidentMapPage> {
  String? _type;
  // Lower-case search text. Matches type, place, reference and description.
  String _query = '';

  bool _matchesQuery(AssignedReport r) {
    if (_query.isEmpty) return true;
    return [
      r.type,
      r.description,
      r.addressText ?? '',
      r.reference ?? '',
    ].any((text) => text.toLowerCase().contains(_query));
  }

  /// Shares the incidents now listed, with a map link for each that has a point.
  Future<void> _share(List<AssignedReport> shown) async {
    final lines = <String>[
      'Rescue Reports: ${shown.length} incident${shown.length == 1 ? '' : 's'}',
    ];
    for (final r in shown.take(10)) {
      final where = r.addressText?.trim().isNotEmpty == true
          ? r.addressText!.trim()
          : 'no address given';
      final link = r.lat != null && r.lng != null
          ? ' https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}'
          : '';
      lines.add(
        '- ${r.reference ?? r.id}: ${r.type}, $where, ${r.status}.$link',
      );
    }
    if (shown.length > 10) lines.add('...and ${shown.length - 10} more.');
    await SharePlus.instance.share(ShareParams(text: lines.join('\n')));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Incident map')),
      body: StreamBuilder<List<AssignedReport>>(
        stream: widget.reports,
        builder: (context, snap) {
          if (snap.hasError) {
            return const ProductEmpty(
              icon: Icons.wifi_off_rounded,
              title: 'The map could not be loaded',
              description:
                  'Check your connection and reopen the map to try again.',
            );
          }
          if (!snap.hasData) {
            return const ProductLoading();
          }
          final all = snap.data!;
          final shown = all
              .where((r) => _type == null || r.type == _type)
              .where(_matchesQuery)
              .toList();
          final points = <_Pin>[];
          for (final r in shown) {
            final p = visibleLocation(
              r,
              viewerUid: widget.viewerUid,
              viewerTeam: widget.viewerTeam,
            );
            if (p != null) points.add(_Pin(r, p));
          }
          final filters = Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        key: const Key('map-search'),
                        decoration: const InputDecoration(
                          prefixIcon: Icon(Icons.search),
                          hintText: 'Search type, place or reference',
                          isDense: true,
                        ),
                        onChanged: (v) =>
                            setState(() => _query = v.trim().toLowerCase()),
                      ),
                    ),
                    IconButton(
                      key: const Key('map-share'),
                      tooltip: 'Share these incidents',
                      icon: const Icon(Icons.share),
                      onPressed: shown.isEmpty ? null : () => _share(shown),
                    ),
                  ],
                ),
              ),
              _FilterBar(
                selected: _type,
                onSelected: (t) => setState(() => _type = t),
              ),
            ],
          );
          // Landscape and short screens: map and list side by side, so neither overflows.
          // Portrait: the map takes a share of the available height, never a fixed 260dp.
          return LayoutBuilder(
            builder: (context, c) {
              if (c.maxWidth > c.maxHeight) {
                return Column(
                  children: [
                    filters,
                    Expanded(
                      child: Row(
                        children: [
                          Expanded(child: _buildMap(points)),
                          Expanded(child: _buildList(shown)),
                        ],
                      ),
                    ),
                  ],
                );
              }
              final mapHeight = (c.maxHeight * 0.4).clamp(180.0, 320.0);
              return Column(
                children: [
                  filters,
                  SizedBox(height: mapHeight, child: _buildMap(points)),
                  Expanded(child: _buildList(shown)),
                ],
              );
            },
          );
        },
      ),
    );
  }

  Widget _buildMap(List<_Pin> points) {
    final center = points.isEmpty
        ? _defaultCenter
        : LatLng(points.first.point.lat, points.first.point.lng);
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: FlutterMap(
        options: MapOptions(initialCenter: center, initialZoom: 12),
        children: [
          if (widget.showTiles)
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'disaster_rescue',
            ),
          MarkerLayer(
            markers: [
              for (final p in points)
                Marker(
                  point: LatLng(p.point.lat, p.point.lng),
                  width: 110,
                  height: 60,
                  child: _MapMarker(report: p.report),
                ),
            ],
          ),
          RichAttributionWidget(
            attributions: const [
              TextSourceAttribution('OpenStreetMap contributors'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildList(List<AssignedReport> shown) {
    if (shown.isEmpty) {
      return const SingleChildScrollView(
        child: ProductEmpty(
          icon: Icons.map_outlined,
          title: 'No incidents match this filter.',
          description: 'Choose another type or check back for new assignments.',
        ),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: shown.length,
      separatorBuilder: (context, index) => const SizedBox(height: 12),
      itemBuilder: (context, i) => _IncidentRow(report: shown[i]),
    );
  }
}

class _Pin {
  const _Pin(this.report, this.point);
  final AssignedReport report;
  final MapPoint point;
}

class _FilterBar extends StatelessWidget {
  const _FilterBar({required this.selected, required this.onSelected});
  final String? selected;
  final ValueChanged<String?> onSelected;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          FilterChip(
            label: const Text('All'),
            selected: selected == null,
            onSelected: (_) => onSelected(null),
          ),
          for (final e in reportTypeInfo.entries)
            FilterChip(
              label: Text(e.value.label),
              selected: selected == e.key,
              onSelected: (_) => onSelected(e.key),
            ),
        ],
      ),
    );
  }
}

class _MapMarker extends StatelessWidget {
  const _MapMarker({required this.report});
  final AssignedReport report;

  @override
  Widget build(BuildContext context) {
    final m = priorityMarker(report.priority);
    return Semantics(
      label:
          '${m.label} priority, ${reportTypeInfo[report.type]?.label ?? report.type}',
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          MarkerGlyph(marker: m),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: Text(
              m.label,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.text,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _IncidentRow extends StatelessWidget {
  const _IncidentRow({required this.report});
  final AssignedReport report;

  @override
  Widget build(BuildContext context) {
    final m = priorityMarker(report.priority);
    final typeLabel = reportTypeInfo[report.type]?.label ?? report.type;
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => IncidentDetailPage(report: report)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              MarkerGlyph(marker: m, size: 24),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${report.reference ?? report.id} · $typeLabel',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      report.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${m.label} priority · ${report.status}',
                      style: const TextStyle(
                        color: AppColors.muted,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
