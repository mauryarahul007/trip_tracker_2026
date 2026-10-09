import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../../domain/logic/chat_event_row.dart';
import '../../domain/logic/expense_form_logic.dart';
import '../../domain/logic/split_resolver.dart';
import '../../domain/logic/trip_utilities.dart' show buildAutoGroupName;
import '../../domain/models/category.dart';
import '../../domain/models/checklist_item.dart';
import '../../domain/models/expense_io.dart';
import '../../domain/models/expense.dart';
import '../../domain/models/group.dart';
import '../../domain/models/member.dart';
import '../../domain/models/travel_pass.dart';
import '../../domain/models/trip.dart';
import '../../domain/models/trip_message.dart';
import '../../domain/models/trip_note.dart';
import '../../domain/repositories/repositories.dart';
import '../local/app_database.dart';
import '../local/entity_codec.dart';
import '../mappers/row_mappers.dart';
import '../remote/expense_online_api.dart';
import '../sync/outbox_store.dart';
import '../sync/outbox_types.dart';

/// Re-runs [load] now and after every write to any of [tables].
///
/// Not `customSelect('SELECT 1').watch()`: drift drops results equal to the last one, and `SELECT 1` never
/// changes, so such a stream emitted once and the UI went stale after every local write or sync pull.
Stream<T> watchTables<T>(GeneratedDatabase db, Set<TableInfo<Table, Object?>> tables, Future<T> Function() load) {
  final updates = db.tableUpdates(TableUpdateQuery.onAllTables(tables));
  Stream<void> trigger() async* {
    yield null;
    yield* updates;
  }

  return trigger().asyncMap((_) => load());
}

/// Shared plumbing: every write is `db.transaction { local write + enqueue }`
/// followed by a fire-and-forget sync request.
abstract class _DriftRepo {
  _DriftRepo(this.db, this.outbox, this.requestSync, {DateTime Function()? now, Uuid? uuid})
    : now = now ?? DateTime.now,
      uuid = uuid ?? const Uuid();

  final AppDatabase db;
  final OutboxStore outbox;
  final void Function() requestSync;
  final DateTime Function() now;
  final Uuid uuid;

  int get nowMs => now().millisecondsSinceEpoch;

  Future<T> write<T>(Future<T> Function() body) async {
    final r = await db.transaction(body);
    requestSync();
    return r;
  }
}

class DriftTripRepository extends _DriftRepo implements TripRepository {
  DriftTripRepository(super.db, super.outbox, super.requestSync, {super.now, super.uuid});

  Future<List<Trip>> _load([String? onlyId]) async {
    final q = db.select(db.tripsTable)..orderBy([(t) => OrderingTerm.desc(t.startDate)]);
    if (onlyId != null) q.where((t) => t.id.equals(onlyId));
    final entries = await q.get();
    final members = await db.select(db.membersTable).get();
    final groups = await db.select(db.groupsTable).get();
    // Active expenses per trip (card badge); not stored on the row.
    final counts = <String, int>{};
    for (final r
        in await (db.selectOnly(db.expensesTable)
              ..addColumns([db.expensesTable.tripId, db.expensesTable.id.count()])
              ..where(db.expensesTable.archived.equals(false))
              ..groupBy([db.expensesTable.tripId]))
            .get()) {
      counts[r.read(db.expensesTable.tripId)!] = r.read(db.expensesTable.id.count()) ?? 0;
    }
    final out = <Trip>[];
    for (final e in entries) {
      final t = entryToTrip(
        e,
        memberIds: [
          for (final m in members)
            if (m.tripId == e.id) m.id,
        ],
        groupIds: [
          for (final g in groups)
            if (g.tripId == e.id) g.id,
        ],
      );
      if (t != null) out.add(t.copyWith(expenseCount: counts[e.id] ?? 0));
    }
    return out;
  }

  Stream<T> _watch<T>(Future<T> Function() load) =>
      watchTables(db, {db.tripsTable, db.membersTable, db.groupsTable, db.expensesTable}, load);

  @override
  Stream<List<Trip>> watchTrips() => _watch(_load);

  @override
  Stream<Trip?> watchTrip(String id) => _watch(() async => (await _load(id)).firstOrNull);

