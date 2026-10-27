import 'dart:math' as math;

/// Responders may act on an incident only within this distance of it.
const double kMaxResponderDistanceMeters = 500;

/// Great-circle distance in meters between two WGS84 points (haversine).
double distanceMeters(double lat1, double lng1, double lat2, double lng2) {
  const earthRadius = 6371000.0;
  double rad(double deg) => deg * math.pi / 180;
  final dLat = rad(lat2 - lat1);
  final dLng = rad(lng2 - lng1);
  final a =
      math.pow(math.sin(dLat / 2), 2) +
      math.cos(rad(lat1)) *
          math.cos(rad(lat2)) *
          math.pow(math.sin(dLng / 2), 2);
  return 2 * earthRadius * math.asin(math.min(1, math.sqrt(a)));
}

/// Whole meters, for display.
String formatMeters(double meters) => '${meters.round()} m';

/// Approximate Philippine area, the same rule as the API (api/src/domain/serviceArea.js). Pins outside it are refused.
/// Keep the two in step: a pin the phone accepts must also pass the server.
bool inPhilippines(double lat, double lng) {
  if (lat.isNaN || lng.isNaN) return false;
  if (lat < 4.5 || lat > 21.3 || lng < 116.8 || lng > 127.0) return false;
  if (lat < 7.5 && lng < 119.3) return false;
  return true;
}

/// Shown when a pin would be outside the Philippines.
const outsidePhilippinesMessage = 'Pins must be inside the Philippines. Pick a place in the Philippines.';
