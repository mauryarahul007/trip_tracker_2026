import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/logging/app_logger.dart';
import '../../domain/models/notification_item.dart';
import '../local/app_database.dart';

const _listLimit = 50;

NotificationItem notificationFromEntry(NotificationEntry e) => NotificationItem(
  id: e.id,
  tripId: e.tripId,
  title: e.title,
  body: e.body,
  data: e.dataJson == null ? null : (jsonDecode(e.dataJson!) as Map).cast<String, dynamic>(),
  read: e.read,
  createdAt: e.createdAt,
);

/// In-app notifications. Drift is the read model (realtime inserts already land there);
/// writes go local first, then to Supabase best-effort like the web (no outbox: they are
/// idempotent flags and a missed one is corrected by the next [refresh]).
class NotificationRepository {
  NotificationRepository(this.db, this.client);

  final AppDatabase db;
  final SupabaseClient? client;

  Stream<List<NotificationItem>> watch(String userId) {
    final q = db.select(db.notificationsTable)
      ..where((t) => t.userId.equals(userId))
      ..orderBy([(t) => OrderingTerm.desc(t.createdAt)])
      ..limit(_listLimit);
    return q.watch().map((rows) => rows.map(notificationFromEntry).toList());
  }

  /// Pull the latest page (covers anything that arrived while offline).
  Future<void> refresh(String userId) async {
    final c = client;
    if (c == null) return;
    try {
      final rows = await c
          .from('notifications')
          .select()
          .eq('user_id', userId)
          .order('created_at', ascending: false)
          .limit(_listLimit);
      await db.batch((b) {
        for (final r in rows) {
          b.insert(
            db.notificationsTable,
            NotificationsTableCompanion.insert(
              id: r['id'] as String,
              userId: userId,
              tripId: Value(r['trip_id'] as String?),
              title: r['title'] as String? ?? '',
              body: r['body'] as String? ?? '',
              dataJson: Value(r['data'] == null ? null : jsonEncode(r['data'])),
              read: Value(r['read'] == true),
              createdAt: r['created_at'] as String,
            ),
            mode: InsertMode.insertOrReplace,
          );
        }
      });
    } catch (e) {
      AppLogger.warn('Notifications refresh failed: $e');
    }
  }

  Future<void> setRead(String id, bool read) async {
    await (db.update(
      db.notificationsTable,
    )..where((t) => t.id.equals(id))).write(NotificationsTableCompanion(read: Value(read)));
    await _remote((c) => c.from('notifications').update({'read': read}).eq('id', id));
  }

  Future<void> markAllRead(String userId, {String? tripId}) async {
    final local = db.update(db.notificationsTable)
      ..where(
        (t) =>
            t.userId.equals(userId) &
            t.read.equals(false) &
            (tripId == null ? const Constant(true) : t.tripId.equals(tripId)),
      );
    await local.write(const NotificationsTableCompanion(read: Value(true)));
    await _remote((c) {
      var q = c.from('notifications').update({'read': true}).eq('user_id', userId).eq('read', false);
      if (tripId != null) q = q.eq('trip_id', tripId);
      return q;
    });
  }

  Future<void> delete(String id) async {
    await (db.delete(db.notificationsTable)..where((t) => t.id.equals(id))).go();
    await _remote((c) => c.from('notifications').delete().eq('id', id));
  }

  Future<void> deleteAll(String userId, {String? tripId}) async {
    await (db.delete(
      db.notificationsTable,
    )..where((t) => t.userId.equals(userId) & (tripId == null ? const Constant(true) : t.tripId.equals(tripId)))).go();
    await _remote((c) {
      var q = c.from('notifications').delete().eq('user_id', userId);
      if (tripId != null) q = q.eq('trip_id', tripId);
      return q;
    });
  }

  Future<void> _remote(Future<void> Function(SupabaseClient c) op) async {
    final c = client;
    if (c == null) return;
    try {
      await op(c);
    } catch (e) {
      AppLogger.warn('Notification write failed (will reconcile on refresh): $e');
    }
  }
}