  @override
  Future<String> createTrip({
    required String name,
    required String startDate,
    required String endDate,
    required String baseCurrency,
    required String ownerId,
    required String creatorName,
    String? destination,
  }) => write(() async {
    final tripId = uuid.v4();
    final memberId = uuid.v4();
    final trip = Trip.fromJson({
      'id': tripId,
      'name': name,
      'startDate': startDate,
      'endDate': endDate,
      'baseCurrency': baseCurrency,
      'ownerId': ownerId,
      'destination': destination,
      'createdAt': nowMs,
      'updatedAt': nowMs,
    });
    await db.into(db.tripsTable).insert(tripToCompanion(trip));
    await db
        .into(db.membersTable)
        .insert(
          memberToCompanion(Member(id: memberId, name: creatorName, tripId: tripId, linkedUserId: ownerId), tripId),
        );
    // join_code is server-generated; it arrives with the next pull.
    await outbox.enqueue(OutboxType.createTrip, {
      'trip': {
        'id': tripId,
        'name': name,
        'start_date': startDate,
        'end_date': endDate,
        'base_currency': baseCurrency,
        'owner_id': ownerId,
        'destination': destination,
        'stops': <dynamic>[],
      },
      'member': {'id': memberId, 'trip_id': tripId, 'name': creatorName, 'linked_user_id': ownerId},
    }, tripId: tripId);
    return tripId;
  });

  @override
  Future<void> setTripState(String id, {bool? archived, bool? frozen, bool? closed}) => write(() async {
    final e = await (db.select(db.tripsTable)..where((t) => t.id.equals(id))).getSingleOrNull();
    final trip = e == null ? null : entryToTrip(e);
    if (trip == null) return;
    await db
        .into(db.tripsTable)
        .insertOnConflictUpdate(
          tripToCompanion(trip.copyWith(archived: archived, frozen: frozen, closed: closed, updatedAt: nowMs)),
        );
    await outbox.enqueue(OutboxType.updateTripState, {
      'id': id,
      'patch': {'archived': ?archived, 'frozen': ?frozen, 'closed': ?closed},
    }, tripId: id);
  });

  /// Rewrites the stored trip through its JSON so nullable fields can be cleared.
  Future<Trip?> _patchTrip(String id, Map<String, dynamic> jsonPatch) async {
    final e = await (db.select(db.tripsTable)..where((t) => t.id.equals(id))).getSingleOrNull();
    final trip = e == null ? null : entryToTrip(e);
    if (trip == null) return null;
    final next = Trip.fromJson({...trip.toJson(), ...jsonPatch, 'updatedAt': nowMs});
    await db.into(db.tripsTable).insertOnConflictUpdate(tripToCompanion(next));
    return next;
  }

  Future<void> _columnPatch(String id, Map<String, dynamic> jsonPatch, Map<String, dynamic> columns) => write(() async {
    if (await _patchTrip(id, jsonPatch) == null) return;
    await outbox.enqueue(OutboxType.updateTripState, {'id': id, 'patch': columns}, tripId: id);
  });

  @override
  Future<void> setSimplifyDebts(String id, bool value) =>
      _columnPatch(id, {'simplifyDebts': value}, {'simplify_debts': value});

  @override
  Future<void> setApprovalThreshold(String id, double? threshold) {
    final v = (threshold == null || threshold <= 0) ? null : threshold;
    return _columnPatch(id, {'approvalThreshold': v}, {'approval_threshold': v});
  }

  @override
  Future<void> setCategoryOrder(String id, List<String> order) =>
      _columnPatch(id, {'categoryOrder': order}, {'category_order': order});

  @override
  Future<void> setSplitExclusionDefaults(String id, Map<String, List<String>> defaults) =>
      _columnPatch(id, {'splitExclusionDefaults': defaults}, {'split_exclusion_defaults': defaults});

  @override
  Future<void> setFxConfig(String id, TripFxConfig config) => write(() async {
    if (await _patchTrip(id, {'fxConfig': config.toJson()}) == null) return;
    await outbox.enqueue(OutboxType.setTripCollabField, {
      'id': id,
      'field': 'fx_config',
      'value': config.toJson(),
    }, tripId: id);
  });

