import 'package:disaster_rescue/data/services.dart';
import 'package:disaster_rescue/features/report/location_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';

class _OffLocation implements LocationService {
  @override
  Future<LocationResult> current() async => const LocationResult(LocationStatus.serviceOff);
}

void main() {
  testWidgets('with location off the map still opens and says the reach cannot be checked', (tester) async {
    await tester.pumpWidget(
      Provider<LocationService>.value(
        value: _OffLocation(),
        child: MaterialApp(
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                onPressed: () => Navigator.of(context).push<LatLng>(
                  MaterialPageRoute(builder: (_) => const MapPickerPage()),
                ),
                child: const Text('open'),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Location is off, so the reach limit cannot be checked'), findsOneWidget);
    expect(find.text('Tap the map where help is needed'), findsOneWidget);
    expect(find.textContaining('from you'), findsNothing);
  });

  group('withinReach', () {
    const here = LatLng(14.8333, 120.8333);

    test('with no location fix every point is accepted, because there is no reference', () {
      expect(withinReach(null, const LatLng(14.9, 120.9), 500), isTrue);
    });

    test('with a location fix, only points inside the radius are accepted', () {
      expect(withinReach(here, here, 500), isTrue);
      // About 1.1 km north of here: outside a 500 m reach.
      expect(withinReach(here, const LatLng(14.8433, 120.8333), 500), isFalse);
      // About 110 m north: inside.
      expect(withinReach(here, const LatLng(14.8343, 120.8333), 500), isTrue);
    });
  });
}
