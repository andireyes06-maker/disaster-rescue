import 'dart:async';
import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart' show TargetPlatform, defaultTargetPlatform;
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

import 'api_client.dart';
import 'report_models.dart';

// ---------- Reports ----------

abstract class ReportsRepository {
  Future<SubmitResult> create(NewReport report);

  /// Live list of the signed-in resident's own reports. The query always
  /// filters on reporterId, which the Firestore rules require.
  Stream<List<ReportSummary>> watchMyReports(String uid, {int windowSize = 50});
  Future<void> cancel(String id);
  Stream<ReportSummary?> watchReport(String id);
}

class ApiReportsRepository implements ReportsRepository {
  ApiReportsRepository(this._api, this._db);
  final ApiClient _api;
  final FirebaseFirestore _db;

  @override
  Future<SubmitResult> create(NewReport r) async {
    final res = await _api.sendMultipart(
      'POST',
      '/reports',
      headers: {
        if (r.idempotencyKey != null) 'Idempotency-Key': r.idempotencyKey!,
      },
      fields: {
        'type': r.type,
        if (r.typeDetail != null) 'typeDetail': r.typeDetail!,
        'description': r.description,
        'lat': r.lat.toString(),
        'lng': r.lng.toString(),
        'source': r.source,
        'addressText': r.addressText,
        if (r.placeName != null) 'placeName': r.placeName!,
        if (r.locality != null) 'locality': r.locality!,
        'affectedRadiusM': r.affectedRadiusM.toString(),
        'severity': r.severity,
        'contactName': r.contactName,
        'contactPhone': r.contactPhone,
      },
      files: [
        for (final p in r.photos)
          http.MultipartFile.fromBytes('photos', p.bytes, filename: p.name),
      ],
    );
    final id = res?['id'];
    if (id is! String) {
      throw const ApiException(
        0,
        'bad_response',
        'The server sent an unexpected reply.',
      );
    }
    return SubmitResult(
      id: id,
      status: (res?['status'] as String?) ?? 'Submitted',
      reference: (res?['reference'] as String?) ?? id,
    );
  }

  @override
  Stream<List<ReportSummary>> watchMyReports(
    String uid, {
    int windowSize = 50,
  }) {
    return _db
        .collection('reports')
        .where('reporterId', isEqualTo: uid)
        .orderBy('createdAt', descending: true)
        .limit(windowSize)
        .snapshots()
        .map(
          (snap) => sortNewestFirst(
            snap.docs.map((d) {
              final m = d.data();
              final created = m['createdAt'];
              return ReportSummary(
                id: d.id,
                type: (m['type'] as String?) ?? 'other',
                typeDetail: m['typeDetail'] as String?,
                description: (m['description'] as String?) ?? '',
                status: (m['status'] as String?) ?? 'Submitted',
                priority: m['priority'] as String?,
                createdAt: created is Timestamp ? created.toDate() : null,
                reference: m['reference'] as String?,
              );
            }),
          ),
        )
        .asBroadcastStream();
  }

  @override
  Stream<ReportSummary?> watchReport(String id) =>
      _db.collection('reports').doc(id).snapshots().map((doc) {
        final data = doc.data();
        if (data == null) return null;
        final at = data['createdAt'];
        return ReportSummary(
          id: doc.id,
          type: data['type'] as String? ?? 'other',
          typeDetail: data['typeDetail'] as String?,
          description: data['description'] as String? ?? '',
          status: data['status'] as String? ?? 'Submitted',
          priority: data['priority'] as String?,
          reference: data['reference'] as String?,
          createdAt: at is Timestamp ? at.toDate() : null,
        );
      });

  @override
  Future<void> cancel(String id) async {
    await _api.send('PATCH', '/reports/$id/cancel');
  }
}

// ---------- Location ----------

enum LocationStatus { ok, denied, deniedForever, serviceOff, error }

class LocationResult {
  final LocationStatus status;
  final double? lat;
  final double? lng;
  const LocationResult(this.status, {this.lat, this.lng});
}

