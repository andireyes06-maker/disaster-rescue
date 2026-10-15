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
const historyStatuses = ['Resolved', 'Closed', 'Rejected', 'Duplicate', 'Cancelled'];

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
  const PickedPhoto({required this.name, required this.bytes, required this.mime});
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
  const ReportDraft({
    this.type,
    this.description = '',
    this.lat,
    this.lng,
    this.source,
    this.addressText = '',
    this.contactName = '',
    this.contactPhone = '',
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
      };

  factory ReportDraft.fromJson(Map<String, dynamic> j) => ReportDraft(
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
  final List<PickedPhoto> photos;
  const NewReport({
    required this.type,
    required this.description,
    required this.lat,
    required this.lng,
    required this.source,
    required this.addressText,
    required this.contactName,
    required this.contactPhone,
    this.photos = const [],
  });
}

class SubmitResult {
  final String id;
  final String status;
  final String reference;
  const SubmitResult({required this.id, required this.status, required this.reference});
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

final _phonePattern = RegExp(r'^[0-9+()\-\s]{7,20}$');

String? validatePhone(String? v) {
  final t = (v ?? '').trim();
  if (t.isEmpty) return 'Enter a phone number we can call.';
  if (!_phonePattern.hasMatch(t)) {
    return 'Use 7 to 20 digits. You may use + ( ) - and spaces.';
  }
  return null;
}

String? validateDescription(String? v) {
  final t = (v ?? '').trim();
  if (t.length < 3) return 'Describe what is happening (at least 3 characters).';
  if (t.length > 1000) return 'Please keep it under 1000 characters.';
  return null;
}

/// Checks size and file signature. Returns a plain-language reason, or null if fine.
String? validatePhoto(PickedPhoto p) {
  if (p.bytes.isEmpty) return '${p.name} is empty.';
  if (p.bytes.length > maxPhotoBytes) return '${p.name} is larger than 5 MB.';
  final b = p.bytes;
  final jpeg = b.length >= 3 && b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF;
  final png = b.length >= 8 &&
      b[0] == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47 &&
      b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A;
  final webp = b.length >= 12 &&
      b[0] == 0x52 && b[1] == 0x49 && b[2] == 0x46 && b[3] == 0x46 &&
      b[8] == 0x57 && b[9] == 0x45 && b[10] == 0x42 && b[11] == 0x50;
  if (!(jpeg || png || webp)) return '${p.name} is not a JPEG, PNG or WebP image.';
  return null;
}
