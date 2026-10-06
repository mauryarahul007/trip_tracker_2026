import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../../domain/logic/sync_merge.dart';
import '../local/app_database.dart';
import 'outbox_types.dart';

/// A decoded outbox row.
class OutboxItem {
  final String id;
  final String type;
  final String? tripId;
  final Map<String, dynamic> payload;
  final String idempotencyKey;
  final int attempts;
  final String status;
  final String? lastError;
  final DateTime? lastAttemptedAt;

  const OutboxItem({
    required this.id,
    required this.type,
    required this.tripId,
    required this.payload,
    required this.idempotencyKey,
    required this.attempts,
    required this.status,
    required this.lastError,
    required this.lastAttemptedAt,
  });

  QueuedOp toQueuedOp() => QueuedOp(type, payload);

  /// Key used to keep FIFO order per entity while letting others proceed.
  String get entityKey {
    final ids = payloadEntityIds(type, payload);
    return ids.isEmpty ? 'trip:${tripId ?? payload['tripId']}' : ids.first;
  }
}

/// Drift-backed outbox. All writes that must be atomic with an entity write
/// should be made inside `db.transaction` by the caller (repositories).
class OutboxStore {
  OutboxStore(this._db, {DateTime Function()? now, Uuid? uuid})
    : _now = now ?? DateTime.now,
      _uuid = uuid ?? const Uuid();

  final AppDatabase _db;
  final DateTime Function() _now;
  final Uuid _uuid;

  Future<String> enqueue(String type, Map<String, dynamic> payload, {String? tripId}) async {
    assert(OutboxType.all.contains(type), 'unknown outbox type $type');
    final id = _uuid.v4();
    await _db
        .into(_db.outboxTable)
        .insert(
          OutboxTableCompanion.insert(
            id: id,
            itemType: type,
            tripId: Value(tripId),
            payloadJson: jsonEncode({'v': outboxPayloadVersion, ...payload}),
            idempotencyKey: id,
            createdAt: _now().toUtc().toIso8601String(),
          ),
        );
    return id;
  }

  OutboxItem _decode(OutboxEntry e) => OutboxItem(
    id: e.id,
    type: e.itemType,
    tripId: e.tripId,
    payload: jsonDecode(e.payloadJson) as Map<String, dynamic>,
    idempotencyKey: e.idempotencyKey,
    attempts: e.attempts,
    status: e.status,
    lastError: e.lastError,
    lastAttemptedAt: e.lastAttemptedAt == null ? null : DateTime.parse(e.lastAttemptedAt!),
  );

  SimpleSelectStatement<$OutboxTableTable, OutboxEntry> _ordered() => _db.select(_db.outboxTable)
    ..orderBy([(t) => OrderingTerm.asc(t.createdAt), (t) => OrderingTerm.asc(const CustomExpression<int>('rowid'))]);

  /// Everything not yet delivered, FIFO.
  Future<List<OutboxItem>> all() async => (await _ordered().get()).map(_decode).toList();

  Stream<List<OutboxItem>> watchAll() => _ordered().watch().map((r) => r.map(_decode).toList());

  /// Quarantined items, for the "sync issue" UI.
  Stream<List<OutboxItem>> watchIssues() =>
      (_ordered()..where((t) => t.status.equals(OutboxStatus.poison))).watch().map((r) => r.map(_decode).toList());

  Future<Set<String>> dirtyIds() async => collectDirtyIds((await all()).map((i) => i.toQueuedOp()));

  Future<void> markInFlight(String id) => _update(
    id,
    OutboxTableCompanion(
      status: const Value(OutboxStatus.inFlight),
      lastAttemptedAt: Value(_now().toUtc().toIso8601String()),
    ),
  );

  Future<void> markDone(String id) => (_db.delete(_db.outboxTable)..where((t) => t.id.equals(id))).go();

  /// Back to pending without burning an attempt (auth pause / offline).
  Future<void> release(String id) => _update(id, const OutboxTableCompanion(status: Value(OutboxStatus.pending)));

  Future<void> markFailed(OutboxItem item, String error, {required bool quarantine}) => _update(
    item.id,
    OutboxTableCompanion(
      status: Value(quarantine ? OutboxStatus.poison : OutboxStatus.failed),
      attempts: Value(item.attempts + 1),
      lastError: Value(error),
      lastAttemptedAt: Value(_now().toUtc().toIso8601String()),
    ),
  );

  /// Crash recovery: anything left in flight was interrupted mid-send; the
  /// remote calls are idempotent so it is safe to resend.
  Future<void> recoverInterrupted() =>
      (_db.update(_db.outboxTable)..where((t) => t.status.equals(OutboxStatus.inFlight))).write(
        const OutboxTableCompanion(status: Value(OutboxStatus.pending)),
      );

  /// User chose "retry" on a quarantined item.
  Future<void> retry(String id) => _update(
    id,
    const OutboxTableCompanion(status: Value(OutboxStatus.pending), attempts: Value(0), lastError: Value(null)),
  );

  /// User chose "discard" on a quarantined item.
  Future<void> discard(String id) => markDone(id);

  /// Drop queued mutations for an entity (conflict: server wins).
  Future<void> discardForEntity(String entityId) async {
    for (final i in await all()) {
      if (i.entityKey == entityId) await markDone(i.id);
    }
  }

  Future<void> _update(String id, OutboxTableCompanion c) =>
      (_db.update(_db.outboxTable)..where((t) => t.id.equals(id))).write(c);
}
