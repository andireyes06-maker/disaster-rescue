import 'package:flutter/material.dart';

/// Values copied from docs/design-tokens/tokens.json.
class AppColors {
  static const bg = Color(0xFFF6F1EA);
  static const surface = Color(0xFFFFFFFF);
  static const primary = Color(0xFF0F6B66);
  static const primarySoft = Color(0xFFEEF3F2);
  static const critical = Color(0xFFC83919);
  static const high = Color(0xFF9E5A00);
  static const medium = Color(0xFF0F6B66);
  static const low = Color(0xFF5F6B6A);
  static const text = Color(0xFF1D2B2A);
  static const muted = Color(0xFF566665);
}

class AppRadius {
  static const double md = 12;
  static const double lg = 20;
}

class AppSpace {
  static const double touch = 44;
}

class PriorityStyle {
  final String label;
  final IconData icon;
  final Color color;
  const PriorityStyle(this.label, this.icon, this.color);

  static PriorityStyle of(String priority) {
    switch (priority) {
      case 'critical':
        return const PriorityStyle('Critical', Icons.priority_high, AppColors.critical);
      case 'high':
        return const PriorityStyle('High', Icons.arrow_upward, AppColors.high);
      case 'medium':
        return const PriorityStyle('Medium', Icons.remove, AppColors.medium);
      case 'low':
        return const PriorityStyle('Low', Icons.arrow_downward, AppColors.low);
      default:
        return PriorityStyle(priority, Icons.help_outline, AppColors.low);
    }
  }
}

class StatusStyle {
  final String label;
  final IconData icon;
  final Color color;
  const StatusStyle(this.label, this.icon, this.color);

  static StatusStyle of(String status) {
    switch (status) {
      case 'Submitted':
        return const StatusStyle('Submitted', Icons.send, AppColors.low);
      case 'Under Verification':
        return const StatusStyle('Under Verification', Icons.search, AppColors.medium);
      case 'Verified':
        return const StatusStyle('Verified', Icons.verified_outlined, AppColors.primary);
      case 'Awaiting Assignment':
        return const StatusStyle('Awaiting Assignment', Icons.hourglass_empty, AppColors.high);
      case 'Team Assigned':
        return const StatusStyle('Team Assigned', Icons.groups_outlined, AppColors.primary);
      case 'Rescue in Progress':
        return const StatusStyle('Rescue in Progress', Icons.directions_run, AppColors.primary);
      case 'Resolved':
        return const StatusStyle('Resolved', Icons.check_circle_outline, AppColors.primary);
      case 'Closed':
        return const StatusStyle('Closed', Icons.lock_outline, AppColors.low);
      case 'Rejected':
        return const StatusStyle('Rejected', Icons.block, AppColors.low);
      case 'Duplicate':
        return const StatusStyle('Duplicate', Icons.copy_all_outlined, AppColors.low);
      case 'Cancelled':
        return const StatusStyle('Cancelled', Icons.cancel_outlined, AppColors.low);
      default:
        return StatusStyle(status, Icons.help_outline, AppColors.low);
    }
  }
}

class AppTheme {
  static ThemeData get light {
    final scheme = ColorScheme.fromSeed(seedColor: AppColors.primary).copyWith(
      primary: AppColors.primary,
      onPrimary: Colors.white,
      secondary: AppColors.primary,
      surface: AppColors.surface,
      onSurface: AppColors.text,
      error: AppColors.high,
    );
    final shape = RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md));
    const minSize = Size(AppSpace.touch, AppSpace.touch);
    OutlineInputBorder border(Color c, double w) => OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: BorderSide(color: c, width: w),
        );
    final base = ThemeData(useMaterial3: true, colorScheme: scheme);
    return base.copyWith(
      scaffoldBackgroundColor: AppColors.bg,
      textTheme: base.textTheme
          .apply(bodyColor: AppColors.text, displayColor: AppColors.text)
          .copyWith(
            headlineMedium: base.textTheme.headlineMedium
                ?.copyWith(fontSize: 30, fontWeight: FontWeight.w700, color: AppColors.text),
            titleLarge: base.textTheme.titleLarge
                ?.copyWith(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.text),
          ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.bg,
        foregroundColor: AppColors.text,
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
      cardTheme: CardThemeData(
        color: AppColors.surface,
        elevation: 1,
        shadowColor: AppColors.text.withValues(alpha: 0.12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg)),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(AppSpace.touch, 52),
          shape: shape,
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: minSize,
          shape: shape,
          foregroundColor: AppColors.primary,
          side: const BorderSide(color: AppColors.primary),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(minimumSize: minSize, shape: shape),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(minimumSize: minSize),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        floatingLabelBehavior: FloatingLabelBehavior.always,
        labelStyle: const TextStyle(color: AppColors.muted),
        border: border(AppColors.muted, 1),
        enabledBorder: border(AppColors.muted, 1),
        focusedBorder: border(AppColors.primary, 3),
        errorBorder: border(AppColors.high, 2),
        focusedErrorBorder: border(AppColors.high, 3),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
      materialTapTargetSize: MaterialTapTargetSize.padded,
      visualDensity: VisualDensity.standard,
    );
  }
}
