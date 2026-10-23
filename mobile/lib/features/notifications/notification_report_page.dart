import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../auth/auth_controller.dart';
import '../../data/report_models.dart';
import '../../data/services.dart';
import '../../theme/product_widgets.dart';
import '../my_reports/my_reports_page.dart';
import '../responder/incident_detail_page.dart';

/// A notification is a destination hint, never an access grant. Resolve the
/// document through the signed-in role's rules and discard it on account changes.
class NotificationReportPage extends StatefulWidget {
  const NotificationReportPage({
    super.key,
    required this.reportId,
    required this.ownerUid,
  });
  final String reportId;
  final String ownerUid;
  @override
  State<NotificationReportPage> createState() => _NotificationReportPageState();
}

class _NotificationReportPageState extends State<NotificationReportPage> {
  Stream<ReportSummary?>? _resident;
  Stream<AssignedReport?>? _responder;
  String? _role;
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final role = context.watch<AuthController>().user?.role;
    if (_role == role) return;
    _role = role;
    if (role == 'resident') {
      _resident = context
          .read<ReportsRepository>()
          .watchReport(widget.reportId)
          .asBroadcastStream();
    }
    if (role == 'responder') {
      _responder = context
          .read<ResponderRepository>()
          .watchReport(widget.reportId)
          .asBroadcastStream();
    }
  }

  Widget unavailable() => Scaffold(
    appBar: AppBar(title: const Text('Report unavailable')),
    body: const ProductEmpty(
      title: 'This report is not available.',
      description:
          'The link may be outdated or access may have changed. Return to your reports or assignments.',
    ),
  );
  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthController>().user;
    if (user == null || user.uid != widget.ownerUid || !user.active) {
      return unavailable();
    }
    if (user.role == 'resident') {
      return StreamBuilder<ReportSummary?>(
        stream: _resident,
        builder: (context, snapshot) {
          if (snapshot.hasError) return unavailable();
          if (snapshot.connectionState == ConnectionState.waiting) {
            return Scaffold(
              appBar: AppBar(title: const Text('Opening report')),
              body: const ProductLoading(),
            );
          }
          final report = snapshot.data;
          if (report == null) return unavailable();
          return ReportDetailPage(
            initial: report,
            updates: _resident!.map((r) => r == null ? <ReportSummary>[] : [r]),
          );
        },
      );
    }
    if (user.role == 'responder' && user.team != null) {
      return StreamBuilder<AssignedReport?>(
        stream: _responder,
        builder: (context, snapshot) {
          if (snapshot.hasError) return unavailable();
          if (snapshot.connectionState == ConnectionState.waiting) {
            return Scaffold(
              appBar: AppBar(title: const Text('Opening report')),
              body: const ProductLoading(),
            );
          }
          final report = snapshot.data;
          if (report == null || report.assignedTeamId != user.team) {
            return unavailable();
          }
          return IncidentDetailPage(report: report);
        },
      );
    }
    return unavailable();
  }
}
