import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/auth_state.dart';
import '../../../core/env/app_env.dart';
import '../../../data/providers.dart';
import '../../../data/supabase/supabase_gateway.dart';
import '../../../data/sync/conflict_store.dart';
import '../../../domain/logic/default_categories.g.dart';
import '../../../domain/logic/expense_list_logic.dart';
import '../../../domain/logic/settlement.dart';
import '../../../domain/logic/sync_merge.dart';
import '../../../domain/models/category.dart';
import '../../../domain/models/expense.dart';
import '../../../domain/models/group.dart';
import '../../../domain/models/member.dart';
import '../../../domain/models/trip.dart';
import '../../trip_details/application/trip_nav.dart';

final tripMembersProvider = StreamProvider.family<List<Member>, String>(
  (ref, tripId) => ref.watch(memberRepositoryProvider).watchMembers(tripId),
);

final allMembersProvider = StreamProvider<List<Member>>((ref) => ref.watch(memberRepositoryProvider).watchAll());

final tripGroupsProvider = StreamProvider.family<List<Group>, String>(
  (ref, tripId) => ref.watch(memberRepositoryProvider).watchGroups(tripId),
);

final tripExpensesProvider = StreamProvider.family<List<Expense>, String>(
  (ref, tripId) => ref.watch(expenseRepositoryProvider).watchActive(tripId),
);

final allActiveExpensesProvider = StreamProvider<List<Expense>>(
  (ref) => ref.watch(expenseRepositoryProvider).watchAllActive(),
);

final recycledExpensesProvider = StreamProvider.family<List<Expense>, String>(
  (ref, tripId) => ref.watch(expenseRepositoryProvider).watchRecycled(tripId),
);

/// Built-in categories + the trip's custom ones, in the trip's saved order.
final tripCategoriesProvider = Provider.family<List<Category>, String>((ref, tripId) {
  final custom = ref.watch(_customCategoriesProvider(tripId)).value ?? const <Category>[];
  final order = ref.watch(tripProvider(tripId)).value?.categoryOrder;
  return orderedCategories([...defaultCategories, ...custom], order);
});

final _customCategoriesProvider = StreamProvider.family<List<Category>, String>(
  (ref, tripId) => ref.watch(categoryRepositoryProvider).watch(tripId),
);

/// The signed-in user's member row on this trip (null for guests / unclaimed).
final myMemberIdProvider = Provider.family<String?, String>((ref, tripId) {
  final uid = ref.watch(authStateProvider).userId;
  if (uid == null) return null;
  final members = ref.watch(tripMembersProvider(tripId)).value ?? const <Member>[];
  for (final m in members) {
    if (!m.archived && m.linkedUserId == uid) return m.id;
  }
  return null;
});

/// Whether the signed-in account is a Superadmin (asked once per sign-in; the server decides, a failure means no).
/// A superadmin has the owner's powers on every trip, exactly as the server's `is_trip_admin` treats them.
final isSuperadminProvider = FutureProvider<bool>((ref) async {
  final uid = ref.watch(authStateProvider.select((a) => a.userId));
  if (uid == null || !AppEnv.current.hasBackend) return false;
  try {
    return await ref.watch(supabaseGatewayProvider).client.rpc<dynamic>('is_superadmin') == true;
  } catch (_) {
    return false;
  }
});

/// Who may change the trip's own rules (simplify debts, freeze, archive): only the owner or a superadmin, because
/// that is all the server accepts for a `trips` update.
final canEditTripRulesProvider = Provider.family<bool, String>((ref, tripId) {
  final uid = ref.watch(authStateProvider).userId;
  final trip = ref.watch(tripProvider(tripId)).value;
  if (uid == null || trip == null) return false;
  return trip.ownerId == uid || (ref.watch(isSuperadminProvider).value ?? false);
});