abstract class LocationService {
  Future<LocationResult> current();
}

class GeolocatorLocationService implements LocationService {
  @override
  Future<LocationResult> current() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        return const LocationResult(LocationStatus.serviceOff);
      }
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied) {
        return const LocationResult(LocationStatus.denied);
      }
      if (perm == LocationPermission.deniedForever) {
        return const LocationResult(LocationStatus.deniedForever);
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 20),
        ),
      );
      return LocationResult(
        LocationStatus.ok,
        lat: pos.latitude,
        lng: pos.longitude,
      );
    } catch (_) {
      return const LocationResult(LocationStatus.error);
    }
  }
}

// ---------- Photos ----------

abstract class PhotoService {
  /// Lets the user choose up to [limit] images. Returns nothing if cancelled.
  Future<List<PickedPhoto>> pick(int limit);

  /// Takes one photo with the device camera. Cancellation returns an empty list.
  Future<List<PickedPhoto>> capture();

  /// Android can destroy the app while the camera or gallery is open. This returns the photo that was
  /// taken in that case, once, and an empty list when there is none or on other platforms.
  Future<List<PickedPhoto>> recoverLost();
}

class ImagePickerPhotoService implements PhotoService {
  ImagePickerPhotoService({ImagePicker? picker})
    : _picker = picker ?? ImagePicker();
  final ImagePicker _picker;

  @override
  Future<List<PickedPhoto>> capture() async {
    final file = await _picker.pickImage(
      source: ImageSource.camera,
      maxWidth: 2048,
      maxHeight: 2048,
      imageQuality: 85,
      requestFullMetadata: false,
    );
    if (file == null) return const [];
    return [
      PickedPhoto(
        name: file.name,
        bytes: await file.readAsBytes(),
        mime: _mimeFor(file.name, file.mimeType),
      ),
    ];
  }

  @override
  Future<List<PickedPhoto>> recoverLost() async {
    if (defaultTargetPlatform != TargetPlatform.android) return const [];
    final response = await _picker.retrieveLostData();
    if (response.isEmpty) return const [];
    final files = (response.files != null && response.files!.isNotEmpty)
        ? response.files!
        : [if (response.file != null) response.file!];
    return [
      for (final f in files)
        PickedPhoto(
          name: f.name,
          bytes: await f.readAsBytes(),
          mime: _mimeFor(f.name, f.mimeType),
        ),
    ];
  }

  static String _mimeFor(String name, String? reported) {
    if (reported != null && reported.startsWith('image/')) return reported;
    final n = name.toLowerCase();
    if (n.endsWith('.png')) return 'image/png';
    if (n.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }

  @override
  Future<List<PickedPhoto>> pick(int limit) async {
    if (limit <= 0) return const [];
    // Downscale when picking: a full-size phone photo can be well over the 5 MB upload limit.
    // 2048 px at 85% keeps a typical photo around 1 MB and still readable for responders.
    final files = await _picker.pickMultiImage(
      limit: limit < 2 ? null : limit,
      maxWidth: 2048,
      maxHeight: 2048,
      imageQuality: 85,
    );
    final out = <PickedPhoto>[];
    for (final f in files.take(limit)) {
      out.add(
        PickedPhoto(
          name: f.name,
          bytes: await f.readAsBytes(),
          mime: _mimeFor(f.name, f.mimeType),
        ),
      );
    }
    return out;
  }
}

// ---------- Phone ----------

abstract class PhoneDialer {
  Future<bool> dial(String number);
}

class UrlLauncherDialer implements PhoneDialer {
  @override
  Future<bool> dial(String number) async {
    try {
      return await launchUrl(
        Uri(scheme: 'tel', path: number.replaceAll(RegExp(r'\s'), '')),
      );
    } catch (_) {
      return false;
    }
  }
}

// ---------- Hotlines ----------

abstract class HotlineRepository {
  /// Reads the hotline list. When the network fails, returns the last copy
  /// saved on the phone, so the offline page still works. May return empty.
  Future<List<Hotline>> load();
}

class FirestoreHotlineRepository implements HotlineRepository {
  FirestoreHotlineRepository(this._db);
  final FirebaseFirestore _db;
  static const _cacheKey = 'hotlines_cache_v1';