  @override
  Future<void> setMemberRole(String id, String memberId, String role) => write(() async {
    final e = await (db.select(db.tripsTable)..where((t) => t.id.equals(id))).getSingleOrNull();
    final trip = e == null ? null : entryToTrip(e);
    if (trip == null) return;
    final roles = {...trip.memberRoles, memberId: role};
    if (await _patchTrip(id, {'memberRoles': roles}) == null) return;
    await outbox.enqueue(OutboxType.updateTripState, {
      'id': id,
      'patch': {'member_roles': roles},
    }, tripId: id);
  });

  Future<void> _collab(String id, String jsonKey, Object value, String field) => write(() async {
    if (await _patchTrip(id, {jsonKey: value}) == null) return;
    await outbox.enqueue(OutboxType.setTripCollabField, {'id': id, 'field': field, 'value': value}, tripId: id);
  });

  @override
  Future<void> setChecklist(String id, List<ChecklistItem> items) =>
      _collab(id, 'checklist', [for (final i in items) i.toJson()], 'checklist');

  @override
  Future<void> setNotes(String id, List<TripNote> notes) =>
      _collab(id, 'notes', [for (final n in notes) n.toJson()], 'notes');

  @override
  Future<void> setPasses(String id, List<TravelPass> passes) =>
      _collab(id, 'passes', [for (final p in passes) p.toJson()], 'passes');

  @override
  Future<void> setStops(String id, List<TripStop> stops) =>
      _collab(id, 'stops', [for (final s in stops) s.toJson()], 'stops');

  @override
  Future<void> deleteTrip(String id) => write(() async {
    final groupIds = (await (db.select(db.groupsTable)..where((g) => g.tripId.equals(id))).get()).map((g) => g.id);
    await (db.delete(db.groupMembersTable)..where((g) => g.groupId.isIn(groupIds))).go();
    await (db.delete(db.groupsTable)..where((t) => t.tripId.equals(id))).go();
    await (db.delete(db.membersTable)..where((t) => t.tripId.equals(id))).go();
    await (db.delete(db.categoriesTable)..where((t) => t.tripId.equals(id))).go();
    await (db.delete(db.expensesTable)..where((t) => t.tripId.equals(id))).go();
    await (db.delete(db.tripMessagesTable)..where((t) => t.tripId.equals(id))).go();
    await (db.delete(db.tripsTable)..where((t) => t.id.equals(id))).go();
    // Anything still queued for this trip is moot once it is gone.
    for (final i in await outbox.all()) {
      if (i.tripId == id) await outbox.markDone(i.id);
    }
    await outbox.enqueue(OutboxType.deleteTrip, {'id': id}, tripId: id);
  });
}

class DriftExpenseRepository extends _DriftRepo implements ExpenseRepository {
  DriftExpenseRepository(super.db, super.outbox, super.requestSync, {this.api, super.now, super.uuid});

  /// Online-only actions; null means "no backend" (they report offline).
  final ExpenseOnlineApi? api;

  Stream<List<Expense>> _watch(String tripId, {required bool recycled}) {
    final q = db.select(db.expensesTable)
      ..where((t) => t.tripId.equals(tripId) & t.archived.equals(recycled))
      ..orderBy([(t) => OrderingTerm.desc(t.date), (t) => OrderingTerm.desc(t.createdAt)]);
    return q.watch().map((rows) => [for (final r in rows) ?entryToExpense(r)]);
  }

  @override
  Stream<List<Expense>> watchActive(String tripId) => _watch(tripId, recycled: false);

  @override
  Stream<List<Expense>> watchRecycled(String tripId) => _watch(tripId, recycled: true);

  @override
  Stream<Expense?> watchExpense(String id) => (db.select(
    db.expensesTable,
  )..where((t) => t.id.equals(id))).watchSingleOrNull().map((e) => e == null ? null : entryToExpense(e));

  @override
  Stream<List<Expense>> watchAllActive() {
    final q = db.select(db.expensesTable)..where((t) => t.archived.equals(false));
    return q.watch().map((rows) => [for (final r in rows) ?entryToExpense(r)]);
  }

  @override
  Future<void> adoptServerCopy(Expense server) => write(() async {
    await _put(server);
    await outbox.discardForEntity(server.id);
  });

  Future<Expense?> _get(String id) async {
    final e = await (db.select(db.expensesTable)..where((t) => t.id.equals(id))).getSingleOrNull();
    return e == null ? null : entryToExpense(e);
  }

  Future<void> _put(Expense e) => db.into(db.expensesTable).insertOnConflictUpdate(expenseToCompanion(e));

