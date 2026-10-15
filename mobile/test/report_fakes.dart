import 'dart:async';
import 'dart:typed_data';

import 'package:disaster_rescue/auth/auth_controller.dart';
import 'package:disaster_rescue/data/report_models.dart';
import 'package:disaster_rescue/data/services.dart';
import 'package:disaster_rescue/features/report/report_draft_store.dart';
import 'package:disaster_rescue/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'fakes.dart';

class FakeReportsRepository implements ReportsRepository {
  Object? createError;
  final List<NewReport> created = [];
  final List<String> cancelled = [];
  Object? cancelError;
  final StreamController<List<ReportSummary>> controller = StreamController.broadcast();

  @override
  Future<SubmitResult> create(NewReport report) async {
    if (createError != null) throw createError!;
    created.add(report);
    return const SubmitResult(id: 'r1', status: 'Submitted', reference: 'DR-AB12CD');
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
  LocationResult result = const LocationResult(LocationStatus.ok, lat: 14.5995, lng: 120.9842);
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
  List<Hotline> list = const [Hotline('National emergency', '911'), Hotline('Local office', '+63 2 8123 4567')];
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
  @override
  Future<void> save(ReportDraft d) async => draft = d;
  @override
  Future<ReportDraft?> load() async => draft;
  @override
  Future<void> clear() async => draft = null;
}

Uint8List jpegBytes([int extra = 20]) =>
    Uint8List.fromList([0xFF, 0xD8, 0xFF, 0xE0, ...List.filled(extra, 1)]);

Uint8List pngBytes() =>
    Uint8List.fromList([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0]);

PickedPhoto photo(String name) => PickedPhoto(name: name, bytes: jpegBytes(), mime: 'image/jpeg');

class Env {
  final reports = FakeReportsRepository();
  final location = FakeLocationService();
  final photos = FakePhotoService();
  final dialer = FakeDialer();
  final hotlines = FakeHotlines();
  final profiles = FakeProfiles();
  final drafts = MemoryDraftStore();
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
          ChangeNotifierProvider<AuthController>.value(value: auth),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          builder: (context, c) => MediaQuery(
            data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(textScale)),
            child: c!,
          ),
          home: child,
        ),
      );

  void dispose() {
    auth.dispose();
    reports.controller.close();
  }
}