  @override
  Future<List<Hotline>> load() async {
    try {
      final snap = await _db
          .doc('config/hotlines')
          .get()
          .timeout(const Duration(seconds: 6));
      final list = _parse(snap.data()?['numbers']);
      if (list.isNotEmpty) {
        await _save(list);
        return list;
      }
    } catch (_) {}
    return _cached();
  }

  static List<Hotline> _parse(Object? raw) {
    if (raw is! List) return const [];
    final out = <Hotline>[];
    for (final e in raw) {
      if (e is Map &&
          e['number'] is String &&
          (e['number'] as String).trim().isNotEmpty) {
        out.add(
          Hotline(
            (e['label'] as String?) ?? (e['number'] as String),
            (e['number'] as String).trim(),
          ),
        );
      }
    }
    return out;
  }

  Future<void> _save(List<Hotline> list) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _cacheKey,
        jsonEncode([
          for (final h in list) {'label': h.label, 'number': h.number},
        ]),
      );
    } catch (_) {}
  }

  Future<List<Hotline>> _cached() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final s = prefs.getString(_cacheKey);
      if (s == null) return const [];
      return _parse(jsonDecode(s));
    } catch (_) {
      return const [];
    }
  }
}

// ---------- Responder ----------

/// Counts for the signed-in responder's own team only. No names or contact details.
class TeamSummary {
  const TeamSummary({
    required this.total,
    required this.open,
    required this.resolved,
    required this.peopleRescued,
  });
  final int total;
  final int open;
  final int resolved;
  final int peopleRescued;

  factory TeamSummary.fromJson(Map<String, dynamic> json) => TeamSummary(
    total: (json['total'] as num?)?.toInt() ?? 0,
    open: (json['open'] as num?)?.toInt() ?? 0,
    resolved: (json['resolved'] as num?)?.toInt() ?? 0,
    peopleRescued: (json['peopleRescued'] as num?)?.toInt() ?? 0,
  );
}

/// Joins two live lists of one team's reports: reports naming the team in its single-team field, and reports
/// listing it among several teams. A report in both is shown once. Keeps the first [limit] rows in the given order.
///
/// Broadcast, because the tab view can listen again after a tab is disposed and shown again. Each new listen
/// opens fresh source streams and waits for their first values, so an old value is never shown.
Stream<List<AssignedReport>> joinTeamStreams(
  Stream<List<AssignedReport>> Function() single,
  Stream<List<AssignedReport>> Function() many, {
  required int limit,
  required bool newestFirst,
}) {
  late StreamController<List<AssignedReport>> out;
  List<AssignedReport>? latestSingle;
  List<AssignedReport>? latestMany;
  StreamSubscription<List<AssignedReport>>? subSingle;
  StreamSubscription<List<AssignedReport>>? subMany;

  void emit() {
    if (latestSingle == null || latestMany == null) return;
    final byId = <String, AssignedReport>{};
    for (final r in [...latestSingle!, ...latestMany!]) {
      byId[r.id] = r;
    }
    final rows = byId.values.toList()
      ..sort((a, b) {
        final ta = a.createdAt, tb = b.createdAt;
        if (ta == null || tb == null) return ta == null ? (tb == null ? 0 : 1) : -1;
        return newestFirst ? tb.compareTo(ta) : ta.compareTo(tb);
      });
    out.add(rows.take(limit).toList());
  }

  out = StreamController<List<AssignedReport>>.broadcast(
    onListen: () {
      // Fresh Firestore streams on every listen: a snapshot stream can only be listened to once.
      latestSingle = null;
      latestMany = null;
      subSingle = single().listen((v) { latestSingle = v; emit(); }, onError: out.addError);
      // The several-teams query can fail before its index is deployed. That must not hide the reports already listed.
      subMany = many().listen((v) { latestMany = v; emit(); }, onError: (_) { latestMany = const []; emit(); });
    },
    onCancel: () async {
      await subSingle?.cancel();
      await subMany?.cancel();
    },
  );
  return out.stream;
}