  @override
  Future<void> add(Expense e) => write(() async {
    final x = e.copyWith(createdAt: nowMs, updatedAt: nowMs);
    await _put(x);
    await outbox.enqueue(OutboxType.addExpense, {'tempId': x.id, 'args': expenseToUpsertArgs(x)}, tripId: x.tripId);
  });

  @override
  Future<void> update(Expense e) => write(() async {
    final x = e.copyWith(updatedAt: nowMs);
    await _put(x);
    await outbox.enqueue(OutboxType.updateExpense, {'id': x.id, 'args': expenseToUpsertArgs(x)}, tripId: x.tripId);
  });

  Map<String, dynamic> _chatRow(Expense e, String kind, String memberId, {String? note}) => buildExpenseChatRow(
    id: uuid.v4(),
    tripId: e.tripId,
    memberId: memberId,
    kind: kind,
    expenseId: e.id,
    title: e.title,
    amount: e.amount,
    currency: e.currency,
    note: note,
  );

  /// `send-push` request sent after the expense reaches the server (web `sendPushNotification`):
  /// "expense added" to every other linked member, or "confirm settlement" to the person paid.
  Map<String, dynamic>? _pushFor(
    Expense e,
    Trip? trip,
    List<MemberEntry> members,
    String me, {
    required bool isSettlement,
  }) {
    if (trip == null) return null;
    final linked = {for (final m in members) m.id: m.linkedUserId};
    final recipients = isSettlement
        ? [for (final id in e.splitMemberIds) linked[id]]
        : [
            for (final m in members)
              if (!m.archived) m.linkedUserId,
          ];
    final ids = {
      for (final r in recipients)
        if (r != null && r != me) r,
    }.toList();
    if (ids.isEmpty) return null;
    return {
      'userIds': ids,
      'tripName': trip.name,
      'tripId': trip.id,
      'type': isSettlement ? 'settlement_confirmation_requested' : 'expense_added',
      'params': {'expenseTitle': e.title, 'currency': e.currency, 'amount': e.amount.toString()},
    };
  }

  Future<String?> _myMemberId(String tripId, String userId) async {
    final m = await (db.select(
      db.membersTable,
    )..where((t) => t.tripId.equals(tripId) & t.linkedUserId.equals(userId) & t.archived.equals(false))).get();
    return m.isEmpty ? null : m.first.id;
  }

