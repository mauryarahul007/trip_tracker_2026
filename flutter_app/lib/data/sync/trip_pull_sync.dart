
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../domain/logic/sync_merge.dart';
import '../../domain/models/expense.dart';
import '../local/app_database.dart';
import '../local/entity_codec.dart';
import '../mappers/row_mappers.dart';
import 'outbox_store.dart';

/// Network side of pull sync; faked in tests.
abstract class TripRemoteReader {
  /// Ids of every trip the signed-in user can see (RLS-scoped).
  Future<List<String>> myTripIds();

  /// `get_trip_changes` payload (SYNC.md §8).
  Future<Map<String, dynamic>> tripChanges(String tripId, DateTime? since);

  /// Soft-deleted expenses still inside the recycle-bin window. `get_trip_changes`
  /// only returns their ids (as tombstones), so the bin needs its own read.
  Future<List<Map<String, dynamic>>> recycledExpenses(String tripId) async => const [];
}

class SupabaseTripReader implements TripRemoteReader {
  SupabaseTripReader(this._client);
  final SupabaseClient _client;

  @override
  Future<List<String>> myTripIds() async {
    final rows = await _client.from('trips').select('id');
    return [for (final r in rows) r['id'] as String];
  }

  @override
  Future<Map<String, dynamic>> tripChanges(String tripId, DateTime? since) async {
    final res = await _client.rpc<dynamic>('get_trip_changes', params: {
      'p_trip_id': tripId,
      if (since != null) 'p_since': since.toUtc().toIso8601String(),
    });
    return Map<String, dynamic>.from(res as Map);
  }

  @override
  Future<List<Map<String, dynamic>>> recycledExpenses(String tripId) async {
    final rows = await _client.from('expenses').select().eq('trip_id', tripId).not('deleted_at', 'is', null);
    return [for (final r in rows) Map<String, dynamic>.from(r)];
  }
}

class PullResult {
  final List<ExpenseConflict> conflicts;
  const PullResult(this.conflicts);
}

/// Initial + incremental sync into Drift. Remote never overwrites entities
/// with pending outbox items ("dirty protection", SYNC.md §3).
class TripPullSync {
  TripPullSync(this._db, this._outbox, this._reader);

  final AppDatabase _db;
  final OutboxStore _outbox;
  final TripRemoteReader _reader;

  /// Clock-skew buffer subtracted from the stored cursor (SYNC.md §8).
  static const skew = Duration(seconds: 10);

  String _cursorKey(String tripId) => 'cursor:$tripId';

  Future<DateTime?> cursor(String tripId) async {
    final row = await (_db.select(_db.syncMetaTable)..where((t) => t.key.equals(_cursorKey(tripId)))).getSingleOrNull();
    return row == null ? null : DateTime.tryParse(row.value);
  }

  /// Syncs every visible trip; drops local trips the server no longer shows
  /// (left/removed) unless they have unsynced work. Per-trip failures are
  /// collected so one bad trip never blocks the rest.
  Future<Map<String, PullResult>> syncAll() async {
    final ids = await _reader.myTripIds();
    final results = <String, PullResult>{};
    for (final id in ids) {
      results[id] = await syncTrip(id);
    }
    final dirty = await _outbox.dirtyIds();
    final local = await _db.select(_db.tripsTable).get();
    for (final t in local) {
      if (!ids.contains(t.id) && !dirty.contains(t.id)) await _deleteTripLocal(t.id);
    }
    return results;
  }