/// Owner, a superadmin, or a member the trip lists as admin.
final isTripAdminProvider = Provider.family<bool, String>((ref, tripId) {
  final uid = ref.watch(authStateProvider).userId;
  final trip = ref.watch(tripProvider(tripId)).value;
  if (uid == null || trip == null) return false;
  if (trip.ownerId == uid || (ref.watch(isSuperadminProvider).value ?? false)) return true;
  final me = ref.watch(myMemberIdProvider(tripId));
  return me != null && trip.adminMemberIds.contains(me);
});

class ExpenseFiltersNotifier extends Notifier<ExpenseFilters> {
  ExpenseFiltersNotifier(this.tripId);
  final String tripId;

  @override
  ExpenseFilters build() => const ExpenseFilters();

  void set(ExpenseFilters f) => state = f;
  void clear() => state = const ExpenseFilters();
}

final expenseFiltersProvider = NotifierProvider.family<ExpenseFiltersNotifier, ExpenseFilters, String>(
  ExpenseFiltersNotifier.new,
);

final filteredExpensesProvider = Provider.family<List<Expense>, String>((ref, tripId) {
  final all = ref.watch(tripExpensesProvider(tripId)).value ?? const <Expense>[];
  return filterExpenses(
    all,
    ref.watch(expenseFiltersProvider(tripId)),
    myMemberId: ref.watch(myMemberIdProvider(tripId)),
  );
});

/// Entities with unsynced local changes (rows show a "pending sync" badge).
final dirtyIdsProvider = StreamProvider<Set<String>>(
  (ref) => ref.watch(outboxStoreProvider).watchAll().map((items) => collectDirtyIds(items.map((i) => i.toQueuedOp()))),
);

final conflictIdsProvider = Provider.family<Set<String>, String>(
  (ref, tripId) => {for (final c in ref.watch(conflictStoreProvider)[tripId] ?? const <ExpenseConflict>[]) c.expenseId},
);

/// Balances (for the "you owe / you're owed" chip and the ledger).
final tripSettlementProvider = Provider.family<SettlementResult?, String>((ref, tripId) {
  final trip = ref.watch(tripProvider(tripId)).value;
  final members = ref.watch(tripMembersProvider(tripId)).value;
  final expenses = ref.watch(tripExpensesProvider(tripId)).value;
  if (trip == null || members == null || expenses == null) return null;
  final groups = ref.watch(tripGroupsProvider(tripId)).value ?? const <Group>[];
  return calculateSettlements(trip, {for (final m in members) m.id: m}, expenses, groups, trip.simplifyDebts);
});

/// How many payments the trip needs with and without "simplify debts", so the switch can show what it does.
final tripSettlementCountsProvider = Provider.family<({int simplified, int direct})?, String>((ref, tripId) {
  final trip = ref.watch(tripProvider(tripId)).value;
  final members = ref.watch(tripMembersProvider(tripId)).value;
  final expenses = ref.watch(tripExpensesProvider(tripId)).value;
  if (trip == null || members == null || expenses == null) return null;
  final groups = ref.watch(tripGroupsProvider(tripId)).value ?? const <Group>[];
  final byId = {for (final m in members) m.id: m};
  int count(bool simplify) => calculateSettlements(trip, byId, expenses, groups, simplify).transfers.length;
  return (simplified: count(true), direct: count(false));
});

/// Active (non-archived) members, the people a split can involve.
final visibleMembersProvider = Provider.family<List<Member>, String>((ref, tripId) {
  final trip = ref.watch(tripProvider(tripId)).value;
  final members = ref.watch(tripMembersProvider(tripId)).value ?? const <Member>[];
  if (trip == null) return members.where((m) => !m.archived).toList();
  return [
    for (final m in members)
      if (!m.archived && trip.memberIds.contains(m.id)) m,
  ];
});

/// Needed by [Trip] consumers that only have an id.
final tripOrNullProvider = Provider.family<Trip?, String>((ref, id) => ref.watch(tripProvider(id)).value);
