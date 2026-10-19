import 'package:supabase_flutter/supabase_flutter.dart';

import '../../domain/models/admin.dart';
import '../../domain/models/admin_fleet.dart';
import '../../domain/models/member.dart';
import '../mappers/row_mappers.dart';
import '../../domain/repositories/admin_repository.dart';

/// Same tables and RPCs as the web Ops Deck (`tripApi.ts`, `bugApi.ts`, `featureFlagApi.ts`). The server
/// enforces superadmin-only access with RLS and SECURITY DEFINER functions; this class adds no checks of its own.
class SupabaseAdminRepository implements AdminRepository {
  SupabaseAdminRepository(this._client);

  final SupabaseClient? _client;

  SupabaseClient get _c {
    final c = _client;
    if (c == null || c.auth.currentUser == null) throw const AdminUnavailable();
    return c;
  }

  static const _bugList =
      'id, title, description, severity, category, status, found_by, environment, assignee, created_at, '
      'updated_at, resolved_at, resolved_by, resolution_note';

  @override
  Future<List<AdminBug>> bugs() async {
    final rows = await _c.from('bugs').select(_bugList).order('created_at', ascending: false);
    return [for (final r in rows) AdminBug.fromRow(Map<String, dynamic>.from(r))];
  }

  @override
  Future<AdminBug?> bug(String id) async {
    final r = await _c.from('bugs').select().eq('id', id.toUpperCase()).maybeSingle();
    return r == null ? null : AdminBug.fromRow(Map<String, dynamic>.from(r));
  }

  @override
  Future<AdminBug?> updateBug(
    String id, {
    String? status,
    String? severity,
    String? assignee,
    String? resolutionNote,
    required String resolvedBy,
  }) async {
    final now = DateTime.now().toUtc().toIso8601String();
    final payload = <String, Object?>{
      'updated_at': now,
      'status': ?status,
      'severity': ?severity,
      'assignee': ?assignee,
      'resolution_note': ?resolutionNote,
    };
    if (status == 'resolved') {
      payload['resolved_at'] = now;
      payload['resolved_by'] = resolvedBy;
    }
    final r = await _c.from('bugs').update(payload).eq('id', id.toUpperCase()).select().maybeSingle();
    return r == null ? null : AdminBug.fromRow(Map<String, dynamic>.from(r));
  }

  @override
  Future<String> createBug({
    required String title,
    required String description,
    required String severity,
    required String category,
    required Map<String, Object?> environment,
  }) async {
    final res = await _c.rpc<dynamic>(
      'report_bug',
      params: {
        'p_title': title,
        'p_description': description,
        'p_severity': severity,
        'p_category': category,
        'p_found_by': 'superadmin-flutter',
        'p_environment': environment,
        'p_repro_steps': const <String>[],
        'p_expected_behavior': '',
        'p_actual_behavior': '',
        'p_diagnostics': const <String, Object?>{},
        'p_fingerprint': null,
      },
    );
    return res is Map ? (res['id'] as String? ?? '') : '';
  }

  @override
  Future<List<AdminUser>> users() async {
    List<dynamic> rows;
    try {
      rows = await _c
          .from('profiles')
          .select('id, email, display_name, banned, created_at, signup_source')
          .order('created_at', ascending: false);
    } on PostgrestException {
      // Older databases have no signup_source column yet.
      rows = await _c
          .from('profiles')
          .select('id, email, display_name, banned, created_at')
          .order('created_at', ascending: false);
    }
    final ids = await _c.rpc<dynamic>('get_superadmin_ids');
    final supers = {if (ids is List) ...ids.map((e) => '$e')};
    return [
      for (final r in rows)
        AdminUser.fromRow(Map<String, dynamic>.from(r as Map)).copyWith(isSuperadmin: supers.contains(r['id'])),
    ];
  }

  @override
  Future<void> setUserBanned(String userId, bool banned) =>
      _c.rpc<dynamic>('set_user_banned', params: {'p_user_id': userId, 'p_banned': banned});

