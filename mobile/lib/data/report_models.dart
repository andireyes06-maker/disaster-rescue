import 'dart:typed_data';

const reportTypes = ['flood', 'fire', 'earthquake', 'landslide', 'other'];

const workflowStatuses = [
  'Submitted',
  'Under Verification',
  'Verified',
  'Awaiting Assignment',
  'Team Assigned',
  'Rescue in Progress',
  'Resolved',
  'Closed',
];

const terminalSideStatuses = ['Rejected', 'Duplicate', 'Cancelled'];

/// Statuses shown under the History tab. Everything else is Active.
const historyStatuses = [
  'Resolved',
  'Closed',
  'Rejected',
  'Duplicate',
  'Cancelled',
];

bool isHistoryStatus(String status) => historyStatuses.contains(status);

const maxPhotos = 5;
const maxPhotoBytes = 5 * 1024 * 1024;

class Hotline {
  final String label;
  final String number;
  const Hotline(this.label, this.number);
}

class PickedPhoto {
  final String name;
  final Uint8List bytes;
  final String mime;
  const PickedPhoto({
    required this.name,
    required this.bytes,
    required this.mime,
  });
}

class Profile {
  final String? name;
  final String? phone;
  const Profile({this.name, this.phone});
}

class ReportDraft {
  final String? type;
  final String description;
  final double? lat;
  final double? lng;
  final String? source;
  final String addressText;
  final String contactName;
  final String contactPhone;
  final String? area;
  final String? placeName;
  final String? severity;
  const ReportDraft({
    this.severity,
    this.type,
    this.description = '',
    this.lat,
    this.lng,
    this.source,
    this.addressText = '',
    this.contactName = '',
    this.contactPhone = '',
    this.area,
    this.placeName,
  });

  Map<String, dynamic> toJson() => {
    'type': type,
    'description': description,
    'lat': lat,
    'lng': lng,
    'source': source,
    'addressText': addressText,
    'contactName': contactName,
    'contactPhone': contactPhone,
    'area': area,
    'placeName': placeName,
    'severity': severity,
  };

  factory ReportDraft.fromJson(Map<String, dynamic> j) => ReportDraft(
    area: j['area'] as String?,
    placeName: j['placeName'] as String?,
    severity: j['severity'] as String?,
    type: j['type'] as String?,
    description: (j['description'] as String?) ?? '',
    lat: (j['lat'] as num?)?.toDouble(),
    lng: (j['lng'] as num?)?.toDouble(),
    source: j['source'] as String?,
    addressText: (j['addressText'] as String?) ?? '',
    contactName: (j['contactName'] as String?) ?? '',
    contactPhone: (j['contactPhone'] as String?) ?? '',
  );
}

class NewReport {
  final String type;
  final String description;
  final double lat;
  final double lng;
  final String source;
  final String addressText;
  final String contactName;
  final String contactPhone;

  /// The province or Metro Manila city the report is filed under. Chosen from kAreas.
  final String area;

  /// Approximate place name shown to responders next to the exact pin. Optional.
  final String? placeName;
  final List<PickedPhoto> photos;

  /// How far the danger reaches from the point, in meters. Responders may act within this distance.
  final int affectedRadiusM;

  /// Same key for every retry of one submission; the server returns the first result instead of duplicating.
  final String? idempotencyKey;
  const NewReport({
    required this.type,
    required this.description,
    required this.lat,
    required this.lng,
    required this.source,
    required this.addressText,
    required this.contactName,
    required this.contactPhone,
    required this.area,
    this.placeName,
    this.photos = const [],
    this.affectedRadiusM = 500,
    this.severity = 'medium',
    this.idempotencyKey,
  });

  /// How severe the resident says the situation is: low, medium, high or critical.
  final String severity;
}

class SubmitResult {
  final String id;
  final String status;
  final String reference;
  const SubmitResult({
    required this.id,
    required this.status,
    required this.reference,
  });
}

class ReportSummary {
  final String id;
  final String type;
  final String description;
  final String status;
  final String? priority;
  final DateTime? createdAt;
  final String? reference;
  const ReportSummary({
    required this.id,
    required this.type,
    required this.description,
    required this.status,
    this.priority,
    this.createdAt,
    this.reference,
  });
}

