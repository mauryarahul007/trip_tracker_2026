import '../models/category.dart';
import '../logic/expense_form_logic.dart' show ExpenseSubmission;
import '../models/checklist_item.dart';
import '../models/expense.dart';
import '../models/expense_io.dart';
import '../models/group.dart';
import '../models/join_share.dart';
import '../models/member.dart';
import '../models/travel_pass.dart';
import '../models/trip.dart';
import '../models/trip_message.dart';
import '../models/trip_note.dart';

/// UI reads only these streams (backed by local storage); writes are
/// optimistic: they update local state and queue a sync mutation atomically.
abstract class TripRepository {
  Stream<List<Trip>> watchTrips();
  Stream<Trip?> watchTrip(String id);

  /// Creates the trip plus its owner member locally; returns the new trip id.
  Future<String> createTrip({
    required String name,
    required String startDate,
    required String endDate,
    required String baseCurrency,
    required String ownerId,
    required String creatorName,
    String? destination,
  });

  /// Optimistic archive / freeze / close (any subset). Owner/admin only on the server (RLS).
  Future<void> setTripState(String id, {bool? archived, bool? frozen, bool? closed});

  /// Removes the trip locally now and on the server on next sync (cascades).
  Future<void> deleteTrip(String id);

  // Trip-level money settings (optimistic + queued).
  Future<void> setSimplifyDebts(String id, bool value);

  /// Null or <= 0 turns the approval gate off for this trip.
  Future<void> setApprovalThreshold(String id, double? threshold);
  Future<void> setCategoryOrder(String id, List<String> order);

  /// Per-trip FX overrides + markup. Any participant may write (collab RPC).
  Future<void> setFxConfig(String id, TripFxConfig config);
  Future<void> setSplitExclusionDefaults(String id, Map<String, List<String>> defaults);

  /// Organizer / contributor / viewer. Owner/admin write (trips.member_roles).
  Future<void> setMemberRole(String id, String memberId, String role);

  /// Checklist, notes, passes, and stops. Any participant may write (collab RPC).
  Future<void> setChecklist(String id, List<ChecklistItem> items);
  Future<void> setNotes(String id, List<TripNote> notes);
  Future<void> setPasses(String id, List<TravelPass> passes);
  Future<void> setStops(String id, List<TripStop> stops);
}

abstract class MessageRepository {
  Stream<List<TripMessage>> watch(String tripId);
  Future<void> send({
    required String tripId,
    required String memberId,
    required String senderName,
    required String body,
  });
  Future<void> edit(String id, String body);
  Future<void> delete(String id);
}

abstract class ExpenseRepository {
  Stream<List<Expense>> watchActive(String tripId);
  Stream<List<Expense>> watchRecycled(String tripId);
  Stream<Expense?> watchExpense(String id);
  Future<void> add(Expense e);
  Future<void> update(Expense e);

  /// The form's save path (port of the store's addExpense/updateExpense):
  /// blocks frozen/closed trips, resolves shares, applies the approval rule,
  /// writes locally and queues the sync (receipt upload + chat card ride along).
  /// [editingId] edits that expense; otherwise a new one is created with [expenseId]
  /// (so a staged receipt can be named after it) or a fresh id.
  Future<SaveOutcome> submit(
    ExpenseSubmission s, {
    required String tripId,
    required String userId,
    String? editingId,
    String? expenseId,
    StagedReceipt? receipt,
    bool approvalThresholdEnabled = false,
    bool isSuperadmin = false,
    bool postChatCard = false,
  });

  Future<void> delete(String id, {required String userId});
  Future<void> restore(String id);
  Future<void> permanentlyDelete(String id);
  Future<void> emptyRecycleBin(String tripId);

  // Online-only, like the web: they need the server's rules (RPCs) and throw
  // [ExpenseActionException] when offline or refused.
  Future<void> flagDispute(String id, {required String userId, String? note, bool postChatCard = false});
  Future<void> resolveDispute(String id, {required String userId, bool postChatCard = false});
  Future<void> confirmSettlement(String id, {required String userId});
  Future<void> approve(String id, {required String userId});

  /// Every active expense on this device (cross-trip search).
  Stream<List<Expense>> watchAllActive();

  /// Conflict: keep the server copy and drop the queued local edit.
  Future<void> adoptServerCopy(Expense server);
}

abstract class MemberRepository {
  Stream<List<Member>> watchMembers(String tripId);
  Stream<List<Member>> watchAll();
  Stream<List<Group>> watchGroups(String tripId);
  Future<String> addMember(String tripId, String name, {String? email, String? linkedUserId});
  Future<void> updateMember(String id, {String? name, String? email, String? joinDate, String? leaveDate});
  Future<void> setArchived(String id, bool archived);

