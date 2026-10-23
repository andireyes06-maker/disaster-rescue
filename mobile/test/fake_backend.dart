import 'dart:async';

import 'package:disaster_rescue/auth/auth_backend.dart';

typedef ClaimsFn = Future<Map<String, dynamic>> Function(bool refresh);

class FakeUser implements BackendUser {
  FakeUser(this.uid, this.claimsFn, {this.deleteFails = false, this.backend});
  @override
  final String uid;
  @override
  String? get email => 'a@b.c';
  ClaimsFn claimsFn;
  bool deleteFails;
  bool deleted = false;
  FakeBackend? backend;
  final List<bool> claimCalls = [];

  @override
  Future<Map<String, dynamic>> claims({required bool refresh}) {
    claimCalls.add(refresh);
    return claimsFn(refresh);
  }

  @override
  Future<String?> idToken() async => 'tok';

  @override
  Future<void> delete() async {
    if (deleteFails) throw Exception('delete failed');
    deleted = true;
    backend?.setUser(null);
  }
}

class FakeBackend implements AuthBackend {
  final StreamController<BackendUser?> _c = StreamController<BackendUser?>.broadcast();
  FakeUser? current;
  FakeUser? nextCreated;
  FakeUser? nextSignIn;
  int signOuts = 0;
  final resetEmails = <String>[];
  @override
  Future<void> sendPasswordReset(String email) async { resetEmails.add(email); }

  void setUser(FakeUser? u) {
    current = u;
    _c.add(u);
  }

  void emit(FakeUser? u) => setUser(u);

  @override
  Stream<BackendUser?> authStateChanges() => _c.stream;

  @override
  BackendUser? get currentUser => current;

  @override
  Future<BackendUser> signIn(String email, String password) async {
    final u = nextSignIn!..backend = this;
    setUser(u);
    return u;
  }

  @override
  Future<BackendUser> createUser(String email, String password) async {
    final u = nextCreated!..backend = this;
    setUser(u);
    return u;
  }

  @override
  Future<void> signOut() async {
    signOuts++;
    setUser(null);
  }
}