  @override
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
  }) async {
    final tripEntry = await (db.select(db.tripsTable)..where((t) => t.id.equals(tripId))).getSingleOrNull();
    final trip = tripEntry == null ? null : entryToTrip(tripEntry);
    final blocked = tripWriteBlockReason(trip, isSuperadmin: isSuperadmin);
    if (blocked != null) return SaveOutcome.failed(blocked);

    final members = await (db.select(db.membersTable)..where((t) => t.tripId.equals(tripId))).get();
    final active = {
      for (final m in members)
        if (!m.archived) m.id,
    };
    final participants = s.splitMemberIds.where(active.contains).toList();
    if (participants.isEmpty) return const SaveOutcome.failed('Select at least one active traveler to split with.');

    final shares = resolveShares(
      amount: s.amount,
      splitMode: s.splitMode,
      paidBy: s.paidBy,
      participants: participants,
      splitConfig: s.splitConfig,
      itemizedConfig: s.itemizedConfig,
      currency: s.currency,
    );
    final editing = editingId == null ? null : await _get(editingId);
    if (editingId != null && editing == null) return const SaveOutcome.failed('This expense no longer exists.');
    final id = editing?.id ?? expenseId ?? uuid.v4();
    final isSettlement = editing?.isSettlement ?? isSettlementTitle(s.title);
    final approval =
        editing?.approvalStatus ??
        computeApprovalStatus(
          trip,
          thresholdEnabled: approvalThresholdEnabled,
          isSettlement: isSettlement,
          amount: s.amount,
        );

    final saved = Expense(
      id: id,
      tripId: tripId,
      title: s.title,
      amount: s.amount,
      currency: s.currency,
      category: s.category,
      date: s.date,
      paidBy: s.paidBy,
      paidByShares: s.paidByShares,
      splitMode: s.splitMode,
      splitMemberIds: s.splitMemberIds,
      splitConfig: s.splitConfig,
      itemizedConfig: s.itemizedConfig,
      resolvedShares: shares,
      // Keep the existing stored photo until a replacement finishes uploading.
      receiptPath: editing?.receiptPath,
      photoPaths: editing?.photoPaths,
      disputedAt: editing?.disputedAt,
      disputedByUserId: editing?.disputedByUserId,
      disputeNote: editing?.disputeNote,
      isSettlement: isSettlement,
      settlementConfirmedAt: editing?.settlementConfirmedAt,
      settlementConfirmedByUserId: editing?.settlementConfirmedByUserId,
      approvalStatus: approval,
      approvedByUserId: editing?.approvedByUserId,
      createdByUserId: editing?.createdByUserId ?? userId,
      location: s.location,
      deletedAt: editing?.deletedAt,
      deletedByUserId: editing?.deletedByUserId,
      createdAt: editing?.createdAt ?? nowMs,
      updatedAt: nowMs,
    );

    final memberId = postChatCard && editing == null ? await _myMemberId(tripId, userId) : null;
    final push = editing == null ? _pushFor(saved, trip, members, userId, isSettlement: isSettlement) : null;
    await write(() async {
      await _put(saved);
      await outbox.enqueue(editing == null ? OutboxType.addExpense : OutboxType.updateExpense, {
        if (editing == null) 'tempId': id else 'id': id,
        'args': expenseToUpsertArgs(saved),
        if (receipt != null)
          'receipt': {
            'tripId': tripId,
            'expenseId': id,
            'localPath': receipt.localPath,
            'ext': receipt.ext,
            'mime': receipt.mime,
          },
        if (memberId != null) 'chat': _chatRow(saved, isSettlement ? 'settlement_recorded' : 'expense_added', memberId),
        'push': ?push,
      }, tripId: tripId);
    });
    return SaveOutcome.ok(id);
  }

  @override
  Future<void> delete(String id, {required String userId}) => write(() async {
    final e = await _get(id);
    if (e == null) return;
    await _put(e.copyWith(deletedAt: nowMs, deletedByUserId: userId, updatedAt: nowMs));
    await outbox.enqueue(OutboxType.deleteExpense, {'id': id, 'userId': userId}, tripId: e.tripId);
  });

  @override
  Future<void> restore(String id) => write(() async {
    final e = await _get(id);
    if (e == null) return;
    await _put(e.copyWith(clearDeleted: true, updatedAt: nowMs));
    await outbox.enqueue(OutboxType.restoreExpense, {'id': id}, tripId: e.tripId);
  });

  @override
  Future<void> permanentlyDelete(String id) => write(() async {
    final e = await _get(id);
    await (db.delete(db.expensesTable)..where((t) => t.id.equals(id))).go();
    await outbox.enqueue(OutboxType.permanentlyDeleteExpense, {'id': id}, tripId: e?.tripId);
  });

  @override
  Future<void> emptyRecycleBin(String tripId) => write(() async {
    await (db.delete(db.expensesTable)..where((t) => t.tripId.equals(tripId) & t.archived.equals(true))).go();
    await outbox.enqueue(OutboxType.emptyRecycleBin, {'tripId': tripId}, tripId: tripId);
  });

  ExpenseOnlineApi get _api => api ?? (throw const ExpenseActionException('You are offline.', offline: true));

  /// Server first, then the local copy: a refused action must not look done.
  Future<void> _online(String id, Future<void> Function() call, Expense Function(Expense e) apply) async {
    final e = await _get(id);
    if (e == null) throw const ExpenseActionException('This expense no longer exists.');
    await call();
    await write(() async => _put(apply(e).copyWith(updatedAt: nowMs)));
  }

  Future<void> _postCard(Expense e, String kind, String userId, {String? note}) async {
    final memberId = await _myMemberId(e.tripId, userId);
    if (memberId == null) return;
    try {
      await _api.sendChat(_chatRow(e, kind, memberId, note: note));
    } catch (_) {
      // Best effort, like the web: a missing card never undoes the dispute.
    }
  }

  @override
  Future<void> flagDispute(String id, {required String userId, String? note, bool postChatCard = false}) async {
    final api = _api;
    final before = await _get(id);
    await _online(
      id,
      () => api.flagDispute(id, note),
      (e) => e.copyWith(disputedAt: nowMs, disputedByUserId: userId, disputeNote: note),
    );
    if (postChatCard && before != null) await _postCard(before, 'expense_disputed', userId, note: note);
  }

  @override
  Future<void> resolveDispute(String id, {required String userId, bool postChatCard = false}) async {
    final api = _api;
    final before = await _get(id);
    await _online(id, () => api.resolveDispute(id), (e) => e.copyWith(clearDispute: true));
    if (postChatCard && before != null) await _postCard(before, 'expense_dispute_resolved', userId);
  }

  @override
  Future<void> confirmSettlement(String id, {required String userId}) async {
    final api = _api;
    await _online(
      id,
      () => api.confirmSettlement(id),
      (e) => e.copyWith(settlementConfirmedAt: nowMs, settlementConfirmedByUserId: userId),
    );
  }

  @override
  Future<void> approve(String id, {required String userId}) async {
    final api = _api;
    await _online(id, () => api.approve(id), (e) => e.copyWith(approvalStatus: 'confirmed', approvedByUserId: userId));
  }
}

