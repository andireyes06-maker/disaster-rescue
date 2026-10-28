import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'product_motion.dart';

/// Native palette aligned with the website brand; see mobile/DESIGN.md.
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
  static const controlOutline = Color(0xFF8B849D);
  static const success = Color(0xFF176747);
  static const onHarbor = Color(0xFFDAD2EE);

  // Incident type is separate from priority: blue flood, ember fire, earth quake/slide.
  static Color incident(String type) => switch (type.toLowerCase()) {
    'flood' => const Color(0xFF215D98),
    'fire' => const Color(0xFF9C391B),
    'earthquake' => const Color(0xFF79501F),
    'landslide' => const Color(0xFF376749),
    _ => primary,
  };
}

class AppRadius {
  static const double md = 10;
  static const double lg = 16;
}

class AppSpace {
  static const double touch = 48;
}

class PriorityStyle {
  final String label;
  final IconData icon;
  final Color color;
  const PriorityStyle(this.label, this.icon, this.color);

  static PriorityStyle of(String priority) {
    switch (priority) {
      case 'critical':
        return const PriorityStyle(
          'Critical',
          Icons.priority_high,
          AppColors.critical,
        );
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
        return const StatusStyle(
          'Under Verification',
          Icons.search,
          AppColors.medium,
        );
      case 'Verified':
        return const StatusStyle(
          'Verified',
          Icons.verified_outlined,
          AppColors.primary,
        );
      case 'Awaiting Assignment':
        return const StatusStyle(
          'Awaiting Assignment',
          Icons.hourglass_empty,
          AppColors.high,
        );
      case 'Team Assigned':
        return const StatusStyle(
          'Team Assigned',
          Icons.groups_outlined,
          AppColors.primary,
        );
      case 'Rescue in Progress':
        return const StatusStyle(
          'Rescue in Progress',
          Icons.directions_run,
          AppColors.primary,
        );
      case 'Resolved':
        return const StatusStyle(
          'Resolved',
          Icons.check_circle_outline,
          AppColors.success,
        );
      case 'Closed':
        return const StatusStyle('Closed', Icons.lock_outline, AppColors.low);
      case 'Rejected':
        return const StatusStyle('Rejected', Icons.block, AppColors.low);
      case 'Duplicate':
        return const StatusStyle(
          'Duplicate',
          Icons.copy_all_outlined,
          AppColors.low,
        );
      case 'Cancelled':
        return const StatusStyle(
          'Cancelled',
          Icons.cancel_outlined,
          AppColors.low,
        );
      default:
        return StatusStyle(status, Icons.help_outline, AppColors.low);
    }
  }
}

