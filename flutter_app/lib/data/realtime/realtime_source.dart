import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/logging/app_logger.dart';

enum ChannelStatus { subscribed, closed, error }

/// One `postgres_changes` listener on a channel.
class PgSub {
  final String event; // 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  final String table;
  final String? filterColumn;
  final String? filterValue;
  const PgSub(this.event, this.table, {this.filterColumn, this.filterValue});
}

class ChannelSpec {
  final String name;
  final List<PgSub> subs;
  const ChannelSpec(this.name, this.subs);
}

class RealtimeEvent {
  final String channel;
  final String table;
  final String type;
  final Map<String, dynamic> record;
  const RealtimeEvent(this.channel, this.table, this.type, this.record);
}

abstract class RealtimeHandle {
  Future<void> close();
}

/// Thin seam over the Supabase realtime client so the manager is testable.
abstract class RealtimeSource {
  RealtimeHandle open(ChannelSpec spec, void Function(RealtimeEvent) onEvent, void Function(ChannelStatus) onStatus);
}

class SupabaseRealtimeSource implements RealtimeSource {
  SupabaseRealtimeSource(this._client);
  final SupabaseClient _client;

  @override
  RealtimeHandle open(ChannelSpec spec, void Function(RealtimeEvent) onEvent, void Function(ChannelStatus) onStatus) {
    final channel = _client.channel(spec.name);
    for (final s in spec.subs) {
      channel.onPostgresChanges(
        event: switch (s.event) {
          'INSERT' => PostgresChangeEvent.insert,
          'UPDATE' => PostgresChangeEvent.update,
          'DELETE' => PostgresChangeEvent.delete,
          _ => PostgresChangeEvent.all,
        },
        schema: 'public',
        table: s.table,
        filter: s.filterColumn == null
            ? null
            : PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: s.filterColumn!, value: s.filterValue!),
        callback: (p) => onEvent(RealtimeEvent(spec.name, s.table, p.eventType.name.toUpperCase(), p.newRecord)),
      );
    }
    channel.subscribe((status, error) {
      if (error != null) AppLogger.warn('Realtime ${spec.name}: $error');
      onStatus(switch (status) {
        RealtimeSubscribeStatus.subscribed => ChannelStatus.subscribed,
        RealtimeSubscribeStatus.closed => ChannelStatus.closed,
        _ => ChannelStatus.error,
      });
    });
    return _SupabaseHandle(_client, channel);
  }
}

class _SupabaseHandle implements RealtimeHandle {
  _SupabaseHandle(this._client, this._channel);
  final SupabaseClient _client;
  final RealtimeChannel _channel;

  @override
  Future<void> close() async {
    await _client.removeChannel(_channel); // BUG-146: never leave duplicates on a topic
  }
}