class DriftMemberRepository extends _DriftRepo implements MemberRepository {
  DriftMemberRepository(super.db, super.outbox, super.requestSync, {super.now, super.uuid});

  @override
  Stream<List<Member>> watchMembers(String tripId) => (db.select(
    db.membersTable,
  )..where((t) => t.tripId.equals(tripId))).watch().map((r) => r.map(entryToMember).toList());

  @override
  Stream<List<Member>> watchAll() => db.select(db.membersTable).watch().map((r) => r.map(entryToMember).toList());

  @override
  Stream<List<Group>> watchGroups(String tripId) =>
      watchTables(db, {db.groupsTable, db.groupMembersTable}, () => _groups(tripId));

  Future<List<Group>> _groups(String tripId) async {
    final groups = await (db.select(db.groupsTable)..where((t) => t.tripId.equals(tripId))).get();
    final maps = await db.select(db.groupMembersTable).get();
    return [
      for (final g in groups)
        Group(
          id: g.id,
          tripId: g.tripId,
          name: g.name,
          memberIds: [
            for (final m in maps)
              if (m.groupId == g.id) m.memberId,
          ],
        ),
    ];
  }

  @override
  Future<String> addMember(String tripId, String name, {String? email, String? linkedUserId}) => write(() async {
    final id = uuid.v4();
    await db
        .into(db.membersTable)
        .insert(
          memberToCompanion(
            Member(id: id, name: name, email: email, tripId: tripId, linkedUserId: linkedUserId),
            tripId,
          ),
        );
    await outbox.enqueue(OutboxType.addMember, {
      'row': {'id': id, 'trip_id': tripId, 'name': name, 'email': ?email, 'linked_user_id': ?linkedUserId},
    }, tripId: tripId);
    return id;
  });

  Future<MemberEntry?> _member(String id) =>
      (db.select(db.membersTable)..where((t) => t.id.equals(id))).getSingleOrNull();

  @override
  Future<void> updateMember(String id, {String? name, String? email, String? joinDate, String? leaveDate}) =>
      write(() async {
        final m = await _member(id);
        if (m == null) return;
        await (db.update(db.membersTable)..where((t) => t.id.equals(id))).write(
          MembersTableCompanion(
            name: name == null ? const Value.absent() : Value(name),
            email: email == null ? const Value.absent() : Value(email),
            joinDate: joinDate == null ? const Value.absent() : Value(joinDate),
            leaveDate: leaveDate == null ? const Value.absent() : Value(leaveDate),
          ),
        );
        await outbox.enqueue(OutboxType.updateMember, {
          'id': id,
          'patch': {'name': ?name, 'email': ?email, 'join_date': ?joinDate, 'leave_date': ?leaveDate},
        }, tripId: m.tripId);
      });

  @override
  Future<void> setArchived(String id, bool archived) => write(() async {
    final m = await _member(id);
    if (m == null) return;
    await (db.update(
      db.membersTable,
    )..where((t) => t.id.equals(id))).write(MembersTableCompanion(archived: Value(archived)));
    await outbox.enqueue(OutboxType.toggleArchiveMember, {'id': id, 'archived': archived}, tripId: m.tripId);
  });

