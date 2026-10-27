import 'package:flutter_test/flutter_test.dart';
import 'package:disaster_rescue/data/place_name.dart';
import 'package:disaster_rescue/features/report/location_picker.dart';

void main() {
  group('placeNameFrom', () {
    test('names the neighbourhood near the city', () {
      expect(
        placeNameFrom({
          'address': {'suburb': 'Commonwealth', 'city': 'Quezon City'},
        }),
        'Near Commonwealth, Quezon City',
      );
    });

    test('falls back to the road when there is no neighbourhood', () {
      expect(
        placeNameFrom({
          'address': {'road': 'Commonwealth Avenue', 'town': 'Bulacan'},
        }),
        'Near Commonwealth Avenue, Bulacan',
      );
    });

    test('does not repeat the city when it is the same as the local name', () {
      expect(
        placeNameFrom({
          'address': {'suburb': 'Malolos', 'city': 'Malolos'},
        }),
        'Near Malolos',
      );
    });

    test('returns only the wider area when no local name is known', () {
      expect(
        placeNameFrom({
          'address': {'state': 'Bulacan'},
        }),
        'Bulacan',
      );
    });

    test('returns null when the reply has no usable address', () {
      expect(placeNameFrom(null), isNull);
      expect(placeNameFrom({'error': 'Unable to geocode'}), isNull);
      expect(placeNameFrom({'address': {'road': '  '}}), isNull);
    });
  });

  group('placeLineFor', () {
    test('shows the place name when there is one', () {
      expect(placeLineFor('Near Malolos', 'manual'), 'Near Malolos');
    });

    test('never shows raw coordinates when the name is missing', () {
      expect(placeLineFor(null, 'gps'), 'Pinned at your current location');
      expect(placeLineFor('  ', 'manual'), 'Pinned on the map');
    });
  });
}
