import 'package:disaster_rescue/data/report_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('a saved draft keeps the town or city of its pin', () {
    const draft = ReportDraft(type: 'flood', lat: 14.8, lng: 120.8, locality: 'Guiguinto', contactName: '');
    final restored = ReportDraft.fromJson(draft.toJson());
    expect(restored.locality, 'Guiguinto');
  });

  test('an older draft without a locality still loads', () {
    final restored = ReportDraft.fromJson({'type': 'flood', 'description': '', 'addressText': '', 'contactName': '', 'contactPhone': ''});
    expect(restored.locality, isNull);
  });
}
