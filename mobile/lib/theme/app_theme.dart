import 'package:flutter/material.dart';

/// Values copied from docs/design-tokens/tokens.json.
class AppColors {
  static const bg = Color(0xFFF5F6FA);
  static const surface = Color(0xFFFFFFFF);
  static const primary = Color(0xFF6D28D9);
  static const primarySoft = Color(0xFFEFE8FF);
  static const critical = Color(0xFFB42318);
  static const high = Color(0xFF8A5100);
  static const medium = Color(0xFF4338CA);
  static const low = Color(0xFF625E73);
  static const text = Color(0xFF211D35);
  static const muted = Color(0xFF625E73);
  static const harbor = Color(0xFF241747);
  static const border = Color(0xFFE5E3ED);
}

class AppRadius {
  static const double md = 10;
  static const double lg = 16;
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
      error: AppColors.critical,
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
                ?.copyWith(fontSize: 30, height: 1.15, letterSpacing: -0.8, fontWeight: FontWeight.w600, color: AppColors.text),
            titleLarge: base.textTheme.titleLarge
                ?.copyWith(fontSize: 22, letterSpacing: -0.5, fontWeight: FontWeight.w600, color: AppColors.text),
          ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.text,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleSpacing: 20,
        titleTextStyle: base.textTheme.titleLarge?.copyWith(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.text, letterSpacing: -0.4),
      ),
      cardTheme: CardThemeData(
        color: AppColors.surface,
        elevation: 0,
        shadowColor: AppColors.text.withValues(alpha: 0.12),
        margin: const EdgeInsets.symmetric(vertical: 5),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg), side: const BorderSide(color: AppColors.border)),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(AppSpace.touch, 52),
          shape: shape,
          textStyle: base.textTheme.labelLarge?.copyWith(fontSize: 16, fontWeight: FontWeight.w600),
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
        enabledBorder: border(AppColors.border, 1),
        focusedBorder: border(AppColors.primary, 2),
        errorBorder: border(AppColors.critical, 1.5),
        focusedErrorBorder: border(AppColors.critical, 2),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
      materialTapTargetSize: MaterialTapTargetSize.padded,
      visualDensity: VisualDensity.standard,
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.surface,
        elevation: 0,
        height: 76,
        indicatorColor: AppColors.primarySoft,
        labelTextStyle: WidgetStateProperty.resolveWith((states) => TextStyle(fontSize: 12, fontWeight: states.contains(WidgetState.selected) ? FontWeight.w600 : FontWeight.w400, color: states.contains(WidgetState.selected) ? AppColors.primary : AppColors.muted)),
        iconTheme: WidgetStateProperty.resolveWith((states) => IconThemeData(size: 23, color: states.contains(WidgetState.selected) ? AppColors.primary : AppColors.muted)),
      ),
      tabBarTheme: const TabBarThemeData(labelColor: AppColors.primary, unselectedLabelColor: AppColors.muted, indicatorColor: AppColors.primary, dividerColor: AppColors.border, labelStyle: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
      dividerTheme: const DividerThemeData(color: AppColors.border, space: 28),
      chipTheme: base.chipTheme.copyWith(backgroundColor: AppColors.surface, selectedColor: AppColors.primarySoft, side: const BorderSide(color: AppColors.border), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
      bottomSheetTheme: const BottomSheetThemeData(backgroundColor: AppColors.surface, showDragHandle: true, shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24)))),
      dialogTheme: DialogThemeData(backgroundColor: AppColors.surface, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20))),
    );
  }
}
