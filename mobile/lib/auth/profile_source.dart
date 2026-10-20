import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';

import 'profile_sync.dart';

/// Live view of the signed-in account's canonical profile. A seam, so the repository can be tested without Firestore.
abstract class ProfileSource {
  Stream<ProfileState> watch(String uid);
}

/// Reads `users/{uid}` through the rules. The rules let a user read their own profile only while the account is active,
/// so a refused read is treated as a deactivated account.
class FirestoreProfileSource implements ProfileSource {
  FirestoreProfileSource(this._db);
  final FirebaseFirestore _db;

  @override
  Stream<ProfileState> watch(String uid) {
    return _db
        .doc('users/$uid')
        .snapshots()
        // An empty answer from the local cache (offline, profile not cached) is not proof the profile is missing.
        .where((snap) => snap.exists || !snap.metadata.isFromCache)
        .map<ProfileState>((snap) {
          if (!snap.exists) return const ProfileMissing();
          final d = snap.data() ?? const <String, dynamic>{};
          return ProfileValue(
            active: d['active'] == true,
            role: d['role'] as String?,
            team: d['team'] as String?,
            authSyncPending: d['authSyncPending'] == true,
          );
        })
        .transform(StreamTransformer<ProfileState, ProfileState>.fromHandlers(
          handleError: (error, stack, sink) {
            // Only a refusal changes the state. Offline or unavailable errors keep the last known state.
            if (error is FirebaseException && error.code == 'permission-denied') {
              sink.add(const ProfileDenied());
            }
          },
        ));
  }
}