abstract class ResponderRepository {
  /// Team totals from the API (GET /stats/team). Errors when the request fails.
  Future<TeamSummary> teamSummary();

  /// Live list of reports assigned to [teamId]. The query has one equality
  /// filter; anything else is filtered in memory by the caller.
  Stream<List<AssignedReport>> watchAssigned(
    String teamId, {
    int windowSize = 50,
  });
  Stream<List<AssignedReport>> watchRecentlyClosed(String teamId);

  /// Live state of one report. Emits null when the record no longer exists, and errors when access is refused.
  Stream<AssignedReport?> watchReport(String id);

  /// Newest progress entries first, at most [limit]. Acknowledgements are not included. Errors when access is refused.
  Stream<List<ProgressEntry>> watchUpdates(String id, {int limit = 20});

  /// [lat] and [lng] are the responder's current position. The server refuses the action when it is beyond the report's reach.
  Future<void> acknowledge(String id, {double? lat, double? lng});

  /// [idempotencyKey] makes a retried update replay the first result instead of recording it again.
  Future<void> postUpdate(
    String id,
    OperationUpdate update, {
    String? idempotencyKey,
    double? lat,
    double? lng,
  });
}

class ApiResponderRepository implements ResponderRepository {
  ApiResponderRepository(this._api, this._db);
  final ApiClient _api;
  final FirebaseFirestore _db;

  @override
  Future<TeamSummary> teamSummary() async {
    final body = await _api.send('GET', '/stats/team');
    return TeamSummary.fromJson(body ?? const <String, dynamic>{});
  }

  @override
  Stream<List<AssignedReport>> watchAssigned(
    String teamId, {
    int windowSize = 50,
  }) {
    // Oldest first, from the database, so the window holds the oldest open assignments (2026-10-23).
    const open = ['Team Assigned', 'Rescue in Progress'];
    Stream<List<AssignedReport>> single() => _db
        .collection('reports')
        .where('assignedTeamId', isEqualTo: teamId)
        .where('status', whereIn: open)
        .orderBy('createdAt', descending: false)
        .limit(windowSize)
        .snapshots()
        .map((snap) => snap.docs.map((d) => _assignedFrom(d.id, d.data())).toList());
    // Reports assigned to several teams: filtered by status here, since the team list is one array filter.
    Stream<List<AssignedReport>> many() => _db
        .collection('reports')
        .where('assignedTeamIds', arrayContains: teamId)
        .orderBy('createdAt', descending: false)
        .limit(windowSize * 2)
        .snapshots()
        .map((snap) => snap.docs
            .map((d) => _assignedFrom(d.id, d.data()))
            .where((r) => open.contains(r.status))
            .toList());
    return joinTeamStreams(single, many, limit: windowSize, newestFirst: false);
  }

  @override
  Stream<List<AssignedReport>> watchRecentlyClosed(String teamId) {
    Stream<List<AssignedReport>> single() => _db
        .collection('reports')
        .where('assignedTeamId', isEqualTo: teamId)
        .where('status', whereIn: historyStatuses)
        .orderBy('updatedAt', descending: true)
        .limit(10)
        .snapshots()
        .map((snap) => snap.docs.map((d) => _assignedFrom(d.id, d.data())).toList());
    Stream<List<AssignedReport>> many() => _db
        .collection('reports')
        .where('assignedTeamIds', arrayContains: teamId)
        .orderBy('updatedAt', descending: true)
        .limit(20)
        .snapshots()
        .map((snap) => snap.docs
            .map((d) => _assignedFrom(d.id, d.data()))
            .where((r) => historyStatuses.contains(r.status))
            .toList());
    return joinTeamStreams(single, many, limit: 10, newestFirst: true);
  }

