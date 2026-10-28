import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:disaster_rescue/theme/product_navigation.dart';

void main() {
  testWidgets('ProductMark shows the logo image and no plus icon', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(home: Scaffold(body: ProductMark(size: 40))),
    );
    expect(find.byType(Image), findsOneWidget);
    expect(find.byIcon(Icons.add_rounded), findsNothing);
    final box = tester.getSize(find.byType(Image));
    expect(box.height, 40);
    expect(box.width / box.height, closeTo(712 / 200, 0.01));
  });
}