  @override
  Future<void> deleteMember(String id) => write(() async {
    final m = await _member(id);
    if (m == null) return;
    final names = {
      for (final x in await (db.select(db.membersTable)..where((t) => t.tripId.equals(m.tripId))).get()) x.id: x.name,
    };
    final dissolve = <String>[];
    final rename = <Map<String, dynamic>>[];
    for (final g in await _groups(m.tripId)) {
      if (!g.memberIds.contains(id)) continue;
      final remaining = [
        for (final x in g.memberIds)
          if (x != id) x,
      ];
      if (remaining.length < 2) {
        dissolve.add(g.id);
      } else {
        // Follow the removed member out only while the name is auto-generated.
        List<String> nm(List<String> ids) => [for (final x in ids) ?names[x]];
        final wasAuto = g.name == buildAutoGroupName(nm(g.memberIds));
        rename.add({'id': g.id, 'name': wasAuto ? buildAutoGroupName(nm(remaining)) : g.name, 'memberIds': remaining});
      }
    }
    for (final gid in dissolve) {
      await _dropGroup(gid);
    }
    for (final r in rename) {
      await _setGroup(r['id'] as String, r['name'] as String, List<String>.from(r['memberIds'] as List));
    }
    await (db.delete(db.groupMembersTable)..where((t) => t.memberId.equals(id))).go();
    await (db.delete(db.membersTable)..where((t) => t.id.equals(id))).go();
    await outbox.enqueue(OutboxType.deleteMember, {
      'id': id,
      'groupsToDissolve': dissolve,
      'groupsToRename': rename,
    }, tripId: m.tripId);
  });

  Future<void> _dropGroup(String id) async {
    await (db.delete(db.groupMembersTable)..where((t) => t.groupId.equals(id))).go();
    await (db.delete(db.groupsTable)..where((t) => t.id.equals(id))).go();
  }

  Future<void> _setGroup(String id, String name, List<String> memberIds) async {
    await (db.update(db.groupsTable)..where((t) => t.id.equals(id))).write(GroupsTableCompanion(name: Value(name)));
    await (db.delete(db.groupMembersTable)..where((t) => t.groupId.equals(id))).go();
    for (final m in memberIds) {
      await db.into(db.groupMembersTable).insert(GroupMembersTableCompanion.insert(groupId: id, memberId: m));
    }
  }

  @override
  Future<String> createGroup(String tripId, String name, List<String> memberIds) => write(() async {
    final id = uuid.v4();
    await db
        .into(db.groupsTable)
        .insert(groupToCompanion(Group(id: id, tripId: tripId, name: name, memberIds: memberIds), tripId));
    await _setGroup(id, name, memberIds);
    await outbox.enqueue(OutboxType.createGroup, {
      'row': {'id': id, 'trip_id': tripId, 'name': name},
      'memberIds': memberIds,
    }, tripId: tripId);
    return id;
  });

  @override
  Future<void> updateGroup(String id, String name, List<String> memberIds) => write(() async {
    final g = await (db.select(db.groupsTable)..where((t) => t.id.equals(id))).getSingleOrNull();
    if (g == null) return;
    await _setGroup(id, name, memberIds);
    await outbox.enqueue(OutboxType.updateGroup, {'id': id, 'name': name, 'memberIds': memberIds}, tripId: g.tripId);
  });

  @override
  Future<void> deleteGroup(String id) => write(() async {
    final g = await (db.select(db.groupsTable)..where((t) => t.id.equals(id))).getSingleOrNull();
    await _dropGroup(id);
    await outbox.enqueue(OutboxType.deleteGroup, {'id': id}, tripId: g?.tripId);
  });
}

class DriftCategoryRepository extends _DriftRepo implements CategoryRepository {
  DriftCategoryRepository(super.db, super.outbox, super.requestSync, {super.now, super.uuid});

  @override
  Stream<List<Category>> watch(String tripId) => (db.select(
    db.categoriesTable,
  )..where((t) => t.tripId.equals(tripId))).watch().map((r) => r.map(entryToCategory).toList());

  @override
  Future<String> add(String tripId, String name, {String? icon}) => write(() async {
    final id = uuid.v4();
    await db
        .into(db.categoriesTable)
        .insert(categoryToCompanion(Category(id: id, tripId: tripId, name: name, icon: icon, isCustom: true), tripId));
    await outbox.enqueue(OutboxType.addCategory, {
      'row': {'id': id, 'trip_id': tripId, 'name': name, 'icon': icon, 'is_custom': true},
    }, tripId: tripId);
    return id;
  });

