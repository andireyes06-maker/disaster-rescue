import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../data/services.dart';
import '../../theme/app_theme.dart';
import '../../theme/product_widgets.dart';
import '../auth/auth_widgets.dart';

String locationProblemMessage(LocationStatus s) {
  switch (s) {
    case LocationStatus.denied:
      return 'Location permission is off for this app. You can allow it, or pick the place on the map instead.';
    case LocationStatus.deniedForever:
      return 'Location permission is blocked. Turn it on in your phone settings, or pick the place on the map instead.';
    case LocationStatus.serviceOff:
      return 'Location is turned off on this phone. Turn it on, or pick the place on the map instead.';
    case LocationStatus.error:
      return 'We could not find your location. Try again, or pick the place on the map instead.';
    case LocationStatus.ok:
      return '';
  }
}

/// Step 2: choose where help is needed, by GPS or by tapping a map.
class LocationStep extends StatefulWidget {
  const LocationStep({
    super.key,
    required this.service,
    required this.lat,
    required this.lng,
    required this.source,
    required this.addressController,
    required this.onPicked,
  });
  final LocationService service;
  final double? lat;
  final double? lng;
  final String? source;
  final TextEditingController addressController;
  final void Function(double lat, double lng, String source) onPicked;

  @override
  State<LocationStep> createState() => _LocationStepState();
}

class _LocationStepState extends State<LocationStep> {
  bool _busy = false;
  String? _problem;

  Future<void> _useGps() async {
    setState(() {
      _busy = true;
      _problem = null;
    });
    final r = await widget.service.current();
    if (!mounted) return;
    setState(() => _busy = false);
    if (r.status == LocationStatus.ok && r.lat != null && r.lng != null) {
      widget.onPicked(r.lat!, r.lng!, 'gps');
    } else {
      setState(() => _problem = locationProblemMessage(r.status));
    }
  }

  Future<void> _pickOnMap() async {
    final start = (widget.lat != null && widget.lng != null)
        ? LatLng(widget.lat!, widget.lng!)
        : null;
    final picked = await Navigator.of(context).push<LatLng>(
      MaterialPageRoute(builder: (_) => MapPickerPage(initial: start)),
    );
    if (picked != null) {
      widget.onPicked(picked.latitude, picked.longitude, 'manual');
    }
  }

  @override
  Widget build(BuildContext context) {
    final has = widget.lat != null && widget.lng != null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        FilledButton.icon(
          onPressed: _busy ? null : _useGps,
          icon: _busy
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.my_location),
          label: const Text('Use my current location'),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: _busy ? null : _pickOnMap,
          icon: const Icon(Icons.map_outlined),
          label: const Text('Pick on a map'),
        ),
        if (_problem != null) ...[
          const SizedBox(height: 12),
          InlineError(_problem!),
        ],
        const SizedBox(height: 16),
        ProductSurface(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                has
                    ? Icons.check_circle_outline_rounded
                    : Icons.location_searching_rounded,
                color: AppColors.primary,
                size: 24,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      has ? 'Location selected' : 'Choose your location',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 5),
                    Text(
                      has
                          ? 'Location chosen: ${widget.lat!.toStringAsFixed(5)}, ${widget.lng!.toStringAsFixed(5)} (${widget.source == 'gps' ? 'from GPS' : 'picked on map'})'
                          : 'No location chosen yet. Choose one to continue.',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          key: const Key('addressText'),
          controller: widget.addressController,
          maxLength: 200,
          decoration: const InputDecoration(
            labelText: 'Address or landmark (optional)',
            hintText: 'For example: beside the community hall',
          ),
        ),
      ],
    );
  }
}

class MapPickerPage extends StatefulWidget {
  const MapPickerPage({super.key, this.initial});
  final LatLng? initial;

  @override
  State<MapPickerPage> createState() => _MapPickerPageState();
}

class _MapPickerPageState extends State<MapPickerPage> {
  static const _fallbackCenter = LatLng(14.5995, 120.9842);
  LatLng? _point;

  @override
  void initState() {
    super.initState();
    _point = widget.initial;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Tap the place on the map')),
      body: Column(
        children: [
          Expanded(
            child: FlutterMap(
              options: MapOptions(
                initialCenter: widget.initial ?? _fallbackCenter,
                initialZoom: widget.initial == null ? 12 : 16,
                onTap: (_, p) => setState(() => _point = p),
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: const String.fromEnvironment(
                    'RESCUE_APPLICATION_ID',
                    defaultValue: 'local.rescuereports.app',
                  ),
                ),
                if (_point != null)
                  MarkerLayer(
                    markers: [
                      Marker(
                        point: _point!,
                        width: 48,
                        height: 48,
                        child: const Icon(
                          Icons.location_on,
                          size: 44,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                const SimpleAttributionWidget(
                  source: Text('OpenStreetMap contributors'),
                ),
              ],
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: FilledButton(
                onPressed: _point == null
                    ? null
                    : () => Navigator.of(context).pop(_point),
                child: Text(
                  _point == null ? 'Tap the map to choose' : 'Use this place',
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
