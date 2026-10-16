import 'package:disaster_rescue/data/report_models.dart';
import 'package:disaster_rescue/features/report/report_draft_store.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('save, load, clear round trip', () async {
    final store = ReportDraftStore(currentUid: () => 'res-a');
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
    final d = (await ReportDraftStore(currentUid: () => 'res-a').load())!;
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
    SharedPreferences.setMockInitialValues({'report_draft_v2:res-a': '{not json'});
    expect(await ReportDraftStore(currentUid: () => 'res-a').load(), isNull);
  });

  test('draft json has no photo field', () {
    expect(const ReportDraft().toJson().keys, isNot(contains('photos')));
  });

  test('a draft saved by one account is not visible to another account on the same phone (M02)', () async {
    String? who = 'res-a';
    final store = ReportDraftStore(currentUid: () => who);
    await store.save(const ReportDraft(type: 'fire', description: 'Smoke near the market', lat: 14.5, lng: 120.9, source: 'gps', addressText: '', contactName: 'Ana', contactPhone: '09171234567'));
    who = 'res-b';
    expect(await store.load(), isNull);
    who = 'res-a';
    expect((await store.load())?.description, 'Smoke near the market');
  });

  test('with nobody signed in, nothing is saved or loaded', () async {
    final store = ReportDraftStore(currentUid: () => null);
    await store.save(const ReportDraft(type: 'fire', description: 'x', lat: 1, lng: 1, source: 'gps', addressText: '', contactName: '', contactPhone: ''));
    expect(await store.load(), isNull);
  });

  test('a legacy ownerless draft is removed, not adopted by the next account (M02)', () async {
    SharedPreferences.setMockInitialValues({'report_draft_v1': '{"type":"flood","description":"old","lat":1,"lng":1,"source":"gps","addressText":"","contactName":"","contactPhone":""}'});
    expect(await ReportDraftStore(currentUid: () => 'res-b').load(), isNull);
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getString('report_draft_v1'), isNull);
  });
}
