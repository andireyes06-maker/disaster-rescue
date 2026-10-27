import 'dart:convert';

import 'package:http/http.dart' as http;

/// Turns a picked point into a short, approximate place name, the way map apps do
/// ("Near Commonwealth Ave, Quezon City"). Returns null when no name can be found.
typedef PlaceNamer = Future<String?> Function(double lat, double lng);

const _appId = String.fromEnvironment(
  'RESCUE_APPLICATION_ID',
  defaultValue: 'local.rescuereports.app',
);

/// Builds "Near local, city" from an OpenStreetMap reverse-lookup reply.
/// The neighbourhood or road is the local part; the city, town or province is the wider part.
String? placeNameFrom(Object? reply) {
  if (reply is! Map) return null;
  final address = reply['address'];
  if (address is! Map) return null;

  String? pick(List<String> keys) {
    for (final key in keys) {
      final value = address[key];
      if (value is String && value.trim().isNotEmpty) return value.trim();
    }
    return null;
  }

  final local = pick(['neighbourhood', 'suburb', 'village', 'hamlet', 'road']);
  final city = pick(['city', 'town', 'municipality', 'county', 'state']);
  if (local == null) return city;
  if (city == null || city == local) return 'Near $local';
  return 'Near $local, $city';
}

/// Looks up an approximate place name. The point is rounded to about 110 m before it is sent,
/// because a neighbourhood name does not need the exact pin. Any failure returns null.
Future<String?> approximatePlaceName(
  double lat,
  double lng, {
  http.Client? client,
}) async {
  final httpClient = client ?? http.Client();
  try {
    final uri = Uri.https('nominatim.openstreetmap.org', '/reverse', {
      'format': 'jsonv2',
      'lat': lat.toStringAsFixed(3),
      'lon': lng.toStringAsFixed(3),
      'zoom': '17',
      'addressdetails': '1',
      'accept-language': 'en',
    });
    final res = await httpClient
        .get(uri, headers: {'User-Agent': _appId})
        .timeout(const Duration(seconds: 6));
    if (res.statusCode != 200) return null;
    return placeNameFrom(jsonDecode(res.body));
  } catch (_) {
    return null;
  } finally {
    if (client == null) httpClient.close();
  }
}