  @override
  Future<void> deleteUser(String userId) => _c.rpc<dynamic>('delete_user', params: {'p_user_id': userId});

  @override
  Future<int> broadcast(String title, String body) async {
    final n = await _c.rpc<dynamic>(
      'broadcast_notification',
      params: {'p_title': title, 'p_body': body, 'p_trip_id': null},
    );
    return n is num ? n.toInt() : 0;
  }

  @override
  Future<List<AdminTrip>> trips() async {
    List<dynamic> rows;
    try {
      rows = await _c
          .from('trips')
          .select(
            'id, name, owner_id, destination, start_date, end_date, frozen, archived, closed, created_at, members(count)',
          )
          .order('created_at', ascending: false);
    } on PostgrestException {
      rows = await _c
          .from('trips')
          .select('id, name, owner_id, destination, start_date, end_date, frozen, archived, closed, created_at')
          .order('created_at', ascending: false);
    }
    return [for (final r in rows) AdminTrip.fromRow(Map<String, dynamic>.from(r as Map))];
  }

  Future<void> _log(String tripId, String action, String name) => _c.rpc<dynamic>(
    'log_security_event',
    params: {
      'p_trip_id': tripId,
      'p_action': action,
      'p_details': {'tripName': name},
    },
  );

  Future<void> _patchTrip(AdminTrip t, Map<String, Object?> patch, String action) async {
    await _c.from('trips').update(patch).eq('id', t.id);
    // Best effort, like the web portal: the audit entry must not undo a change that already landed.
    try {
      await _log(t.id, action, t.name);
    } catch (_) {}
  }

  @override
  Future<void> setTripFrozen(AdminTrip trip, bool frozen) =>
      _patchTrip(trip, {'frozen': frozen}, frozen ? 'ground_trip' : 'unground_trip');

  @override
  Future<void> setTripArchived(AdminTrip trip, bool archived) =>
      _patchTrip(trip, {'archived': archived}, archived ? 'archive_trip' : 'restore_trip');

  @override
  Future<void> deleteTrip(AdminTrip trip) async {
    await _c.from('trips').delete().eq('id', trip.id);
    try {
      await _log(trip.id, 'delete_trip', trip.name);
    } catch (_) {}
  }

  @override
  Future<List<FlagOverride>> flagOverrides() async {
    final res = await _c.rpc<dynamic>('get_all_feature_flag_overrides');
    if (res is! List) return const [];
    return [for (final r in res) FlagOverride.fromRow(Map<String, dynamic>.from(r as Map))];
  }

  @override
  Future<void> setFlagOverride(String scope, String scopeId, String flagKey, bool? value) => _c.rpc<dynamic>(
    'set_feature_flag_override',
    params: {'p_scope': scope, 'p_scope_id': scopeId, 'p_flag_key': flagKey, 'p_value': value},
  );

  @override
  Future<AdminConfig> appConfig() async {
    final res = await _c.rpc<dynamic>('get_app_config');
    return AdminConfig({
      if (res is List)
        for (final r in res.whereType<Map<String, dynamic>>()) '${r['key']}': r['value'],
    });
  }

  @override
  Future<void> setAppConfig(String key, Object? value) =>
      _c.rpc<dynamic>('set_app_config', params: {'p_key': key, 'p_value': value});

  @override
  Future<List<AuditEntry>> auditLogs({int limit = 200}) async {
    final rows = await _c
        .from('security_audit_logs')
        .select('id, trip_id, actor_user_id, action, details, created_at')
        .order('created_at', ascending: false)
        .limit(limit);
    return [for (final r in rows) AuditEntry.fromRow(Map<String, dynamic>.from(r))];
  }

  @override
  Future<int> purgeAuditLogs(int olderThanDays) async {
    final n = await _c.rpc<dynamic>('purge_audit_logs_older_than', params: {'p_days': olderThanDays});
    return n is num ? n.toInt() : 0;
  }

