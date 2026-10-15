import 'package:disaster_rescue/data/report_models.dart';
import 'package:disaster_rescue/features/report/report_draft_store.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('save, load, clear round trip', () async {
    final store = ReportDraftStore();
    expect(await store.load(), isNull);
    await store.save(const ReportDraft(
      type: 'flood',
      description: 'Water is rising',
      lat: 14.5,
      lng: 120.9,
      source: 'gps',
      addressText: 'Near the bridge',
      contactName: 'Ana',
      contactPhone: '0917 123 4567',
    ));
    final d = (await ReportDraftStore().load())!;
    expect(d.type, 'flood');
    expect(d.description, 'Water is rising');
    expect(d.lat, 14.5);
    expect(d.lng, 120.9);
    expect(d.source, 'gps');
    expect(d.addressText, 'Near the bridge');
    expect(d.contactName, 'Ana');
    expect(d.contactPhone, '0917 123 4567');
    await store.clear();
    expect(await store.load(), isNull);
  });

  test('a corrupt value loads as no draft', () async {
    SharedPreferences.setMockInitialValues({'report_draft_v1': '{not json'});
    expect(await ReportDraftStore().load(), isNull);
  });

  test('draft json has no photo field', () {
    expect(const ReportDraft().toJson().keys, isNot(contains('photos')));
  });
}
