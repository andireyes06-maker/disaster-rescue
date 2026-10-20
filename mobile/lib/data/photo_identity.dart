import 'dart:convert';

import 'package:crypto/crypto.dart';

import 'report_models.dart';

/// SHA-256 hex digest of a photo's bytes. Two photos with the same count but different bytes get
/// different digests, so a swapped photo starts a new submission (F02).
String photoContentDigest(PickedPhoto photo) => sha256.convert(photo.bytes).toString();

/// Identity of one report version: the draft fields plus the ordered photo digests. Same signature
/// means the same submission, so the in-memory key is reused. Nothing here is persisted.
String submissionSignature(ReportDraft draft, List<PickedPhoto> photos) => jsonEncode({
      ...draft.toJson(),
      'photos': [for (final p in photos) photoContentDigest(p)],
    });