  Future<PullResult> syncTrip(String tripId) async {
    final since = await cursor(tripId);
    final res = await _reader.tripChanges(tripId, since?.subtract(skew));
    // Recycle bin: fetched best-effort; a failure must not block the main sync.
    var recycled = const <Map<String, dynamic>>[];
    try {
      recycled = await _reader.recycledExpenses(tripId);
    } catch (_) {}
    final queue = (await _outbox.all()).map((i) => i.toQueuedOp()).toList();
    final dirty = collectDirtyIds(queue);

    final conflicts = <ExpenseConflict>[];
    await _db.transaction(() async {
      List<Map<String, dynamic>> rows(String k) =>
          [for (final r in (res[k] as List? ?? const <dynamic>[])) Map<String, dynamic>.from(r as Map)];

      final trip = res['trip'];
      if (trip is Map && !dirty.contains(trip['id'])) {
        await _db.into(_db.tripsTable).insertOnConflictUpdate(tripToCompanion(tripFromRow(Map<String, dynamic>.from(trip))));
      }
      for (final r in rows('members')) {
        if (dirty.contains(r['id'])) continue;
        await _db.into(_db.membersTable).insertOnConflictUpdate(memberToCompanion(memberFromRow(r), tripId));
      }
      for (final r in rows('groups')) {
        if (dirty.contains(r['id'])) continue;
        await _db.into(_db.groupsTable).insertOnConflictUpdate(groupToCompanion(groupFromRow(r, const []), tripId));
      }
      // group_members arrives as a full snapshot: replace for clean groups.
      final mappings = rows('group_members');
      if (mappings.isNotEmpty || rows('groups').isNotEmpty) {
        final groupIds = (await (_db.select(_db.groupsTable)..where((g) => g.tripId.equals(tripId))).get())
            .map((g) => g.id)
            .where((id) => !dirty.contains(id))
            .toList();
        await (_db.delete(_db.groupMembersTable)..where((g) => g.groupId.isIn(groupIds))).go();
        for (final m in mappings) {
          if (!groupIds.contains(m['group_id'])) continue;
          await _db.into(_db.groupMembersTable).insertOnConflictUpdate(
              GroupMembersTableCompanion.insert(groupId: m['group_id'] as String, memberId: m['member_id'] as String));
        }
      }
      for (final r in rows('categories')) {
        if (dirty.contains(r['id'])) continue;
        await _db.into(_db.categoriesTable).insertOnConflictUpdate(categoryToCompanion(categoryFromRow(r), tripId));
      }

      final serverExpenses = <Expense>[];
      for (final r in rows('expenses')) {
        serverExpenses.add(expenseFromRow(r));
      }
      final localDirty = <Expense>[];
      for (final s in serverExpenses) {
        if (dirty.contains(s.id)) {
          final e = await (_db.select(_db.expensesTable)..where((x) => x.id.equals(s.id))).getSingleOrNull();
          final local = e == null ? null : entryToExpense(e);
          if (local != null) localDirty.add(local);
          continue;
        }
        await _db.into(_db.expensesTable).insertOnConflictUpdate(expenseToCompanion(s));
      }
      conflicts.addAll(detectExpenseConflicts(localDirty, serverExpenses, dirty, queue));

      final tombstones = ((res['tombstones'] as Map?)?['expenses'] as List?)?.cast<String>() ?? const <String>[];
      final deletable = tombstones.where((id) => !dirty.contains(id)).toList();
      await (_db.delete(_db.expensesTable)..where((x) => x.id.isIn(deletable))).go();
      // Re-add the ones still in the bin (they are tombstones to the delta feed
      // but must stay restorable for 24 h).
      for (final r in recycled) {
        if (dirty.contains(r['id'])) continue;
        await _db.into(_db.expensesTable).insertOnConflictUpdate(expenseToCompanion(expenseFromRow(r)));
      }

      await _db.into(_db.syncMetaTable).insertOnConflictUpdate(SyncMetaTableCompanion.insert(
            key: _cursorKey(tripId),
            value: res['server_time'] as String,
            updatedAt: DateTime.now().toUtc().toIso8601String(),
          ));
    });
    return PullResult(conflicts);
  }

  Future<void> _deleteTripLocal(String tripId) async {
    await _db.transaction(() async {
      final groupIds = (await (_db.select(_db.groupsTable)..where((g) => g.tripId.equals(tripId))).get()).map((g) => g.id);
      await (_db.delete(_db.groupMembersTable)..where((g) => g.groupId.isIn(groupIds))).go();
      await (_db.delete(_db.groupsTable)..where((t) => t.tripId.equals(tripId))).go();
      await (_db.delete(_db.membersTable)..where((t) => t.tripId.equals(tripId))).go();
      await (_db.delete(_db.categoriesTable)..where((t) => t.tripId.equals(tripId))).go();
      await (_db.delete(_db.expensesTable)..where((t) => t.tripId.equals(tripId))).go();
      await (_db.delete(_db.tripMessagesTable)..where((t) => t.tripId.equals(tripId))).go();
      await (_db.delete(_db.syncMetaTable)..where((t) => t.key.equals(_cursorKey(tripId)))).go();
      await (_db.delete(_db.tripsTable)..where((t) => t.id.equals(tripId))).go();
    });
  }

}
