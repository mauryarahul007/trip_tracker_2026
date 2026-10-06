import 'package:supabase_flutter/supabase_flutter.dart';

import 'expense_side_effects.dart';
import 'outbox_remote.dart';
import 'outbox_store.dart';
import 'outbox_types.dart';

/// Maps outbox items to idempotent Supabase calls (upsert / keyed update /
/// keyed delete), so replaying after a timeout is always safe.
///
/// Payload shapes (all carry `v`):
///  - add/updateExpense: `{args: {p_id, p_trip_id, ...}}` -> `upsert_expense_v1`
///  - createTrip: `{trip: row, member: row}`
///  - addMember / addCategory: `{row: row}`
///  - createGroup: `{row: row, memberIds: [..]}`; updateGroup `{id, name, memberIds}`
///  - the rest: `{id}` / `{tripId}` plus the fields named in SYNC.md.
class SupabaseOutboxRemote implements OutboxRemote {
  SupabaseOutboxRemote(this._client, {this.effects});
  final SupabaseClient _client;

  /// Receipt upload + chat card around expense writes; null in tests/no-receipt builds.
  final ExpenseSideEffects? effects;

  @override
  Future<void> execute(OutboxItem item) async {
    try {
      await _run(item);
    } on RemoteFailure {
      rethrow;
    } on AuthException catch (e) {
      throw RemoteFailure(FailureKind.auth, e.message);
    } on PostgrestException catch (e) {
      throw classifyPostgrest(e);
    }
  }

  Future<void> _run(OutboxItem item) async {
    final p = item.payload;
    final db = _client;
    switch (item.type) {
      case OutboxType.addExpense:
      case OutboxType.updateExpense:
        final fx = effects;
        final args = fx == null ? Map<String, dynamic>.from(p['args'] as Map) : await fx.prepareArgs(p);
        await db.rpc<dynamic>('upsert_expense_v1', params: args);
        await fx?.afterWritten(p, args);
      case OutboxType.deleteExpense:
        await db
            .from('expenses')
            .update({'deleted_at': DateTime.now().toUtc().toIso8601String()})
            .eq('id', p['id'] as String);
      case OutboxType.restoreExpense:
        await db.from('expenses').update({'deleted_at': null}).eq('id', p['id'] as String);
      case OutboxType.permanentlyDeleteExpense:
        await db.from('expenses').delete().eq('id', p['id'] as String);
      case OutboxType.emptyRecycleBin:
        await db.from('expenses').delete().eq('trip_id', p['tripId'] as String).not('deleted_at', 'is', null);
      case OutboxType.createTrip:
        await db.from('trips').upsert(p['trip'] as Map<String, dynamic>);
        await db.from('members').upsert(p['member'] as Map<String, dynamic>);
      case OutboxType.updateTripState:
        await db.from('trips').update(Map<String, dynamic>.from(p['patch'] as Map)).eq('id', p['id'] as String);
      case OutboxType.setTripCollabField:
        await db.rpc<dynamic>(
          'set_trip_collab_field',
          params: {'p_trip_id': p['id'], 'p_field': p['field'], 'p_value': p['value']},
        );
      case OutboxType.deleteTrip:
        // Deleting an already-deleted trip matches 0 rows: fine, replay-safe.
        await db.from('trips').delete().eq('id', p['id'] as String);
      case OutboxType.addMember:
        await db.from('members').upsert(p['row'] as Map<String, dynamic>);
      case OutboxType.updateMember:
        await db.from('members').update(Map<String, dynamic>.from(p['patch'] as Map)).eq('id', p['id'] as String);
      case OutboxType.toggleArchiveMember:
        await db.from('members').update({'archived': p['archived']}).eq('id', p['id'] as String);
      case OutboxType.deleteMember:
        for (final g in (p['groupsToDissolve'] as List? ?? const [])) {
          await db.from('groups').delete().eq('id', g as String);
        }
        for (final g in (p['groupsToRename'] as List? ?? const [])) {
          await _replaceGroup(g['id'] as String, g['name'] as String, List<String>.from(g['memberIds'] as List));
        }
        await db.from('members').delete().eq('id', p['id'] as String);
      case OutboxType.createGroup:
        final row = p['row'] as Map<String, dynamic>;
        await db.from('groups').upsert(row);
        await _replaceMembers(row['id'] as String, List<String>.from(p['memberIds'] as List));
      case OutboxType.updateGroup:
        await _replaceGroup(p['id'] as String, p['name'] as String, List<String>.from(p['memberIds'] as List));
      case OutboxType.deleteGroup:
        await db.from('groups').delete().eq('id', p['id'] as String);
      case OutboxType.addCategory:
        await db.from('categories').upsert(p['row'] as Map<String, dynamic>);
      case OutboxType.deleteCategory:
        await db.from('categories').delete().eq('id', p['id'] as String);
      case OutboxType.addMessage:
        await db.from('trip_messages').upsert({
          'id': p['id'],
          'trip_id': p['trip_id'],
          'member_id': p['member_id'],
          'body': p['body'],
          'kind': p['kind'] ?? 'text',
        });
      case OutboxType.editMessage:
        await db.rpc<dynamic>('edit_trip_message', params: {'p_message_id': p['id'], 'p_body': p['body']});
      case OutboxType.deleteMessage:
        await db.from('trip_messages').update({'deleted_at': p['deleted_at']}).eq('id', p['id'] as String);
      default:
        throw RemoteFailure(FailureKind.permanent, 'unknown outbox type ${item.type}');
    }
  }

  Future<void> _replaceGroup(String id, String name, List<String> memberIds) async {
    await _client.from('groups').update({'name': name}).eq('id', id);
    await _replaceMembers(id, memberIds);
  }

  Future<void> _replaceMembers(String groupId, List<String> memberIds) async {
    await _client.from('group_members').delete().eq('group_id', groupId);
    if (memberIds.isNotEmpty) {
      await _client.from('group_members').insert([
        for (final m in memberIds) {'group_id': groupId, 'member_id': m},
      ]);
    }
  }
}

/// RLS (42501), constraint violations (23xxx), bad request shape (22xxx,
/// 42xxx) will never succeed on retry; JWT problems pause the queue;
/// everything else (5xx, rate limits, unknown) is transient.
RemoteFailure classifyPostgrest(PostgrestException e) {
  final code = e.code ?? '';
  final msg = e.message;
  if (code == 'PGRST301' || code == 'PGRST303' || msg.toLowerCase().contains('jwt')) {
    return RemoteFailure(FailureKind.auth, msg);
  }
  if (code.startsWith('23') ||
      code.startsWith('22') ||
      code.startsWith('42') ||
      code == 'P0001' ||
      code == 'PGRST204') {
    return RemoteFailure(FailureKind.permanent, '$code $msg');
  }
  return RemoteFailure(FailureKind.transient, '$code $msg');
}
