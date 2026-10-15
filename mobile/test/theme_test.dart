import 'package:disaster_rescue/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('theme uses token colors exactly', () {
    expect(AppTheme.light.colorScheme.primary, const Color(0xFF0F6B66));
    expect(AppColors.critical, const Color(0xFFC83919));
    expect(AppColors.bg, const Color(0xFFF6F1EA));
    expect(AppColors.primarySoft, const Color(0xFFEEF3F2));
    expect(AppColors.high, const Color(0xFF9E5A00));
    expect(AppColors.low, const Color(0xFF5F6B6A));
    expect(AppColors.text, const Color(0xFF1D2B2A));
    expect(AppColors.muted, const Color(0xFF566665));
    expect(AppTheme.light.scaffoldBackgroundColor, AppColors.bg);
    expect(AppRadius.md, 12);
    expect(AppRadius.lg, 20);
    expect(AppSpace.touch, 44);
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
