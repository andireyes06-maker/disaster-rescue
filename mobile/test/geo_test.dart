import 'package:disaster_rescue/data/geo.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('the same point is zero meters away', () {
    expect(distanceMeters(14.5995, 120.9842, 14.5995, 120.9842), 0);
  });

  test('0.001 degrees of latitude is about 111 meters', () {
    final d = distanceMeters(14.0, 120.0, 14.001, 120.0);
    expect(d, closeTo(111.2, 0.5));
  });

  test('a point about 600 meters away is over the responder limit', () {
    final d = distanceMeters(14.5995, 120.9842, 14.6049, 120.9842);
    expect(d, greaterThan(kMaxResponderDistanceMeters));
  });

  test('formatMeters rounds to whole meters', () {
    expect(formatMeters(499.6), '500 m');
  });
}
