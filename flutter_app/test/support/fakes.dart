import 'dart:async';

import 'package:trip_tracker/app/deep_link_listener.dart';
import 'package:trip_tracker/core/platform/share_service.dart';
import 'package:trip_tracker/data/auth/biometric_service.dart';
import 'package:trip_tracker/domain/models/join_share.dart';
import 'package:trip_tracker/domain/logic/flag_defaults.g.dart';
import 'package:trip_tracker/data/auth/social_auth.dart';
import 'package:trip_tracker/domain/repositories/repositories.dart';

/// In-memory [AuthRepository] for widget/router tests.
class FakeAuthRepository implements AuthRepository {
  FakeAuthRepository({AuthUser? user, this.paused = false}) : _current = user;

  AuthUser? _current;
  bool paused;
  AuthException? failNext;
  final calls = <String>[];
  final _c = StreamController<AuthUser?>.broadcast();

  void _set(AuthUser? u) {
    _current = u;
    _c.add(u);
  }

  @override
  AuthUser? get currentUser => _current;

  @override
  Stream<AuthUser?> watchUser() async* {
    yield _current;
    yield* _c.stream;
  }

  @override
  Future<bool> signInsPaused() async => paused;

  Future<void> _auth(String call, AuthUser user) async {
    calls.add(call);
    final f = failNext;
    if (f != null) {
      failNext = null;
      throw f;
    }
    _set(user);
  }

  static const _u = AuthUser(id: 'u1', email: 'a@b.c', displayName: 'Asha', provider: 'email');

  @override
  Future<void> signInWithEmail(String email, String password) => _auth('email:$email', _u);
  @override
  Future<void> signUpWithEmail(String email, String password, {String? displayName}) => _auth('signup:$email', _u);
  @override
  Future<void> resetPassword(String email) async => calls.add('reset:$email');
  // ignore: close_sinks
  final recovery = StreamController<bool>.broadcast();
  @override
  Stream<bool> watchPasswordRecovery() => recovery.stream;
  @override
  Future<void> updatePassword(String newPassword) async => calls.add('updatePassword');

  @override
  Future<void> signInWithGoogleIdToken(String idToken, {String? nonce}) => _auth('google', _u);
  @override
  Future<void> signInWithAppleIdToken(String idToken, {String? nonce, String? fullName}) => _auth('apple', _u);
  @override
  Future<void> signInAsGuest({String displayName = 'Traveler'}) =>
      _auth('guest', AuthUser(id: 'guest', displayName: displayName, provider: 'guest'));
  @override
  Future<void> signInAsDemo() => _auth('demo', const AuthUser(id: 'demo', provider: 'demo'));
  @override
  Future<void> signOut() async {
    calls.add('signOut');
    _set(null);
  }

  @override
  Future<void> deleteAccount() async {
    calls.add('delete');
    _set(null);
  }
}

class FakeSocialAuth implements SocialAuth {
  FakeSocialAuth({this.hasApple = false});
  final bool hasApple;
  SocialCredential? googleResult = const SocialCredential(idToken: 'g-token');
  SocialCredential? appleResult = const SocialCredential(idToken: 'a-token', nonce: 'n', fullName: 'Asha K');
  int googleCalls = 0;

  @override
  bool get appleAvailable => hasApple;
  @override
  Future<SocialCredential?> google() async {
    googleCalls++;
    return googleResult;
  }

  @override
  Future<SocialCredential?> apple() async => appleResult;
}

class FakeBiometric implements BiometricService {
  bool available = true;
  bool passes = true;
  int prompts = 0;
  @override
  Future<bool> isAvailable() async => available;
  @override
  Future<bool> authenticate(String reason) async {
    prompts++;
    return passes;
  }
}

class FakeFlags implements FlagsRepository {
  FakeFlags([this.on = const {}, this.off = const {}]);

  /// Forced on/off; anything else resolves to the registry default, like the real repo.
  final Set<String> on;
  final Set<String> off;
  @override
  Stream<bool> watch(String key, {String? tripId}) =>
      Stream.value(on.contains(key) ? true : off.contains(key) ? false : (defaultFeatureFlags[key] ?? false));
  @override
  Future<void> refresh({String? tripId}) async {}
}

class FakeJoinRepository implements JoinRepository {
  JoinPreview? previewResult = const JoinPreview(tripName: 'Goa Weekend', startDate: '2026-12-01', endDate: '2026-12-05', memberFirstNames: ['Asha', 'Ben']);
  JoinLookup? lookupResult = const JoinLookup(
    tripId: 'trip-1',
    tripName: 'Goa Weekend',
    isAdmin: false,
    unclaimedMembers: [UnclaimedMember(id: 'm1', name: 'Asha K'), UnclaimedMember(id: 'm2', name: 'Ben')],
  );
  Object? error; // thrown by preview/lookup when set (once)
  bool claimResult = true;
  final calls = <String>[];

  @override
  Future<JoinPreview?> preview(String code) async {
    calls.add('preview:$code');
    final e = error;
    if (e != null) {
      error = null;
      throw e;
    }
    return previewResult;
  }

  @override
  Future<void> recordPreview(String code) async => calls.add('recordPreview:$code');

  @override
  Future<JoinLookup?> lookup(String code) async {
    calls.add('lookup:$code');
    final e = error;
    if (e != null) {
      error = null;
      throw e;
    }
    return lookupResult;
  }

  @override
  Future<bool> claim(String memberId) async {
    calls.add('claim:$memberId');
    return claimResult;
  }
}

class FakeShareRepository implements ShareRepository {
  TripShareSummary? summaryResult = const TripShareSummary(
    tripName: 'Goa Weekend',
    startDate: '2026-12-01',
    endDate: '2026-12-05',
    destination: 'Goa',
    memberCount: 4,
    expenseCount: 12,
    spendByCurrency: {'INR': 24500.5, 'USD': 40},
  );
  Object? summaryError;
  final calls = <String>[];
  bool failWrites = false;

  @override
  Future<TripShareSummary?> summary(String token) async {
    calls.add('summary:$token');
    final e = summaryError;
    if (e != null) throw e;
    return summaryResult;
  }

  @override
  Future<void> recordView(String token) async => calls.add('view:$token');

  @override
  Future<ShareLinkState> generate(String tripId) async {
    calls.add('generate:$tripId');
    if (failWrites) throw Exception('offline');
    return ShareLinkState(token: 'tok-123', enabled: true, expiresAt: DateTime.now().add(const Duration(days: 30)));
  }

  @override
  Future<void> revoke(String tripId) async {
    calls.add('revoke:$tripId');
    if (failWrites) throw Exception('offline');
  }
}

class FakeShareService implements ShareService {
  final copied = <String>[];
  final shared = <String>[];
  @override
  Future<void> copy(String text) async => copied.add(text);
  @override
  Future<void> share(String text, {String? subject}) async => shared.add(text);
}

class FakeDeepLinks implements DeepLinkSource {
  FakeDeepLinks({this.launch});
  final Uri? launch;
  // ignore: close_sinks
  final controller = StreamController<Uri>.broadcast();
  @override
  Future<Uri?> initial() async => launch;
  @override
  Stream<Uri> get stream => controller.stream;
}
