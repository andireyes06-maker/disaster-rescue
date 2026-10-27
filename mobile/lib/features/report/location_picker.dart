import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../data/geo.dart';
import '../../data/place_name.dart';
import '../../data/services.dart';
import '../../theme/app_theme.dart';
import '../../theme/product_widgets.dart';
import '../auth/auth_widgets.dart';

/// What the reporter sees for a chosen point: a place name, never raw coordinates.
String placeLineFor(String? placeName, String? source) {
  if (placeName != null && placeName.trim().isNotEmpty) return placeName;
  return source == 'gps' ? 'Pinned at your current location' : 'Pinned on the map';
}

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
    this.placeName,
    this.placeNamer = approximatePlaceName,
    this.radiusM = 500,
    required this.addressController,
    required this.onPicked,
  });
  final LocationService service;
  final double? lat;
  final double? lng;
  final String? source;

  /// Approximate place name for the chosen point, such as "Near Commonwealth Ave, Quezon City".
  final String? placeName;

  /// Looks up [placeName] for a new point. Injected so tests never reach the network.
  final PlaceNamer placeNamer;

  /// Reach the danger covers, in meters. Shown as a circle around the marked point.
  final int radiusM;
  final TextEditingController addressController;
  final void Function(double lat, double lng, String source, PlaceInfo? place) onPicked;


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
    if (r.status == LocationStatus.ok && r.lat != null && r.lng != null && !inPhilippines(r.lat!, r.lng!)) {
      setState(() {
        _busy = false;
        _problem = outsidePhilippinesMessage;
      });
    } else if (r.status == LocationStatus.ok && r.lat != null && r.lng != null) {
      await _choose(r.lat!, r.lng!, 'gps');
    } else {
      setState(() {
        _busy = false;
        _problem = locationProblemMessage(r.status);
      });
    }
  }

  // The pin is chosen at once. The place name follows when it arrives, and only if the pin has not moved since.
  // A failed lookup leaves the pin usable with no name.
  Future<void> _choose(double lat, double lng, String source) async {
    setState(() => _busy = false);
    widget.onPicked(lat, lng, source, null);
    final place = await widget.placeNamer(lat, lng);
    if (!mounted || place == null) return;
    if (widget.lat != lat || widget.lng != lng) return;
    widget.onPicked(lat, lng, source, place);
  }

  Future<void> _pickOnMap() async {
    setState(() {
      _busy = true;
      _problem = null;
    });
    final fix = await widget.service.current();
    if (!mounted) return;
    setState(() => _busy = false);
    // Without a location fix the picker still opens. The resident pins the place by hand, and the reach
    // limit cannot be checked, so the picker says so.
    // A fix outside the Philippines is not a usable reference, so the picker opens without one.
    final ok = fix.status == LocationStatus.ok && fix.lat != null && fix.lng != null && inPhilippines(fix.lat!, fix.lng!);
    final picked = await Navigator.of(context).push<LatLng>(
      MaterialPageRoute(
        builder: (_) => MapPickerPage(
          anchor: ok ? LatLng(fix.lat!, fix.lng!) : null,
          radiusM: widget.radiusM,
        ),
      ),
    );
    if (picked != null) {
      setState(() => _busy = true);
      await _choose(picked.latitude, picked.longitude, 'manual');
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
                          ? placeLineFor(widget.placeName, widget.source)
                          : 'No location chosen yet. Choose one to continue.',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    if (has) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Responders see the exact pin.',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
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

/// Whether [p] is inside the reach around [anchor]. With no location fix there is no reference point,
/// so the reach cannot be checked and every point is accepted.
bool withinReach(LatLng? anchor, LatLng p, int radiusM) {
  if (anchor == null) return true;
  return distanceMeters(anchor.latitude, anchor.longitude, p.latitude, p.longitude) <= radiusM;
}

/// Metro Manila, the centre of the area the app serves. Used when the phone has no location fix.
const _fallbackCenter = LatLng(14.5995, 120.9842);

class MapPickerPage extends StatefulWidget {
  const MapPickerPage({super.key, this.anchor, this.radiusM = 500});

  /// The reporter's current position. The reach circle is drawn around it. Null when location is off:
  /// then there is no reference point, the reach is not checked, and the map opens on the service area.
  final LatLng? anchor;
  final int radiusM;

  @override
  State<MapPickerPage> createState() => _MapPickerPageState();
}

class _MapPickerPageState extends State<MapPickerPage> {
  LatLng? _point;
  late LatLng? _anchor = widget.anchor;
  final _map = MapController();
  bool _locating = false;
  String? _problem;

  bool _within(LatLng p) => withinReach(_anchor, p, widget.radiusM);

  // A tap is accepted only inside the reach around the reporter, when the reporter's location is known.
  void _onTap(LatLng p) {
    if (!inPhilippines(p.latitude, p.longitude)) {
      setState(() {
        _point = null;
        _problem = outsidePhilippinesMessage;
      });
      return;
    }
    final a = _anchor;
    if (a != null && !_within(p)) {
      final d = distanceMeters(a.latitude, a.longitude, p.latitude, p.longitude);
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
    if (r.status == LocationStatus.ok && r.lat != null && r.lng != null && !inPhilippines(r.lat!, r.lng!)) {
      setState(() => _problem = outsidePhilippinesMessage);
    } else if (r.status == LocationStatus.ok && r.lat != null && r.lng != null) {
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
                initialCenter: _anchor ?? _fallbackCenter,
                initialZoom: _anchor == null ? 12 : 15,
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
                    if (_anchor != null)
                      CircleMarker(
                        point: _anchor!,
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
                    _anchor == null
                        ? 'Location is off, so the reach limit cannot be checked. Pick the place where help is needed.'
                        : 'Pick a place inside the circle, ${formatMeters(widget.radiusM.toDouble())} around you.',
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
                          ? (_anchor == null ? 'Tap the map where help is needed' : 'Tap the map inside the circle')
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