  /// Removes the member and cascades group dissolve/rename like the web store.
  Future<void> deleteMember(String id);
  Future<String> createGroup(String tripId, String name, List<String> memberIds);
  Future<void> updateGroup(String id, String name, List<String> memberIds);
  Future<void> deleteGroup(String id);
}

abstract class CategoryRepository {
  Stream<List<Category>> watch(String tripId);
  Future<String> add(String tripId, String name, {String? icon});
  Future<void> rename(String id, String name);
  Future<void> delete(String id);
}

/// Resolved flag layers from `get_resolved_feature_flags` (migration 0064).
class ResolvedFlags {
  final Map<String, bool> global;
  final Map<String, bool> trip;
  final Map<String, bool> user;
  const ResolvedFlags({this.global = const {}, this.trip = const {}, this.user = const {}});
}

abstract class FlagsRepository {
  /// Effective flag value: server layers when cached, else registry defaults.
  Stream<bool> watch(String key, {String? tripId});

  /// Fetches + caches. Offline/failed fetch keeps the last cache (never throws).
  Future<void> refresh({String? tripId});
}

class AuthUser {
  final String id;
  final String? email;
  final String? displayName;

  /// 'google' | 'apple' | 'email' | 'guest' | 'demo'
  final String provider;
  const AuthUser({required this.id, this.email, this.displayName, required this.provider});

  /// Guest/demo sessions never have a Supabase session behind them.
  bool get isLocalOnly => provider == 'guest' || provider == 'demo';
}

enum AuthFailure { signInsPaused, banned, invalidCredentials, notSuperadmin, network, unknown }

class AuthException implements Exception {
  final AuthFailure failure;
  final String message;
  const AuthException(this.failure, this.message);
  @override
  String toString() => 'AuthException(${failure.name}): $message';
}

/// The raw session tokens, used only to hand a superadmin's login to the web Ops Deck.
class AuthTokens {
  const AuthTokens({required this.accessToken, required this.refreshToken, required this.expiresIn});
  final String accessToken;
  final String refreshToken;
  final int expiresIn;
}

abstract class AuthRepository {
  Stream<AuthUser?> watchUser();
  AuthUser? get currentUser;

  /// Fresh session tokens, or null when there is no Supabase session (guest/demo/signed out).
  Future<AuthTokens?> sessionTokens();

  /// Whether the superadmin "signup_gate" app flag is closing new sign-ins.
  Future<bool> signInsPaused();

  Future<void> signInWithEmail(String email, String password);

  /// Email + password sign-in that only succeeds for accounts listed in `superadmins`.
  /// Any other account is signed straight back out and rejected with [AuthFailure.notSuperadmin].
  Future<void> signInAsSuperadmin(String email, String password);
  Future<void> signUpWithEmail(String email, String password, {String? displayName});
  Future<void> resetPassword(String email);

  /// Emits true when the app was opened from a password-recovery link.
  Stream<bool> watchPasswordRecovery();
  Future<void> updatePassword(String newPassword);
  Future<void> signInWithGoogleIdToken(String idToken, {String? nonce});

  /// Browser only: full-page redirect through Supabase's Google OAuth (the native
  /// id-token flow is not available on web). Returns once the redirect is launched.
  Future<void> signInWithGoogleOAuth({required String redirectTo});
  Future<void> signInWithAppleIdToken(String idToken, {String? nonce, String? fullName});
  Future<void> signInAsGuest({String displayName = 'Traveler'});
  Future<void> signInAsDemo();

  /// Profile name (auth metadata + profiles row; local-only identities just rename).
  Future<void> updateDisplayName(String name);

  /// Clears local DB + session and unregisters the push token.
  Future<void> signOut();

  /// Server-side cascade delete, then the same local wipe as [signOut].
  Future<void> deleteAccount();
}

abstract class JoinRepository {
  /// Null for an unknown code. Works signed out.
  Future<JoinPreview?> preview(String code);
  Future<void> recordPreview(String code);

  /// Null for an unknown code. Requires a signed-in (non-guest) user.
  Future<JoinLookup?> lookup(String code);

  /// True if claimed; false if someone else claimed that member first.
  Future<bool> claim(String memberId);
}

abstract class ShareRepository {
  /// Null once the link is off or expired. Works signed out.
  Future<TripShareSummary?> summary(String token);
  Future<void> recordView(String token);
  Future<ShareLinkState> generate(String tripId);
  Future<void> revoke(String tripId);
}
