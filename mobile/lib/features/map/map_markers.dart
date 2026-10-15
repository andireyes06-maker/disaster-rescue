import 'package:flutter/material.dart';

import '../../data/report_models.dart';
import '../../theme/app_theme.dart';

/// Exact location only for the reporter and the assigned team. Everyone else
/// gets the coarse point, which the API already rounds.
MapPoint? visibleLocation(
  AssignedReport r, {
  required String viewerUid,
  String? viewerTeam,
}) {
  final isReporter = r.reporterId != null && r.reporterId == viewerUid;
  final isAssigned = viewerTeam != null && r.assignedTeamId == viewerTeam;
  if (isReporter || isAssigned) {
    final lat = r.lat, lng = r.lng;
    return lat != null && lng != null ? MapPoint(lat, lng) : null;
  }
  return r.coarseLocation;
}

enum MarkerShape { octagon, triangle, diamond, circle, square }

class PriorityMarker {
  final MarkerShape shape;
  final String label;
  final Color color;
  const PriorityMarker(this.shape, this.label, this.color);
}

/// Shape and text label carry the priority. Color is extra, never the only cue.
/// Coral is reserved for critical.
PriorityMarker priorityMarker(String? priority) {
  switch (priority) {
    case 'critical':
      return const PriorityMarker(
        MarkerShape.octagon,
        'Critical',
        AppColors.critical,
      );
    case 'high':
      return const PriorityMarker(MarkerShape.triangle, 'High', AppColors.high);
    case 'medium':
      return const PriorityMarker(
        MarkerShape.diamond,
        'Medium',
        AppColors.medium,
      );
    case 'low':
      return const PriorityMarker(MarkerShape.circle, 'Low', AppColors.low);
    default:
      return const PriorityMarker(
        MarkerShape.square,
        'Unknown',
        AppColors.text,
      );
  }
}

class MarkerGlyph extends StatelessWidget {
  const MarkerGlyph({super.key, required this.marker, this.size = 28});
  final PriorityMarker marker;
  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _ShapePainter(marker.shape, marker.color)),
    );
  }
}

class _ShapePainter extends CustomPainter {
  _ShapePainter(this.shape, this.color);
  final MarkerShape shape;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    final w = size.width, h = size.height;
    final path = Path();
    switch (shape) {
      case MarkerShape.octagon:
        final c = w * 0.3;
        path
          ..moveTo(c, 0)
          ..lineTo(w - c, 0)
          ..lineTo(w, c)
          ..lineTo(w, h - c)
          ..lineTo(w - c, h)
          ..lineTo(c, h)
          ..lineTo(0, h - c)
          ..lineTo(0, c)
          ..close();
      case MarkerShape.triangle:
        path
          ..moveTo(w / 2, 0)
          ..lineTo(w, h)
          ..lineTo(0, h)
          ..close();
      case MarkerShape.diamond:
        path
          ..moveTo(w / 2, 0)
          ..lineTo(w, h / 2)
          ..lineTo(w / 2, h)
          ..lineTo(0, h / 2)
          ..close();
      case MarkerShape.circle:
        path.addOval(Rect.fromLTWH(0, 0, w, h));
      case MarkerShape.square:
        path.addRect(Rect.fromLTWH(0, 0, w, h));
    }
    canvas.drawPath(path, paint);
    canvas.drawPath(
      path,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..color = AppColors.surface,
    );
  }

  @override
  bool shouldRepaint(covariant _ShapePainter old) =>
      old.shape != shape || old.color != color;
}