  @override
  Future<List<AdminFeature>> features() async {
    final rows = await _c.from('features').select().order('created_at', ascending: false);
    return [for (final r in rows) AdminFeature.fromRow(Map<String, dynamic>.from(r))];
  }

  @override
  Future<String> createFeature({required String title, required String description, required String category}) async {
    final res = await _c.rpc<dynamic>(
      'submit_feature_request',
      params: {
        'p_title': title,
        'p_description': description,
        'p_category': category,
        'p_requested_by': 'superadmin-flutter',
        'p_environment': const {'platform': 'android', 'client': 'flutter'},
      },
    );
    return res is Map ? (res['id'] as String? ?? '') : '';
  }

  @override
  Future<AdminFeature?> updateFeature(
    String id, {
    String? status,
    String? category,
    String? shippedNote,
    String? shippedBy,
    String? linkedFlagKey,
  }) async {
    final now = DateTime.now().toUtc().toIso8601String();
    final payload = <String, Object?>{
      'updated_at': now,
      'status': ?status,
      'category': ?category,
      'shipped_note': ?shippedNote,
      'shipped_by': ?shippedBy,
      // An empty key unlinks the flag, like the web page.
      if (linkedFlagKey != null) 'linked_flag_key': linkedFlagKey.isEmpty ? null : linkedFlagKey,
    };
    if (status == 'shipped') payload['shipped_at'] = now;
    final r = await _c.from('features').update(payload).eq('id', id.toUpperCase()).select().maybeSingle();
    return r == null ? null : AdminFeature.fromRow(Map<String, dynamic>.from(r));
  }

  @override
  Future<void> deleteFeature(String id) => _c.from('features').delete().eq('id', id.toUpperCase());

  @override
  Future<NotificationStats> notificationStats() async {
    final res = await _c.rpc<dynamic>('get_notification_stats');
    final row = res is List && res.isNotEmpty && res.first is Map
        ? Map<String, dynamic>.from(res.first as Map)
        : const <String, dynamic>{};
    int n(String k) => (row[k] as num?)?.toInt() ?? 0;
    return NotificationStats(total: n('total_count'), read: n('read_count'), last7d: n('last_7d_count'));
  }

  @override
  Future<Map<String, int>> devicePlatformCounts() async {
    final out = <String, int>{};
    for (final p in const ['ios', 'android']) {
      final r = await _c.from('device_push_tokens').select('id').eq('platform', p).count(CountOption.exact);
      if (r.count > 0) out[p] = r.count;
    }
    return out;
  }

  @override
  Future<List<RetentionCohort>> retentionCohorts({int weeks = 8}) async {
    final res = await _c.rpc<dynamic>('admin_retention_cohorts', params: {'p_weeks': weeks});
    return [
      if (res is List)
        for (final r in res.whereType<Map<String, dynamic>>()) RetentionCohort.fromRow(Map<String, dynamic>.from(r)),
    ];
  }

  @override
  Future<({int eligible, int repeat})> repeatCreatorRate() async {
    final res = await _c.rpc<dynamic>('admin_repeat_creator_rate');
    final row = res is List && res.isNotEmpty && res.first is Map
        ? Map<String, dynamic>.from(res.first as Map)
        : const <String, dynamic>{};
    return (
      eligible: (row['creators_eligible'] as num?)?.toInt() ?? 0,
      repeat: (row['repeat_creators'] as num?)?.toInt() ?? 0,
    );
  }

  @override
  Future<List<ReliabilityGroup>> reliability({int days = 14}) async {
    final res = await _c.rpc<dynamic>('admin_reliability_summary', params: {'p_days': days});
    final groups = <String, ReliabilityGroup>{};
    for (final r in (res is List ? res : const <dynamic>[]).whereType<Map<String, dynamic>>()) {
      final g = groups.putIfAbsent(
        '${r['platform']}|${r['app_version']}',
        () => ReliabilityGroup('${r['platform']}', '${r['app_version']}'),
      );
      final users = (r['users'] as num?)?.toInt() ?? 0;
      switch ('${r['event']}') {
        case 'app_open':
          g.openUsers = users;
        case 'sync_stuck':
          g.stuckUsers = users;
        case 'sync_fail':
          g.failUsers = users;
      }
    }
    return groups.values.toList();
  }

