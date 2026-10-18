import 'dart:async';
import 'dart:typed_data';

import 'package:disaster_rescue/auth/auth_controller.dart';
import 'package:disaster_rescue/data/api_client.dart';
import 'package:disaster_rescue/data/report_models.dart';
import 'package:disaster_rescue/data/services.dart';
import 'package:disaster_rescue/features/notifications/push_registration.dart';
import 'package:disaster_rescue/features/report/report_draft_store.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:disaster_rescue/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'fakes.dart';

class FakeReportsRepository implements ReportsRepository {
  Object? createError;
  final List<NewReport> created = [];
  // Every attempt's key, including attempts that failed (M04).
  final List<String?> keysSeen = [];
  final List<String> cancelled = [];
  Object? cancelError;
  final StreamController<List<ReportSummary>> controller =
      StreamController.broadcast();

  @override
  Future<SubmitResult> create(NewReport report) async {
    keysSeen.add(report.idempotencyKey);
    if (createError != null) throw createError!;
    created.add(report);
    return const SubmitResult(
      id: 'r1',
      status: 'Submitted',
      reference: 'DR-AB12CD',
    );
  }

  @override
  Stream<List<ReportSummary>> watchMyReports(String uid) => controller.stream;

  @override
  Future<void> cancel(String id) async {
    if (cancelError != null) throw cancelError!;
    cancelled.add(id);
  }
}

class FakeLocationService implements LocationService {
  LocationResult result = const LocationResult(
    LocationStatus.ok,
    lat: 14.5995,
    lng: 120.9842,
  );
  @override
  Future<LocationResult> current() async => result;
}

class FakePhotoService implements PhotoService {
  List<PickedPhoto> next = [];
  int calls = 0;
  @override
  Future<List<PickedPhoto>> pick(int limit) async {
    calls++;
    return next.take(limit).toList();
  }
}

class FakeDialer implements PhoneDialer {
  final List<String> dialed = [];
  @override
  Future<bool> dial(String number) async {
    dialed.add(number);
    return true;
  }
}

class FakeHotlines implements HotlineRepository {
  List<Hotline> list = const [
    Hotline('National emergency', '911'),
    Hotline('Local office', '+63 2 8123 4567'),
  ];
  @override
  Future<List<Hotline>> load() async => list;
}

class FakeProfiles implements ProfileRepository {
  Profile? profile = const Profile(name: 'Ana Reyes', phone: '0917 123 4567');
  @override
  Future<Profile?> load(String uid) async => profile;
}

class MemoryDraftStore implements DraftStore {
  ReportDraft? draft;
  // Set to simulate local storage failing after a successful send (M03).
  bool failClear = false;
  @override
  Future<void> save(ReportDraft d) async => draft = d;
  @override
  Future<ReportDraft?> load() async => draft;
  @override
  Future<void> clear() async {
    if (failClear) throw StateError('storage unavailable');
    draft = null;
  }
}

Uint8List jpegBytes([int extra = 20]) =>
    Uint8List.fromList([0xFF, 0xD8, 0xFF, 0xE0, ...List.filled(extra, 1)]);

Uint8List pngBytes() => Uint8List.fromList([
  0x89,
  0x50,
  0x4E,
  0x47,
  0x0D,
  0x0A,
  0x1A,
  0x0A,
  0,
  0,
  0,
]);

PickedPhoto photo(String name) =>
    PickedPhoto(name: name, bytes: jpegBytes(), mime: 'image/jpeg');

class FakeResponderRepository implements ResponderRepository {
  final StreamController<List<AssignedReport>> assigned =
      StreamController.broadcast();
  final List<String> acknowledged = [];
  final List<(String, OperationUpdate)> updates = [];
  Object? updateError;

  @override
  Stream<List<AssignedReport>> watchAssigned(String teamId) => assigned.stream;

  final StreamController<AssignedReport?> single = StreamController.broadcast();
  @override
  Stream<AssignedReport?> watchReport(String id) => single.stream;

  @override
  Future<void> acknowledge(String id) async => acknowledged.add(id);

  @override
  Future<void> postUpdate(String id, OperationUpdate update) async {
    if (updateError != null) throw updateError!;
    updates.add((id, update));
  }
}

class FakeNotificationsRepository implements NotificationsRepository {
  final StreamController<List<AppNotification>> controller =
      StreamController.broadcast();
  final List<String> marked = [];

  @override
  Stream<List<AppNotification>> watch(String uid) => controller.stream;

  @override
  Future<void> markRead(String id) async => marked.add(id);
}

class FakePushMessaging implements PushMessaging {
  String? token = 'tok-1';
  bool grant = true;
  int permissionRequests = 0;
  final StreamController<String> refresh = StreamController.broadcast();

  @override
  Future<bool> requestPermission() async {
    permissionRequests++;
    return grant;
  }

  @override
  Future<String?> getToken() async => token;

  @override
  Stream<String> get onTokenRefresh => refresh.stream;
}

/// Records calls instead of sending them. The client is never used for real I/O.
class FakeApi extends ApiClient {
  FakeApi()
    : super(
        baseUrl: 'http://fake.invalid/api',
        tokenProvider: () async => 'tok',
        client: MockClient((_) async => http.Response('', 204)),
      );

  final List<(String, String, Map<String, dynamic>?)> calls = [];

  @override
  Future<Map<String, dynamic>?> send(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    calls.add((method, path, body));
    return null;
  }
}

class Env {
  final reports = FakeReportsRepository();
  final location = FakeLocationService();
  final photos = FakePhotoService();
  final dialer = FakeDialer();
  final hotlines = FakeHotlines();
  final profiles = FakeProfiles();
  final drafts = MemoryDraftStore();
  final responder = FakeResponderRepository();
  final notifications = FakeNotificationsRepository();
  final messaging = FakePushMessaging();
  late final PushRegistration push = PushRegistration(FakeApi(), messaging);
  late final FakeAuthRepository authRepo = FakeAuthRepository();
  late final AuthController auth = AuthController(authRepo);

  Widget host(Widget child, {double textScale = 1.0}) => MultiProvider(
    providers: [
      Provider<ReportsRepository>.value(value: reports),
      Provider<LocationService>.value(value: location),
      Provider<PhotoService>.value(value: photos),
      Provider<PhoneDialer>.value(value: dialer),
      Provider<HotlineRepository>.value(value: hotlines),
      Provider<ProfileRepository>.value(value: profiles),
      Provider<DraftStore>.value(value: drafts),
      Provider<ResponderRepository>.value(value: responder),
      Provider<NotificationsRepository>.value(value: notifications),
      Provider<PushRegistration>.value(value: push),
      ChangeNotifierProvider<AuthController>.value(value: auth),
    ],
    child: MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      builder: (context, c) => MediaQuery(
        data: MediaQuery.of(
          context,
        ).copyWith(textScaler: TextScaler.linear(textScale)),
        child: c!,
      ),
      home: child,
    ),
  );

  void dispose() {
    auth.dispose();
    reports.controller.close();
    responder.assigned.close();
    notifications.controller.close();
  }
}