  @override
  Stream<AssignedReport?> watchReport(String id) {
    return _db.collection('reports').doc(id).snapshots().map((snap) {
      final m = snap.data();
      return m == null ? null : _assignedFrom(snap.id, m);
    });
  }

  @override
  Stream<List<ProgressEntry>> watchUpdates(String id, {int limit = 20}) {
    return _db
        .collection('reports')
        .doc(id)
        .collection('updates')
        .orderBy('at', descending: true)
        .limit(limit)
        .snapshots()
        // Acknowledgements share this subcollection but carry no status. They are not progress entries.
        .map(
          (snap) => snap.docs
              .map((d) => ProgressEntry.fromMap(d.id, d.data()))
              .whereType<ProgressEntry>()
              .toList(),
        );
  }

  @override
  Future<void> acknowledge(String id, {double? lat, double? lng}) async {
    await _api.send(
      'POST',
      '/reports/$id/acknowledge',
      body: {
        if (lat != null && lng != null) 'position': {'lat': lat, 'lng': lng},
      },
    );
  }

  @override
  Future<void> postUpdate(
    String id,
    OperationUpdate update, {
    String? idempotencyKey,
    double? lat,
    double? lng,
  }) async {
    await _api.send(
      'POST',
      '/reports/$id/updates',
      headers: {'Idempotency-Key': ?idempotencyKey},
      body: {
        'status': update.status,
        'peopleRescued': update.peopleRescued,
        'note': update.note,
        if (lat != null && lng != null) 'position': {'lat': lat, 'lng': lng},
      },
    );
  }
}

/// One progress entry on a report, as the responder history shows it.
class ProgressEntry {
  const ProgressEntry({
    required this.id,
    required this.status,
    required this.peopleRescued,
    this.note = '',
    this.at,
  });

  final String id;
  final String status;
  final int peopleRescued;
  final String note;
  final DateTime? at;

  /// Null for records without a status (acknowledgements), so they are left out of the history.
  static ProgressEntry? fromMap(String id, Map<String, dynamic> data) {
    final status = data['status'];
    if (status is! String || status.isEmpty) return null;
    final rescued = data['peopleRescued'];
    final at = data['at'];
    return ProgressEntry(
      id: id,
      status: status,
      peopleRescued: rescued is int ? rescued : 0,
      note: data['note'] is String ? data['note'] as String : '',
      at: at is Timestamp ? at.toDate() : null,
    );
  }
}

// ---------- Notifications ----------

abstract class NotificationsRepository {
  /// Live list of notifications addressed to [uid], newest first.
  Stream<List<AppNotification>> watch(String uid, {int windowSize = 50});

  /// True while [uid] has at least one notification that is not read. Updates live as items are read.
  Stream<bool> watchHasUnread(String uid);
  Future<void> markRead(String id);
}

class ApiNotificationsRepository implements NotificationsRepository {
  ApiNotificationsRepository(this._api, this._db);
  final ApiClient _api;
  final FirebaseFirestore _db;

  @override
  Stream<List<AppNotification>> watch(String uid, {int windowSize = 50}) {
    return _db
        .collection('notifications')
        .where('recipientUid', isEqualTo: uid)
        .orderBy('createdAt', descending: true)
        .limit(windowSize)
        .snapshots()
        .map((snap) {
          final list = snap.docs.map((d) {
            final m = d.data();
            final created = m['createdAt'];
            return AppNotification(
              id: d.id,
              title: (m['title'] as String?) ?? 'Notification',
              body: (m['body'] as String?) ?? '',
              reportId: m['reportId'] as String?,
              read: m['read'] == true,
              createdAt: created is Timestamp ? created.toDate() : null,
            );
          }).toList();
          list.sort((a, b) {
            final x = a.createdAt, y = b.createdAt;
            if (x == null && y == null) return 0;
            if (x == null) return 1;
            if (y == null) return -1;
            return y.compareTo(x);
          });
          return list;
        });
  }

