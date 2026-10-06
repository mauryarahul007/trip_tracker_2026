import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import '../../domain/models/join_share.dart';
import '../../domain/repositories/repositories.dart';

String _firstName(String name) => name.trim().split(RegExp(r'\s+')).first;

InviteException _invite(PostgrestException e) {
  // The lookup RPCs rate-limit guessable codes: "... wait 30 seconds".
  final m = RegExp(r'wait (\d+) seconds', caseSensitive: false).firstMatch(e.message);
  return InviteException(e.message, lockoutSeconds: m == null ? null : int.parse(m.group(1)!));
}

Map<String, dynamic>? _row(Object? data) {
  final r = data is List ? (data.isEmpty ? null : data.first) : data;
  return r is Map ? Map<String, dynamic>.from(r) : null;
}

class SupabaseJoinRepository implements JoinRepository {
  SupabaseJoinRepository(this._client);
  final SupabaseClient _client;

  @override
  Future<JoinPreview?> preview(String code) async {
    try {
      final row = _row(await _client.rpc<dynamic>('preview_trip_by_join_code', params: {'p_code': code}));
      if (row == null || row['trip_name'] == null) return null;
      return JoinPreview(
        tripName: row['trip_name'] as String,
        startDate: row['start_date'] as String? ?? '',
        endDate: row['end_date'] as String? ?? '',
        // Strip last names again client-side, like the web.
        memberFirstNames: [for (final n in (row['member_first_names'] as List? ?? const [])) _firstName('$n')]
            .where((n) => n.isNotEmpty)
            .toList(),
      );
    } on PostgrestException catch (e) {
      throw _invite(e);
    }
  }

  @override
  Future<void> recordPreview(String code) async {
    try {
      await _client.rpc<dynamic>('record_join_preview', params: {'p_code': code});
    } catch (_) {
      // Analytics only: never block the invite on it.
    }
  }

  @override
  Future<JoinLookup?> lookup(String code) async {
    try {
      final data = await _client.rpc<dynamic>('lookup_trip_by_join_code', params: {'p_code': code});
      if (data is! List || data.isEmpty) return null;
      final rows = [for (final r in data) Map<String, dynamic>.from(r as Map)];
      final first = rows.first;
      return JoinLookup(
        tripId: first['trip_id'] as String,
        tripName: first['trip_name'] as String,
        isAdmin: first['is_admin'] == true,
        myMemberId: first['my_member_id'] as String?,
        unclaimedMembers: [
          for (final r in rows)
            if (r['member_id'] != null && r['member_name'] != null)
              UnclaimedMember(id: r['member_id'] as String, name: r['member_name'] as String),
        ],
      );
    } on PostgrestException catch (e) {
      throw _invite(e);
    }
  }

  @override
  Future<bool> claim(String memberId) async {
    try {
      return await _client.rpc<dynamic>('claim_trip_member', params: {'p_member_id': memberId}) == true;
    } on PostgrestException catch (e) {
      throw _invite(e);
    }
  }
}

class SupabaseShareRepository implements ShareRepository {
  SupabaseShareRepository(this._client);
  final SupabaseClient _client;

  @override
  Future<TripShareSummary?> summary(String token) async {
    final row = _row(await _client.rpc<dynamic>('get_trip_share', params: {'p_token': token}));
    if (row == null) return null;
    return TripShareSummary(
      tripName: row['trip_name'] as String? ?? '',
      startDate: row['start_date'] as String? ?? '',
      endDate: row['end_date'] as String? ?? '',
      destination: row['destination'] as String?,
      memberCount: (row['member_count'] as num?)?.toInt() ?? 0,
      expenseCount: (row['expense_count'] as num?)?.toInt() ?? 0,
      spendByCurrency: {
        for (final e in ((row['spend_by_currency'] as Map?) ?? const {}).entries)
          '${e.key}': (e.value as num).toDouble(),
      },
    );
  }

  @override
  Future<void> recordView(String token) async {
    try {
      await _client.rpc<dynamic>('record_trip_share_view', params: {'p_token': token});
    } catch (_) {
      // Counter only.
    }
  }

  /// Links last 30 days, revocable earlier (same as the web).
  static const linkLifetime = Duration(days: 30);

  @override
  Future<ShareLinkState> generate(String tripId) async {
    final expires = DateTime.now().toUtc().add(linkLifetime);
    final token = _uuid();
    final row = await _client
        .from('trips')
        .update({'share_token': token, 'share_enabled': true, 'share_expires_at': expires.toIso8601String()})
        .eq('id', tripId)
        .select('share_token, share_enabled, share_expires_at')
        .single();
    return ShareLinkState(
      token: row['share_token'] as String,
      enabled: row['share_enabled'] == true,
      expiresAt: DateTime.tryParse('${row['share_expires_at']}'),
    );
  }

  @override
  Future<void> revoke(String tripId) async {
    await _client.from('trips').update({'share_enabled': false}).eq('id', tripId);
  }

  static String _uuid() => const Uuid().v4();
}
