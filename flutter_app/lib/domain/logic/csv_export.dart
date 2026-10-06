import 'dart:convert';

import '../models/expense.dart';
import '../models/member.dart';
import '../models/trip.dart';

String _cell(String raw) {
  var cleaned = raw.replaceAll('"', '""');
  if (cleaned.startsWith('=') || cleaned.startsWith('+') || cleaned.startsWith('-') || cleaned.startsWith('@')) {
    cleaned = "'$cleaned";
  }
  if (cleaned.contains(',') || cleaned.contains('"') || cleaned.contains('\n')) return '"$cleaned"';
  return cleaned;
}

/// One trip's ledger as CSV (banner + expense rows). Settlement rows are
/// listed after the spend rows so a spreadsheet still separates them.
String exportTripLedgerCsv({
  required Trip trip,
  required List<Member> members,
  required List<Expense> expenses,
  DateTime? generatedAt,
}) {
  final names = {for (final m in members) m.id: m.name};
  final when = generatedAt ?? DateTime.now();
  final stamp = '${when.year}-${when.month.toString().padLeft(2, '0')}-${when.day.toString().padLeft(2, '0')}';
  final active = expenses.where((e) => e.tripId == trip.id && e.deletedAt == null).toList()
    ..sort((a, b) => a.date.compareTo(b.date));
  final lines = <String>[
    'TRIP TRACKER — LEDGER EXPORT',
    _cell('${trip.name} · ${trip.startDate}–${trip.endDate} · ${trip.baseCurrency}'),
    'Generated $stamp',
    ['Date', 'Title', 'Category', 'Currency', 'Amount', 'Paid by', 'Split', 'Settlement'].map(_cell).join(','),
  ];
  for (final e in active) {
    final payer = names[e.paidBy] ?? e.paidBy;
    final split = e.splitMemberIds.map((id) => names[id] ?? id).join('; ');
    lines.add(
      [
        e.date,
        e.title,
        e.category,
        e.currency,
        e.amount.toStringAsFixed(2),
        payer,
        split,
        e.isSettlement ? 'yes' : 'no',
      ].map(_cell).join(','),
    );
  }
  return lines.join('\n');
}

class BackupSummary {
  const BackupSummary({
    required this.valid,
    this.error,
    this.tripCount = 0,
    this.expenseCount = 0,
    this.expenses = const [],
  });
  final bool valid;
  final String? error;
  final int tripCount;
  final int expenseCount;
  final List<Map<String, dynamic>> expenses;
}

/// Reads a backup JSON string. Does not replace [validateAndSanitizeBackup],
/// which stays fixture-locked for the non-string probe.
BackupSummary summarizeBackup(String jsonString) {
  if (jsonString.trim().isEmpty) return const BackupSummary(valid: false, error: 'Empty or invalid JSON payload.');
  if (jsonString.length > 10 * 1024 * 1024) {
    return const BackupSummary(valid: false, error: 'Backup file exceeds maximum allowed size (10MB).');
  }
  Object? parsed;
  try {
    parsed = _decode(jsonString);
  } catch (_) {
    return const BackupSummary(valid: false, error: 'Invalid JSON format.');
  }
  if (parsed is! Map) return const BackupSummary(valid: false, error: 'Root object must be a valid JSON dictionary.');
  final raw = Map<String, dynamic>.from(parsed);
  raw.remove('__proto__');
  raw.remove('constructor');
  raw.remove('prototype');
  final trips = raw['trips'];
  if (trips is! List) return const BackupSummary(valid: false, error: 'Missing or invalid "trips" array.');
  if (trips.length > 50) return const BackupSummary(valid: false, error: 'Import contains too many trips (max 50).');
  final expenses = raw['expenses'];
  final rows = <Map<String, dynamic>>[];
  if (expenses is List) {
    if (expenses.length > 1000 * (trips.isEmpty ? 1 : trips.length)) {
      return const BackupSummary(valid: false, error: 'Import contains too many expenses.');
    }
    for (final e in expenses) {
      if (e is Map) rows.add(Map<String, dynamic>.from(e));
    }
  }
  return BackupSummary(valid: true, tripCount: trips.length, expenseCount: rows.length, expenses: rows);
}

Object? _decode(String s) => jsonDecode(s);

/// Local snapshot of one trip, enough to round-trip through [summarizeBackup].
String exportTripBackupJson({required Trip trip, required List<Member> members, required List<Expense> expenses}) {
  return const JsonEncoder.withIndent('  ').convert({
    'trips': [trip.toJson()],
    'members': [for (final m in members) m.toJson()],
    'expenses': [for (final e in expenses) e.toJson()],
  });
}