/// Newest first. Reports without a time go last.
List<ReportSummary> sortNewestFirst(Iterable<ReportSummary> items) {
  final list = items.toList();
  list.sort((a, b) {
    final x = a.createdAt, y = b.createdAt;
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    return y.compareTo(x);
  });
  return list;
}

final _phonePattern = RegExp(r'^(?=(?:\D*\d){7,15}\D*$)[0-9+()\-\s]{7,25}$');

String? validatePhone(String? v) {
  final t = (v ?? '').trim();
  if (t.isEmpty) return 'Enter a phone number we can call.';
  if (!_phonePattern.hasMatch(t)) {
    return 'Use 7 to 15 digits. You may use + ( ) - and spaces.';
  }
  return null;
}

String? validateDescription(String? v) {
  final t = (v ?? '').trim();
  if (t.length < 3) {
    return 'Describe what is happening (at least 3 characters).';
  }
  if (t.length > 1000) return 'Please keep it under 1000 characters.';
  return null;
}

/// Checks size and file signature. Returns a plain-language reason, or null if fine.
String? validatePhoto(PickedPhoto p) {
  if (p.bytes.isEmpty) return '${p.name} is empty.';
  if (p.bytes.length > maxPhotoBytes) return '${p.name} is larger than 5 MB.';
  final b = p.bytes;
  final jpeg = b.length >= 3 && b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF;
  final png =
      b.length >= 8 &&
      b[0] == 0x89 &&
      b[1] == 0x50 &&
      b[2] == 0x4E &&
      b[3] == 0x47 &&
      b[4] == 0x0D &&
      b[5] == 0x0A &&
      b[6] == 0x1A &&
      b[7] == 0x0A;
  final webp =
      b.length >= 12 &&
      b[0] == 0x52 &&
      b[1] == 0x49 &&
      b[2] == 0x46 &&
      b[3] == 0x46 &&
      b[8] == 0x57 &&
      b[9] == 0x45 &&
      b[10] == 0x42 &&
      b[11] == 0x50;
  if (!(jpeg || png || webp)) {
    return ' is not a JPEG, PNG or WebP image.';
  }
  return null;
}

// ---------- Responder ----------

class MapPoint {
  final double lat;
  final double lng;
  const MapPoint(this.lat, this.lng);

  @override
  bool operator ==(Object other) =>
      other is MapPoint && other.lat == lat && other.lng == lng;

  @override
  int get hashCode => Object.hash(lat, lng);

  @override
  String toString() => 'MapPoint($lat, $lng)';
}

class AssignedReport {
  final String id;
  final String type;
  final String description;
  final String status;
  final String? reference;
  final String? addressText;

  /// Approximate place name for the pin. Null for older reports.
  final String? placeName;
  final double? lat;
  final double? lng;
  final DateTime? createdAt;
  final String? priority;
  final String? reporterId;
  final String? assignedTeamId;
  final MapPoint? coarseLocation;

  /// Reported reach of the danger in meters. Null for older reports; the app then uses 500 m.
  final int? affectedRadiusM;
  const AssignedReport({
    required this.id,
    required this.type,
    required this.description,
    required this.status,
    this.reference,
    this.addressText,
    this.placeName,
    this.lat,
    this.lng,
    this.createdAt,
    this.priority,
    this.reporterId,
    this.assignedTeamId,
    this.affectedRadiusM,
    this.coarseLocation,
  });
}

class OperationUpdate {
  final String status;
  final int peopleRescued;
  final String note;
  const OperationUpdate({
    required this.status,
    required this.peopleRescued,
    required this.note,
  });
}

const peopleRescuedError = 'Enter a whole number from 0 to 10000.';

/// Client-side convenience only. The API checks the same rule and stays the authority.
String? validatePeopleRescued(String? v) {
  final t = (v ?? '').trim();
  if (!RegExp(r'^\d+$').hasMatch(t)) return peopleRescuedError;
  final n = int.parse(t);
  if (n > 10000) return peopleRescuedError;
  return null;
}

// ---------- Notifications ----------

class AppNotification {
  final String id;
  final String title;
  final String body;
  final String? reportId;
  final bool read;
  final DateTime? createdAt;
  const AppNotification({
    required this.id,
    required this.title,
    required this.body,
    this.reportId,
    required this.read,
    this.createdAt,
  });
}
