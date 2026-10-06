import 'dart:convert';

import 'package:uuid/uuid.dart';

import '../../domain/logic/csv_export.dart' show summarizeBackup;
import '../../domain/models/expense.dart';
import '../../domain/repositories/repositories.dart';

class RestoreResult {
  const RestoreResult({this.trips = 0, this.members = 0, this.expenses = 0, this.error});
  final int trips;
  final int members;
  final int expenses;
  final String? error;
  bool get ok => error == null;
}

/// Whole-device JSON backup (every trip on this device) and its restore.
/// Restore creates NEW trips with fresh ids (the repositories own id creation), so
/// importing the same file twice duplicates; the UI says so before it runs.
/// Also the entry point for legacy guest/demo data (Phase 11): a web "export backup"
/// file restores the same way.
class BackupService {
  BackupService(this._trips, this._members, this._expenses, {Uuid? uuid}) : _uuid = uuid ?? const Uuid();

  final TripRepository _trips;
  final MemberRepository _members;
  final ExpenseRepository _expenses;
  final Uuid _uuid;

  static const manifestType = 'full_backup';

  Future<String> exportJson({DateTime? now}) async {
    final trips = await _trips.watchTrips().first;
    final members = await _members.watchAll().first;
    final expenses = await _expenses.watchAllActive().first;
    final ids = {for (final t in trips) t.id};
    return const JsonEncoder.withIndent('  ').convert({
      'manifest': {
        'type': manifestType,
        'appName': 'Trip Tracker 2026',
        'exportedAt': (now ?? DateTime.now()).toUtc().toIso8601String(),
        'tripCount': trips.length,
      },
      'trips': [for (final t in trips) t.toJson()],
      'members': [
        for (final m in members)
          if (ids.contains(m.tripId)) m.toJson(),
      ],
      'expenses': [
        for (final e in expenses)
          if (ids.contains(e.tripId)) e.toJson(),
      ],
    });
  }

  Future<RestoreResult> restore(String json, {required String userId, required String userName}) async {
    final summary = summarizeBackup(json);
    if (!summary.valid) return RestoreResult(error: summary.error);
    final raw = jsonDecode(json) as Map<String, dynamic>;
    // Two shapes: ours (`members` is a list, each with `tripId`) and the web/Capacitor export
    // (`members` is a map memberId -> member with no `tripId`; trips list their `memberIds`).
    final membersRaw = raw['members'];
    final rawMembers = <Map<String, dynamic>>[
      if (membersRaw is List)
        for (final m in membersRaw)
          if (m is Map) Map<String, dynamic>.from(m),
      if (membersRaw is Map)
        for (final e in membersRaw.entries)
          if (e.value is Map) {...Map<String, dynamic>.from(e.value as Map), 'id': (e.value as Map)['id'] ?? e.key},
    ];
    final rawExpenses = [
      for (final e in (raw['expenses'] as List? ?? const []))
        if (e is Map && e['deletedAt'] == null) Map<String, dynamic>.from(e), // recycle-bin items are not restored
    ];

    var tripCount = 0, memberCount = 0, expenseCount = 0;
    for (final t in (raw['trips'] as List).whereType<Map<String, dynamic>>()) {
      final trip = t;
      final oldId = trip['id'] as String?;
      final name = (trip['name'] as String?)?.trim() ?? '';
      if (oldId == null || name.isEmpty) continue;
      final newTrip = await _trips.createTrip(
        name: name,
        startDate: trip['startDate'] as String? ?? '',
        endDate: trip['endDate'] as String? ?? '',
        baseCurrency: trip['baseCurrency'] as String? ?? 'USD',
        ownerId: userId,
        creatorName: userName,
        destination: trip['destination'] as String?,
      );
      tripCount++;

      // createTrip already added "me"; map the old owner's member onto it.
      final mine = (await _members.watchMembers(newTrip).first).single.id;
      final listed = trip['memberIds'] is List
          ? (trip['memberIds'] as List).whereType<String>().toList()
          : const <String>[];
      final oldMembers = rawMembers.where((m) => m['tripId'] == oldId || listed.contains(m['id'])).toList();
      final map = <String, String>{};
      // Owner match: linked account, then same name, then the creator (first listed member on the web).
      final oldOwner =
          oldMembers.where((m) => m['linkedUserId'] != null && m['linkedUserId'] == trip['ownerId']).firstOrNull ??
          oldMembers.where((m) => m['name'] == userName).firstOrNull ??
          (listed.isEmpty ? null : oldMembers.where((m) => m['id'] == listed.first).firstOrNull);
      if (oldOwner != null) map[oldOwner['id'] as String] = mine;
      for (final m in oldMembers) {
        final id = m['id'] as String;
        if (map.containsKey(id)) continue;
        final added = await _members.addMember(newTrip, (m['name'] as String?) ?? 'Member');
        map[id] = added;
        memberCount++;
        if (m['archived'] == true) await _members.setArchived(added, true);
      }

      String m(String id) => map[id] ?? mine;
      Map<String, dynamic>? keys(Object? v) =>
          v is Map ? {for (final e in v.entries) m(e.key as String): e.value} : null;
      for (final e in rawExpenses.where((e) => e['tripId'] == oldId)) {
        final j = Map<String, dynamic>.from(e)
          ..['id'] = _uuid.v4()
          ..['tripId'] = newTrip
          ..['paidBy'] = m(e['paidBy'] as String? ?? '')
          ..['createdByUserId'] = userId
          ..remove('itemizedConfig'); // item assignments reference old member ids; resolvedShares carries the result
        if (e['splitMemberIds'] is List) {
          j['splitMemberIds'] = [for (final id in e['splitMemberIds'] as List) m(id as String)];
        }
        for (final k in ['paidByShares', 'splitConfig', 'resolvedShares']) {
          final v = keys(e[k]);
          if (v != null) j[k] = v;
        }
        try {
          await _expenses.add(Expense.fromJson(j));
          expenseCount++;
        } catch (_) {
          // A malformed row is skipped, never aborts the restore.
        }
      }
    }
    return RestoreResult(trips: tripCount, members: memberCount, expenses: expenseCount);
  }
}
