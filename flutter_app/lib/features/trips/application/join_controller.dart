import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/auth_state.dart';
import '../../../core/env/app_env.dart';
import '../../../data/providers.dart';
import '../../../domain/models/join_share.dart';

enum JoinStatus { loading, invalid, preview, ready, alreadyIn, allClaimed, claiming, error }

class JoinState {
  const JoinState({
    this.status = JoinStatus.loading,
    this.preview,
    this.lookup,
    this.message,
    this.lockoutSeconds,
    this.claimedByOther = false,
    this.joinedTripId,
  });

  final JoinStatus status;
  final JoinPreview? preview;
  final JoinLookup? lookup;
  final String? message;
  final int? lockoutSeconds;

  /// Last claim lost a race; the list was reloaded.
  final bool claimedByOther;

  /// Set after a successful claim: the screen navigates into the trip.
  final String? joinedTripId;

  JoinState copyWith({
    JoinStatus? status,
    JoinPreview? preview,
    JoinLookup? lookup,
    String? message,
    int? lockoutSeconds,
    bool clearLockout = false,
    bool? claimedByOther,
    String? joinedTripId,
  }) =>
      JoinState(
        status: status ?? this.status,
        preview: preview ?? this.preview,
        lookup: lookup ?? this.lookup,
        message: message ?? this.message,
        lockoutSeconds: clearLockout ? null : (lockoutSeconds ?? this.lockoutSeconds),
        claimedByOther: claimedByOther ?? this.claimedByOther,
        joinedTripId: joinedTripId ?? this.joinedTripId,
      );
}

/// After a claim, pull the new trip so it is on the device before we open it.
/// Overridable in tests.
final afterJoinSyncProvider = Provider<Future<void> Function(String tripId)>((ref) => (tripId) async {
      if (!AppEnv.current.hasBackend) return;
      try {
        await ref.read(tripPullSyncProvider).syncTrip(tripId);
      } catch (_) {
        // The trip still opens; the next sync fills it in.
      }
    });

/// Invite flow: signed out -> public preview; signed in -> lookup + claim.
/// Guests have no real account, so they get the preview and a sign-in prompt.
class JoinController extends Notifier<JoinState> {
  JoinController(this.code);
  final String code;

  Timer? _countdown;
  bool _signedIn = false;

  @override
  JoinState build() {
    final auth = ref.watch(authStateProvider);
    _signedIn = auth.isAuthenticated && !auth.isLocalOnly;
    ref.onDispose(() => _countdown?.cancel());
    Future<void>.microtask(load);
    return const JoinState();
  }

  Future<void> load() async {
    if (code.isEmpty) {
      state = const JoinState(status: JoinStatus.invalid);
      return;
    }
    state = const JoinState();
    final repo = ref.read(joinRepositoryProvider);
    try {
      if (_signedIn) {
        final lookup = await repo.lookup(code);
        if (lookup == null) {
          state = const JoinState(status: JoinStatus.invalid);
        } else if (lookup.alreadyIn) {
          state = JoinState(status: JoinStatus.alreadyIn, lookup: lookup);
        } else if (lookup.unclaimedMembers.isEmpty) {
          state = JoinState(status: JoinStatus.allClaimed, lookup: lookup);
        } else {
          state = JoinState(status: JoinStatus.ready, lookup: lookup);
        }
      } else {
        final preview = await repo.preview(code);
        if (preview == null) {
          state = const JoinState(status: JoinStatus.invalid);
        } else {
          state = JoinState(status: JoinStatus.preview, preview: preview);
          unawaited(repo.recordPreview(code));
        }
      }
    } on InviteException catch (e) {
      _fail(e.message, e.lockoutSeconds);
    } catch (_) {
      _fail('', null);
    }
  }

  void _fail(String message, int? lockout) {
    state = JoinState(status: JoinStatus.error, message: message, lockoutSeconds: lockout);
    _countdown?.cancel();
    if (lockout != null && lockout > 0) {
      _countdown = Timer.periodic(const Duration(seconds: 1), (t) {
        final left = (state.lockoutSeconds ?? 0) - 1;
        if (left <= 0) {
          t.cancel();
          state = state.copyWith(clearLockout: true);
        } else {
          state = state.copyWith(lockoutSeconds: left);
        }
      });
    }
  }

  Future<void> claim(String memberId) async {
    final lookup = state.lookup;
    if (lookup == null || state.status == JoinStatus.claiming) return;
    state = state.copyWith(status: JoinStatus.claiming);
    try {
      final ok = await ref.read(joinRepositoryProvider).claim(memberId);
      if (!ok) {
        await load();
        state = state.copyWith(claimedByOther: true);
        return;
      }
      await ref.read(afterJoinSyncProvider)(lookup.tripId);
      state = state.copyWith(status: JoinStatus.alreadyIn, joinedTripId: lookup.tripId);
    } on InviteException catch (e) {
      state = state.copyWith(status: JoinStatus.ready, message: e.message);
    } catch (_) {
      state = state.copyWith(status: JoinStatus.ready, message: '');
    }
  }
}

final joinControllerProvider = NotifierProvider.autoDispose.family<JoinController, JoinState, String>(JoinController.new);
