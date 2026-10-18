// Regenerate with: flutter test test/redesign_visual_test.dart --update-goldens
// Uses local fakes only. These captures verify Flutter layout, not device permissions or gestures.
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:disaster_rescue/features/auth/login_page.dart';
import 'package:disaster_rescue/features/auth/register_page.dart';
import 'package:disaster_rescue/features/report/report_flow_page.dart';
import 'package:disaster_rescue/features/report/submission_result_page.dart';
import 'package:disaster_rescue/features/profile/profile_page.dart';
import 'package:disaster_rescue/features/my_reports/my_reports_page.dart';
import 'package:disaster_rescue/features/notifications/notifications_page.dart';
import 'package:disaster_rescue/features/responder/operation_form_page.dart';
import 'package:disaster_rescue/data/report_models.dart';
import 'package:disaster_rescue/auth/auth_repository.dart';
import 'package:disaster_rescue/features/responder/assigned_list_page.dart';
import 'package:disaster_rescue/features/responder/incident_detail_page.dart';
import 'package:disaster_rescue/features/offline/offline_help_page.dart';
import 'package:disaster_rescue/features/map/incident_map_page.dart';
import 'fakes.dart';
import 'report_fakes.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() async {
    final root = Platform.environment['FLUTTER_ROOT'];
    if (root != null) {
      final font = File('$root/bin/cache/artifacts/material_fonts/Roboto-Regular.ttf');
      if (font.existsSync()) await (FontLoader('Roboto')..addFont(Future.value(ByteData.sublistView(font.readAsBytesSync())))).load();
      final icons = File('$root/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf');
      if (icons.existsSync()) await (FontLoader('MaterialIcons')..addFont(Future.value(ByteData.sublistView(icons.readAsBytesSync())))).load();
    }
  });
  const key = Key('native-capture');
  late Env env;
  setUp(() => env = Env());
  tearDown(() => env.dispose());
  Future<void> host(WidgetTester t, Widget page) async {
    t.view.physicalSize = const Size(390, 844);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    await t.pumpWidget(RepaintBoundary(key: key, child: env.host(page)));
    await t.pumpAndSettle();
  }
  Future<void> capture(WidgetTester t, String name) async {
    expect(t.takeException(), isNull);
    await expectLater(find.byKey(key), matchesGoldenFile('../../design-plans/codex-redesign/native/$name.png'));
  }
  testWidgets('access and account layouts at phone width', (t) async {
    await host(t, const LoginPage());
    await capture(t, 'login');
    await t.pumpWidget(const SizedBox());
    await host(t, const RegisterPage());
    await capture(t, 'register');
    await t.pumpWidget(const SizedBox());
    await host(t, const ProfilePage(user: residentUser));
    await capture(t, 'profile');
  });
  testWidgets('four real report stages at phone width', (t) async {
    env.hotlines.list = [];
    await host(t, const ReportFlowPage());
    await capture(t, 'report-type');
    await t.tap(find.text('Flood'));
    await t.pumpAndSettle();
    await t.tap(find.text('Next'));
    await t.pumpAndSettle();
    await capture(t, 'report-location');
    await t.tap(find.text('Use my current location'));
    await t.pumpAndSettle();
    await t.tap(find.text('Next'));
    await t.pumpAndSettle();
    await capture(t, 'report-details');
    await t.enterText(find.byKey(const Key('description')), 'Sample flood report. Water is rising near the access road.');
    await t.tap(find.text('Next'));
    await t.pumpAndSettle();
    await capture(t, 'report-review');
  });
  testWidgets('report list, notifications and response form', (t) async {
    await host(t, const MyReportsPage(uid: 'u1'));
    env.reports.controller.add([ReportSummary(id: 'sample', type: 'flood', description: 'Sample report: water is rising near the access road.', status: 'Team Assigned', createdAt: DateTime(2026, 10, 17, 8, 30))]);
    await t.pumpAndSettle();
    await capture(t, 'my-reports');
    await t.pumpWidget(const SizedBox());
    await host(t, const NotificationsPage(uid: 'u1'));
    env.notifications.controller.add([AppNotification(id: 'sample', title: 'Team assigned', body: 'A sample rescue team has been assigned to your report.', reportId: 'sample', read: false, createdAt: DateTime(2026, 10, 17, 9))]);
    await t.pumpAndSettle();
    await capture(t, 'notifications');
    await t.pumpWidget(const SizedBox());
    await host(t, const OperationFormPage(reportId: 'sample'));
    await capture(t, 'response-update');
    await t.pumpWidget(const SizedBox());
    await host(t, SubmissionSuccessPage(reference: 'DR-SAMPLE', onViewReports: () {}));
    await capture(t, 'submission-result');
  });
  testWidgets('assignment, incident, map and recovery layouts', (t) async {
    const report = AssignedReport(id: 'sample', reference: 'DR-SAMPLE', type: 'flood', description: 'Sample report: water is rising near the access road.', status: 'Team Assigned', priority: 'critical', assignedTeamId: 'team-sample', addressText: 'Sample access road', lat: 14.6, lng: 121);
    await host(t, const AssignedListPage());
    env.authRepo.events.add(const AuthUser(uid: 'responder-sample', email: 'sample@demo.test', role: 'responder', team: 'team-sample', active: true));
    await t.pumpAndSettle();
    env.responder.assigned.add([report]);
    await t.pumpAndSettle();
    await capture(t, 'assignments');
    await t.pumpWidget(const SizedBox());
    await host(t, const IncidentDetailPage(report: report));
    await capture(t, 'incident-detail');
    await t.pumpWidget(const SizedBox());
    await host(t, IncidentMapPage(reports: Stream.value([report]), viewerUid: 'responder-sample', viewerTeam: 'team-sample', showTiles: false));
    await capture(t, 'map-tile-free');
    await t.pumpWidget(const SizedBox());
    env.hotlines.list = [];
    await host(t, const OfflineHelpPage());
    await capture(t, 'offline-recovery');
  });
}
