import 'dart:math';

final _random = Random.secure();

/// A fresh key for one report submission attempt. The API uses it so a retried request
/// with the same key never creates a second report (M04). 128 bits, hex encoded.
String newSubmissionKey() => List.generate(
  16,
  (_) => _random.nextInt(256).toRadixString(16).padLeft(2, '0'),
).join();