class AppTheme {
  static ThemeData get light {
    const scheme = ColorScheme.light(
      primary: AppColors.primary,
      onPrimary: Colors.white,
      primaryContainer: AppColors.primarySoft,
      onPrimaryContainer: AppColors.harbor,
      secondary: AppColors.harbor,
      onSecondary: Colors.white,
      secondaryContainer: AppColors.primarySoft,
      onSecondaryContainer: AppColors.harbor,
      surface: AppColors.surface,
      onSurface: AppColors.text,
      onSurfaceVariant: AppColors.muted,
      outline: AppColors.muted,
      outlineVariant: AppColors.border,
      error: AppColors.critical,
      onError: Colors.white,
      surfaceContainerLowest: AppColors.surface,
      surfaceContainerLow: AppColors.bg,
    );
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      fontFamily: 'Geist',
    );
    final type = base.textTheme
        .apply(bodyColor: AppColors.text, displayColor: AppColors.text)
        .copyWith(
          headlineLarge: const TextStyle(
            fontFamily: 'Geist',
            fontSize: 36,
            height: 1.1,
            letterSpacing: -1.1,
            fontWeight: FontWeight.w700,
            color: AppColors.text,
          ),
          headlineMedium: const TextStyle(
            fontFamily: 'Geist',
            fontSize: 28,
            height: 1.15,
            letterSpacing: -.7,
            fontWeight: FontWeight.w700,
            color: AppColors.text,
          ),
          headlineSmall: const TextStyle(
            fontFamily: 'Geist',
            fontSize: 24,
            height: 1.2,
            letterSpacing: -.5,
            fontWeight: FontWeight.w700,
            color: AppColors.text,
          ),
          titleLarge: const TextStyle(
            fontFamily: 'Geist',
            fontSize: 21,
            height: 1.25,
            letterSpacing: -.4,
            fontWeight: FontWeight.w600,
            color: AppColors.text,
          ),
          titleMedium: const TextStyle(
            fontFamily: 'Geist',
            fontSize: 16,
            height: 1.4,
            fontWeight: FontWeight.w600,
            color: AppColors.text,
          ),
          bodyLarge: const TextStyle(
            fontFamily: 'Geist',
            fontSize: 16,
            height: 1.5,
            color: AppColors.text,
          ),
          bodyMedium: const TextStyle(
            fontFamily: 'Geist',
            fontSize: 14,
            height: 1.5,
            color: AppColors.text,
          ),
          bodySmall: const TextStyle(
            fontFamily: 'Geist',
            fontSize: 13,
            height: 1.45,
            color: AppColors.muted,
          ),
          labelLarge: const TextStyle(
            fontFamily: 'Geist',
            fontSize: 15,
            height: 1.3,
            fontWeight: FontWeight.w600,
          ),
        );
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(12),
    );
    OutlineInputBorder border(Color c, double w) => OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: c, width: w),
    );
    return base.copyWith(
      textTheme: type,
      scaffoldBackgroundColor: AppColors.bg,
      focusColor: AppColors.primary.withValues(alpha: .16),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: ProductPageTransitions(),
          TargetPlatform.macOS: ProductPageTransitions(),
          TargetPlatform.windows: ProductPageTransitions(),
          TargetPlatform.linux: ProductPageTransitions(),
          TargetPlatform.fuchsia: ProductPageTransitions(),
        },
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.harbor,
        foregroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleSpacing: 20,
        toolbarHeight: 68,
        titleTextStyle: TextStyle(
          fontFamily: 'Geist',
          fontSize: 18,
          height: 1.25,
          fontWeight: FontWeight.w600,
          color: Colors.white,
          letterSpacing: -.3,
        ),
        iconTheme: IconThemeData(color: Colors.white, size: 23),
        actionsIconTheme: IconThemeData(color: Colors.white, size: 23),
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarColor: AppColors.harbor,
          statusBarIconBrightness: Brightness.light,
          statusBarBrightness: Brightness.dark,
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.border),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(48, 54),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: shape,
          textStyle: type.labelLarge,
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(48, 50),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          shape: shape,
          foregroundColor: AppColors.text,
          backgroundColor: AppColors.surface,
          textStyle: type.labelLarge,
          side: const BorderSide(color: Color(0xFFD3CEDF)),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          minimumSize: const Size(48, 48),
          shape: shape,
          textStyle: type.labelLarge,
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(minimumSize: const Size(48, 48)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        floatingLabelBehavior: FloatingLabelBehavior.always,
        labelStyle: const TextStyle(
          fontFamily: 'Geist',
          color: AppColors.muted,
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
        hintStyle: const TextStyle(
          fontFamily: 'Geist',
          color: AppColors.muted,
          fontSize: 14,
        ),
        helperStyle: type.bodySmall,
        errorStyle: type.bodySmall?.copyWith(color: AppColors.critical),
        border: border(AppColors.controlOutline, 1),
        enabledBorder: border(AppColors.controlOutline, 1),
        focusedBorder: border(AppColors.primary, 2),
        errorBorder: border(AppColors.critical, 1.5),
        focusedErrorBorder: border(AppColors.critical, 2),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 18,
        ),
        errorMaxLines: 5,
      ),
      materialTapTargetSize: MaterialTapTargetSize.padded,
      visualDensity: VisualDensity.standard,
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        height: 74,
        indicatorColor: AppColors.primarySoft,
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => TextStyle(
            fontFamily: 'Geist',
            fontSize: 12,
            fontWeight: states.contains(WidgetState.selected)
                ? FontWeight.w700
                : FontWeight.w500,
            color: states.contains(WidgetState.selected)
                ? AppColors.primary
                : AppColors.muted,
          ),
        ),
        iconTheme: WidgetStateProperty.resolveWith(
          (states) => IconThemeData(
            size: 23,
            color: states.contains(WidgetState.selected)
                ? AppColors.primary
                : AppColors.muted,
          ),
        ),
      ),
      tabBarTheme: const TabBarThemeData(
        labelColor: Colors.white,
        unselectedLabelColor: AppColors.onHarbor,
        indicatorColor: Color(0xFFC0A2FF),
        dividerColor: Color(0xFF493963),
        labelStyle: TextStyle(
          fontFamily: 'Geist',
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelStyle: TextStyle(
          fontFamily: 'Geist',
          fontSize: 14,
          fontWeight: FontWeight.w400,
        ),
        indicatorSize: TabBarIndicatorSize.label,
      ),
      segmentedButtonTheme: SegmentedButtonThemeData(
        style: ButtonStyle(
          shape: WidgetStatePropertyAll(shape),
          side: const WidgetStatePropertyAll(
            BorderSide(color: AppColors.border),
          ),
          textStyle: WidgetStatePropertyAll(type.labelLarge),
          backgroundColor: WidgetStateProperty.resolveWith(
            (s) => s.contains(WidgetState.selected)
                ? AppColors.primarySoft
                : AppColors.surface,
          ),
          foregroundColor: WidgetStateProperty.resolveWith(
            (s) => s.contains(WidgetState.selected)
                ? AppColors.primary
                : AppColors.muted,
          ),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.border,
        space: 28,
        thickness: 1,
      ),
      chipTheme: base.chipTheme.copyWith(
        backgroundColor: AppColors.surface,
        selectedColor: AppColors.primarySoft,
        side: const BorderSide(color: AppColors.border),
        shape: shape,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.harbor,
        contentTextStyle: type.bodyMedium?.copyWith(color: Colors.white),
        behavior: SnackBarBehavior.floating,
        shape: shape,
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: AppColors.surface,
        showDragHandle: true,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
    );
  }
}
