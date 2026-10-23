import 'package:disaster_rescue/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('theme uses token colors exactly', () {
    expect(AppTheme.light.colorScheme.primary, const Color(0xFF6D28D9));
    expect(AppColors.critical, const Color(0xFFB42318));
    expect(AppColors.bg, const Color(0xFFF5F6FA));
    expect(AppColors.primarySoft, const Color(0xFFEFE8FF));
    expect(AppColors.high, const Color(0xFF8A5100));
    expect(AppColors.low, const Color(0xFF625E73));
    expect(AppColors.text, const Color(0xFF211D35));
    expect(AppColors.muted, const Color(0xFF625E73));
    expect(AppTheme.light.scaffoldBackgroundColor, AppColors.bg);
    expect(AppRadius.md, 10);
    expect(AppRadius.lg, 16);
    expect(AppSpace.touch, 48);
  });

  test('priority and status styles carry label and icon', () {
    final p = PriorityStyle.of('critical');
    expect(p.label, 'Critical');
    expect(p.color, AppColors.critical);
    expect(p.icon, isA<IconData>());
    expect(PriorityStyle.of('low').color, AppColors.low);
    expect(StatusStyle.of('Rescue in Progress').label, 'Rescue in Progress');
    expect(StatusStyle.of('unknown').label, 'unknown');
  });
}