  @override
  Future<void> rename(String id, String name) => write(() async {
    final c = await (db.select(db.categoriesTable)..where((t) => t.id.equals(id))).getSingleOrNull();
    if (c == null || c.tripId == null) return;
    final tripId = c.tripId!;
    final next = entryToCategory(c).copyWith(name: name.trim());
    await db.into(db.categoriesTable).insertOnConflictUpdate(categoryToCompanion(next, tripId));
    await outbox.enqueue(OutboxType.addCategory, {
      'row': <String, dynamic>{
        'id': id,
        'trip_id': tripId,
        'name': next.name,
        'icon': next.icon,
        'is_custom': next.isCustom,
      },
    }, tripId: tripId);
  });

  @override
  Future<void> delete(String id) => write(() async {
    final c = await (db.select(db.categoriesTable)..where((t) => t.id.equals(id))).getSingleOrNull();
    await (db.delete(db.categoriesTable)..where((t) => t.id.equals(id))).go();
    await outbox.enqueue(OutboxType.deleteCategory, {'id': id}, tripId: c?.tripId);
  });
}

class DriftMessageRepository extends _DriftRepo implements MessageRepository {
  DriftMessageRepository(super.db, super.outbox, super.requestSync, {super.now, super.uuid});

  TripMessage _decode(TripMessageEntry r) {
    final raw = r.domainJson;
    if (raw != null && raw.isNotEmpty) {
      return TripMessage.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    }
    return TripMessage(
      id: r.id,
      tripId: r.tripId,
      memberId: r.userId,
      body: r.message,
      eventKind: r.kind,
      createdAt: DateTime.tryParse(r.createdAt)?.millisecondsSinceEpoch ?? 0,
    );
  }

  Future<void> _put(TripMessage m, String senderName) => db
      .into(db.tripMessagesTable)
      .insertOnConflictUpdate(
        TripMessagesTableCompanion.insert(
          id: m.id,
          tripId: m.tripId,
          userId: m.memberId,
          senderName: senderName,
          kind: m.eventKind ?? 'text',
          message: m.body,
          createdAt: DateTime.fromMillisecondsSinceEpoch(m.createdAt, isUtc: true).toIso8601String(),
          domainJson: Value(jsonEncode(m.toJson())),
        ),
      );

  @override
  Stream<List<TripMessage>> watch(String tripId) =>
      (db.select(db.tripMessagesTable)..where((t) => t.tripId.equals(tripId))).watch().map((rows) {
        final out = [for (final r in rows) _decode(r)]..sort((a, b) => a.createdAt.compareTo(b.createdAt));
        return out;
      });

  @override
  Future<void> send({
    required String tripId,
    required String memberId,
    required String senderName,
    required String body,
  }) => write(() async {
    final m = TripMessage(
      id: uuid.v4(),
      tripId: tripId,
      memberId: memberId,
      body: body.trim(),
      eventKind: 'text',
      createdAt: nowMs,
    );
    await _put(m, senderName);
    await outbox.enqueue(OutboxType.addMessage, {
      'id': m.id,
      'trip_id': tripId,
      'member_id': memberId,
      'body': m.body,
      'kind': 'text',
    }, tripId: tripId);
  });

  @override
  Future<void> edit(String id, String body) => write(() async {
    final row = await (db.select(db.tripMessagesTable)..where((t) => t.id.equals(id))).getSingleOrNull();
    if (row == null) return;
    final next = _decode(row).copyWith(body: body.trim(), editedAt: nowMs);
    await _put(next, row.senderName);
    await outbox.enqueue(OutboxType.editMessage, {'id': id, 'body': next.body}, tripId: row.tripId);
  });

  @override
  Future<void> delete(String id) => write(() async {
    final row = await (db.select(db.tripMessagesTable)..where((t) => t.id.equals(id))).getSingleOrNull();
    if (row == null) return;
    final deletedAt = nowMs;
    final next = _decode(row).copyWith(deletedAt: deletedAt);
    await _put(next, row.senderName);
    await outbox.enqueue(OutboxType.deleteMessage, {
      'id': id,
      'deleted_at': DateTime.fromMillisecondsSinceEpoch(deletedAt, isUtc: true).toIso8601String(),
    }, tripId: row.tripId);
  });
}
