import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../data/geo.dart';
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
    this.radiusM = 500,
    required this.addressController,
    required this.onPicked,
  });
  final LocationService service;
  final double? lat;
  final double? lng;
  final String? source;

  /// Reach the danger covers, in meters. Shown as a circle around the marked point.
  final int radiusM;
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
    setState(() {
      _busy = true;
      _problem = null;
    });
    final fix = await widget.service.current();
    if (!mounted) return;
    setState(() => _busy = false);
    if (fix.status != LocationStatus.ok || fix.lat == null || fix.lng == null) {
      setState(() => _problem = locationProblemMessage(fix.status));
      return;
    }
    final picked = await Navigator.of(context).push<LatLng>(
      MaterialPageRoute(
        builder: (_) => MapPickerPage(
          anchor: LatLng(fix.lat!, fix.lng!),
          radiusM: widget.radiusM,
        ),
      ),
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
        const SizedBox(height: 16),
        Text(
          'Place of the emergency',
          style: Theme.of(context).textTheme.titleSmall,
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _busy ? null : _pickOnMap,
                icon: const Icon(Icons.map_outlined),
                label: const Text('Pick on a map'),
              ),
            ),
          ],
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
                      has ? 'Location selected' : 'No location selected yet',
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
  const MapPickerPage({super.key, required this.anchor, this.radiusM = 500});

  /// The reporter's current position. The reach circle is drawn around it.
  final LatLng anchor;
  final int radiusM;

  @override
  State<MapPickerPage> createState() => _MapPickerPageState();
}

class _MapPickerPageState extends State<MapPickerPage> {
  LatLng? _point;
  late LatLng _anchor = widget.anchor;
  final _map = MapController();
  bool _locating = false;
  String? _problem;

  bool _within(LatLng p) =>
      distanceMeters(
        _anchor.latitude,
        _anchor.longitude,
        p.latitude,
        p.longitude,
      ) <=
      widget.radiusM;

  // A tap is accepted only inside the reach around the reporter.
  void _onTap(LatLng p) {
    if (!_within(p)) {
      final d = distanceMeters(
        _anchor.latitude,
        _anchor.longitude,
        p.latitude,
        p.longitude,
      );
      setState(() {
        _point = null;
        _problem =
            'That place is ${formatMeters(d)} from you. Pick a place within ${formatMeters(widget.radiusM.toDouble())} of your location.';
      });
      return;
    }
    setState(() {
      _point = p;
      _problem = null;
    });
  }

  @override
  void initState() {
    super.initState();
    // The map is always based on the live current location: refresh it as soon as the picker opens.
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => _useCurrent(choosePoint: false),
    );
  }

  // The device's current position becomes the centre of the reach. Optionally it also becomes the chosen place.
  Future<void> _useCurrent({bool choosePoint = true}) async {
    setState(() {
      _locating = true;
      _problem = null;
    });
    final r = await context.read<LocationService>().current();
    if (!mounted) return;
    setState(() => _locating = false);
    if (r.status == LocationStatus.ok && r.lat != null && r.lng != null) {
      final p = LatLng(r.lat!, r.lng!);
      setState(() {
        _anchor = p;
        if (choosePoint) _point = p;
      });
      _map.move(p, 16);
    } else {
      setState(() => _problem = locationProblemMessage(r.status));
    }
  }

  @override
  Widget build(BuildContext context) {
    final errorColor = Theme.of(context).colorScheme.error;
    return Scaffold(
      appBar: AppBar(title: const Text('Tap the place on the map')),
      body: Column(
        children: [
          Expanded(
            child: FlutterMap(
              mapController: _map,
              options: MapOptions(
                initialCenter: _anchor,
                initialZoom: 15,
                onTap: (_, p) => _onTap(p),
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: const String.fromEnvironment(
                    'RESCUE_APPLICATION_ID',
                    defaultValue: 'local.rescuereports.app',
                  ),
                ),
                CircleLayer(
                  circles: [
                    CircleMarker(
                      point: _anchor,
                      radius: widget.radiusM.toDouble(),
                      useRadiusInMeter: true,
                      color: AppColors.primary.withValues(alpha: 0.15),
                      borderColor: AppColors.primary,
                      borderStrokeWidth: 2,
                    ),
                  ],
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
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Pick a place inside the circle, ${formatMeters(widget.radiusM.toDouble())} around you.',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: _locating ? null : _useCurrent,
                    icon: const Icon(Icons.my_location),
                    label: Text(
                      _locating ? 'Finding you…' : 'Use my current location',
                    ),
                  ),
                  if (_problem != null) ...[
                    const SizedBox(height: 8),
                    Text(_problem!, style: TextStyle(color: errorColor)),
                  ],
                  const SizedBox(height: 8),
                  FilledButton(
                    onPressed: _point == null
                        ? null
                        : () => Navigator.of(context).pop(_point),
                    child: Text(
                      _point == null
                          ? 'Tap the map inside the circle'
                          : 'Use this place',
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