  @override
  Future<int> recycledExpenseCount() async {
    final n = await _c.rpc<dynamic>('count_recycled_expenses');
    return n is num ? n.toInt() : 0;
  }

  @override
  Future<int> purgeRecycleBin(int olderThanDays) async {
    final n = await _c.rpc<dynamic>('purge_recycle_bin_older_than', params: {'p_days': olderThanDays});
    return n is num ? n.toInt() : 0;
  }

  @override
  Future<void> changePassword(String newPassword) async {
    await _c.auth.updateUser(UserAttributes(password: newPassword));
  }

  @override
  Future<List<ServiceCheck>> pingServices() async {
    Future<ServiceCheck> time(String name, Future<void> Function() call) async {
      final sw = Stopwatch()..start();
      try {
        await call();
        return ServiceCheck(name: name, ok: true, ms: sw.elapsedMilliseconds);
      } catch (_) {
        return ServiceCheck(name: name, ok: false, ms: sw.elapsedMilliseconds);
      }
    }

    final c = _c;
    return Future.wait([
      time('Auth', () async => c.auth.refreshSession().then((_) {})),
      time('Database', () async => c.from('bugs').select('id').limit(1)),
      time('Storage', () => c.storage.from('receipts').list(searchOptions: const SearchOptions(limit: 1))),
    ]);
  }

  /// PostgREST returns at most 1000 rows per request, so large tables are read page by page.
  Future<List<Map<String, dynamic>>> _all(
    PostgrestTransformBuilder<List<Map<String, dynamic>>> Function(int from, int to) page,
  ) async {
    const size = 1000;
    final out = <Map<String, dynamic>>[];
    for (var from = 0; from < 50000; from += size) {
      final rows = await page(from, from + size - 1);
      out.addAll(rows.map(Map<String, dynamic>.from));
      if (rows.length < size) break;
    }
    return out;
  }

  @override
  Future<FleetData> fleet() async {
    final c = _c;
    final tripRows = await _all((a, b) => c.from('trips').select().order('created_at').range(a, b));
    final memberRows = await _all(
      (a, b) => c
          .from('members')
          .select('id, trip_id, name, email, linked_user_id, archived, join_date, leave_date')
          .order('id')
          .range(a, b),
    );
    final expenseRows = await _all(
      (a, b) => c
          .from('expenses')
          .select(
            'id, trip_id, title, amount, currency, category, date, paid_by, paid_by_shares, split_mode, split_member_ids, '
            'split_config, resolved_shares, receipt_path, location, is_settlement, approval_status, created_by_user_id, '
            'created_at, updated_at',
          )
          .isFilter('deleted_at', null)
          .order('id')
          .range(a, b),
    );
    final members = <String, Member>{for (final r in memberRows) r['id'] as String: memberFromRow(r)};
    final idsByTrip = <String, List<String>>{};
    for (final r in memberRows) {
      (idsByTrip[r['trip_id'] as String? ?? ''] ??= []).add(r['id'] as String);
    }
    int? ms(Object? v) => v is String ? DateTime.tryParse(v)?.millisecondsSinceEpoch : null;
    return FleetData(
      members: members,
      trips: [
        for (final r in tripRows)
          FleetTrip(
            trip: tripFromRow(r, memberIds: idsByTrip[r['id']] ?? const []),
            joinPreviewCount: (r['join_preview_count'] as num?)?.toInt() ?? 0,
            closeoutPulse: r['closeout_pulse'] as String?,
            splitwiseImportCount: (r['splitwise_import_count'] as num?)?.toInt() ?? 0,
            splitwiseImportedAt: ms(r['splitwise_imported_at']),
          ),
      ],
      expenses: [for (final r in expenseRows) expenseFromRow(r)],
    );
  }
}
