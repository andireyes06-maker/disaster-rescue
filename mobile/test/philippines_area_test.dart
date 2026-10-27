import 'package:disaster_rescue/data/geo.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  // The same points as api/test/domain/serviceArea.test.js. The two rules must agree.
  const inside = {
    'Manila': [14.5995, 120.9842],
    'Guiguinto, Bulacan': [14.8333, 120.8333],
    'Davao': [7.1907, 125.4553],
    'Batanes': [20.45, 121.97],
    'Tawi-Tawi': [5.03, 119.77],
    'Palawan': [9.8, 118.7],
    'Turtle Islands (Taganak)': [6.08, 118.32],
    'Davao Oriental': [6.9, 126.5],
  };
  const outside = {
    'Kota Kinabalu, Sabah': [5.98, 116.07],
    'Sandakan, Sabah': [5.84, 118.12],
    'Kudat, Sabah': [6.88, 116.84],
    'Taipei, Taiwan': [25.03, 121.56],
    'Tokyo': [35.68, 139.69],
    'Hanoi': [21.03, 105.85],
    'Kuala Lumpur': [3.14, 101.69],
    'Palau': [7.5, 134.5],
    'Lahad Datu, Sabah': [5.03, 118.33],
    'Semporna, Sabah': [4.48, 118.6],
  };

  test('inside the Philippines is accepted', () {
    for (final e in inside.entries) {
      expect(inPhilippines(e.value[0], e.value[1]), isTrue, reason: e.key);
    }
  });

  test('outside the Philippines is refused', () {
    for (final e in outside.entries) {
      expect(inPhilippines(e.value[0], e.value[1]), isFalse, reason: e.key);
    }
    expect(inPhilippines(double.nan, 120), isFalse);
  });
}
