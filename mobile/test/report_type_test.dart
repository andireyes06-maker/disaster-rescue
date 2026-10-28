import 'package:disaster_rescue/data/report_models.dart';
import 'package:disaster_rescue/features/report/report_flow_page.dart';
import 'package:disaster_rescue/theme/app_theme.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('the 8 types are listed in the agreed order', () {
    expect(reportTypes, [
      'flood',
      'fire',
      'earthquake',
      'landslide',
      'medical',
      'road_hazard',
      'power_line',
      'other',
    ]);
    expect(reportTypes.map((k) => reportTypeLabels[k]).toList(), [
      'Flood',
      'Fire',
      'Earthquake',
      'Landslide',
      'Lifeline',
      'Roadblock',
      'Live Wire',
      'Other',
    ]);
  });

  test('reportTypeLabel names a type, the typed Other, and an unknown key', () {
    expect(reportTypeLabel('road_hazard'), 'Roadblock');
    expect(reportTypeLabel('other', 'gas leak'), 'Other: gas leak');
    expect(reportTypeLabel('other'), 'Other');
    expect(reportTypeLabel('zzz'), 'Other');
    expect(reportTypeLabel('flood', 'ignored'), 'Flood');
  });

  test('every type has a chooser line, an icon and its own colour', () {
    for (final k in reportTypes) {
      expect(reportTypeInfo[k], isNotNull, reason: k);
      expect(reportTypeInfo[k]!.detail, isNotEmpty, reason: k);
    }
    expect(reportTypeInfo['medical']!.detail, 'Someone needs urgent medical help');
    expect(reportTypeInfo['road_hazard']!.detail, 'Blocked, damaged or unsafe road');
    expect(reportTypeInfo['power_line']!.detail, 'Fallen, sparking or damaged power line');
    expect(reportTypeInfo['other']!.detail, 'Something else. You will describe it next');
    final colors = {for (final k in reportTypes) k: AppColors.incident(k)};
    expect(colors.values.toSet().length, 8);
  });

  test('typeInfoFor falls back to Other for a key this build does not know', () {
    expect(typeInfoFor('zzz'), same(reportTypeInfo['other']));
    expect(typeInfoFor('power_line'), same(reportTypeInfo['power_line']));
  });
}