  @override
  Stream<bool> watchHasUnread(String uid) {
    // One unread item is enough for the dot, so the query reads at most one document.
    return _db
        .collection('notifications')
        .where('recipientUid', isEqualTo: uid)
        .where('read', isEqualTo: false)
        .limit(1)
        .snapshots()
        .map((snap) => snap.docs.isNotEmpty);
  }

  @override
  Future<void> markRead(String id) async {
    await _api.send('PATCH', '/notifications/$id/read');
  }
}

// ---------- Profile ----------

abstract class ProfileRepository {
  Future<Profile?> load(String uid);

  /// Uploads [photo] as the signed-in person's profile photo and returns its new URL.
  Future<String> setPhoto(PickedPhoto photo);

  /// Removes the signed-in person's profile photo.
  Future<void> removePhoto();
}

class FirestoreProfileRepository implements ProfileRepository {
  FirestoreProfileRepository(this._db, this._api);
  final FirebaseFirestore _db;
  final ApiClient _api;

  @override
  Future<String> setPhoto(PickedPhoto photo) async {
    final res = await _api.sendMultipart(
      'PUT',
      '/users/me/photo',
      files: [
        // Same as report photos: the server decides the type from the bytes, not the header.
        http.MultipartFile.fromBytes('photo', photo.bytes, filename: photo.name),
      ],
    );
    final url = res?['photoUrl'];
    if (url is! String || url.isEmpty) {
      throw const ApiException(
        0,
        'bad_response',
        'The server sent an unexpected reply.',
      );
    }
    return url;
  }

  @override
  Future<void> removePhoto() async {
    await _api.send('DELETE', '/users/me/photo');
  }

  @override
  Future<Profile?> load(String uid) async {
    // Errors propagate: the profile page then shows "Could not load your profile" with Try again.
    // A missing document is still null (no details saved yet).
    final snap = await _db
        .doc('users/$uid')
        .get()
        .timeout(const Duration(seconds: 6));
    final m = snap.data();
    if (m == null) return null;
    // The API keeps the photo on the same document as { url, publicId, updatedAt }; only the URL is used.
    final photo = m['photo'];
    final photoUrl = photo is Map ? photo['url'] : null;
    return Profile(
      name: m['name'] as String?,
      phone: m['phone'] as String?,
      photoUrl: photoUrl is String && photoUrl.isNotEmpty ? photoUrl : null,
    );
  }
}

AssignedReport _assignedFrom(String id, Map<String, dynamic> m) {
  final created = m['createdAt'];
  final loc = m['location'];
  final lat = loc is Map ? (loc['lat'] as num?)?.toDouble() : null;
  final lng = loc is Map ? (loc['lng'] as num?)?.toDouble() : null;
  final coarse = m['coarseLocation'];
  final cLat = coarse is Map ? (coarse['lat'] as num?)?.toDouble() : null;
  final cLng = coarse is Map ? (coarse['lng'] as num?)?.toDouble() : null;
  return AssignedReport(
    id: id,
    type: (m['type'] as String?) ?? 'other',
    typeDetail: m['typeDetail'] as String?,
    description: (m['description'] as String?) ?? '',
    status: (m['status'] as String?) ?? 'Team Assigned',
    reference: m['reference'] as String?,
    addressText: m['addressText'] as String?,
    placeName: m['placeName'] as String?,
    area: m['area'] as String?,
    lat: lat,
    lng: lng,
    createdAt: created is Timestamp ? created.toDate() : null,
    priority: m['priority'] as String?,
    reporterId: m['reporterId'] as String?,
    assignedTeamId: m['assignedTeamId'] as String?,
    assignedTeamIds: (m['assignedTeamIds'] as List?)?.whereType<String>().toList() ?? const [],
    acknowledgedTeamIds: (m['acknowledgedTeamIds'] as List?)?.whereType<String>().toList() ?? const [],
    coarseLocation: cLat != null && cLng != null ? MapPoint(cLat, cLng) : null,
    affectedRadiusM: (m['affectedRadiusM'] as num?)?.toInt(),
  );
}
