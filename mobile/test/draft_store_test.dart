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
    // Contact fields are not persisted, so they come back empty.
    expect(d.contactName, '');
    expect(d.contactPhone, '');
    await store.clear();
    expect(await store.load(), isNull);
  });

  test('a corrupt value loads as no draft', () async {
    SharedPreferences.setMockInitialValues({'report_draft_v2:res-a': '{not json'});
    expect(await ReportDraftStore(currentUid: () => 'res-a').load(), isNull);
  });

  test('the stored draft has no contact name or phone', () async {
    final store = ReportDraftStore(currentUid: () => 'res-a');
    await store.save(const ReportDraft(type: 'fire', description: 'Smoke', lat: 1, lng: 1, source: 'gps', addressText: 'Gate 2', contactName: 'Ana', contactPhone: '09170000001'));
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('report_draft_v2:res-a')!;
    expect(raw, isNot(contains('Ana')));
    expect(raw, isNot(contains('09170000001')));
    expect(raw, isNot(contains('contactName')));
    expect(raw, isNot(contains('contactPhone')));
    expect((await store.load())?.addressText, 'Gate 2');
  });

  test('a draft stored by an earlier build loses its contact fields on load', () async {
    SharedPreferences.setMockInitialValues({'report_draft_v2:res-a': '{"type":"fire","description":"Smoke","lat":1,"lng":1,"source":"gps","addressText":"","contactName":"Ana","contactPhone":"09170000001"}'});
    final store = ReportDraftStore(currentUid: () => 'res-a');
    final d = (await store.load())!;
    expect(d.description, 'Smoke');
    expect(d.contactPhone, '');
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getString('report_draft_v2:res-a'), isNot(contains('09170000001')));
  });

  test('draft json has no photo field', () {
    expect(const ReportDraft().toJson().keys, isNot(contains('photos')));
  });

  test('a draft saved by one account is not visible to another account on the same phone (M02)', () async {
    String? who = 'res-a';
    final store = ReportDraftStore(currentUid: () => who);
    await store.save(const ReportDraft(type: 'fire', description: 'Smoke near the market', lat: 14.5, lng: 120.9, source: 'gps', addressText: '', contactName: 'Ana', contactPhone: '09170000001'));
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
