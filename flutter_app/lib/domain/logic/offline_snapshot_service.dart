import 'dart:convert';

import '../models/category.dart';
import '../models/expense.dart';
import '../models/member.dart';
import '../models/trip.dart';

/// Manifest metadata for .triptracker snapshot bundles.
class SnapshotManifest {
  final String version;
  final String exportedAt;
  final String appName;
  final int tripCount;
  final String type; // 'single_trip_snapshot' or 'full_backup'

  const SnapshotManifest({
    required this.version,
    required this.exportedAt,
    required this.appName,
    required this.tripCount,
    required this.type,
  });

  Map<String, dynamic> toJson() => {
    'version': version,
    'exportedAt': exportedAt,
    'appName': appName,
    'tripCount': tripCount,
    'type': type,
  };

  factory SnapshotManifest.fromJson(Map<String, dynamic> json) => SnapshotManifest(
    version: json['version'] as String? ?? '3.3.0',
    exportedAt: json['exportedAt'] as String? ?? '',
    appName: json['appName'] as String? ?? 'Trip Tracker 2026',
    tripCount: (json['tripCount'] as num?)?.toInt() ?? 1,
    type: json['type'] as String? ?? 'single_trip_snapshot',
  );
}

class SnapshotValidationResult {
  final bool valid;
  final String? error;
  final SnapshotManifest? manifest;
  final String? primaryTripName;
  final int tripCount;
  final int expenseCount;
  final double totalSpend;
  final Map<String, dynamic>? sanitizedData;

  const SnapshotValidationResult({
    required this.valid,
    this.error,
    this.manifest,
    this.primaryTripName,
    this.tripCount = 0,
    this.expenseCount = 0,
    this.totalSpend = 0.0,
    this.sanitizedData,
  });
}

/// Creates a sanitized filename for a .triptracker offline bundle.
String getSnapshotFilename(String tripName, [DateTime? date]) {
  final safeName = tripName.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '-');
  final now = date ?? DateTime.now();
  final dateStr =
      '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
  return 'triptracker-$safeName-$dateStr.triptracker';
}

/// Exports a single trip snapshot bundle as JSON.
String exportOfflineSnapshot({
  required Trip trip,
  required List<Member> members,
  required List<Expense> expenses,
  List<Category> categories = const [],
  DateTime? exportedAt,
}) {
  final when = (exportedAt ?? DateTime.now()).toUtc().toIso8601String();
  final tripExpenses = expenses.where((e) => e.tripId == trip.id && e.deletedAt == null).toList();

  final bundle = {
    'manifest': SnapshotManifest(
      version: '3.3.0',
      exportedAt: when,
      appName: 'Trip Tracker 2026',
      tripCount: 1,
      type: 'single_trip_snapshot',
    ).toJson(),
    'trips': [trip.toJson()],
    'members': [for (final m in members) m.toJson()],
    'groups': <Map<String, dynamic>>[],
    'expenses': [for (final e in tripExpenses) e.toJson()],
    'categories': [for (final c in categories) c.toJson()],
  };

  return const JsonEncoder.withIndent('  ').convert(bundle);
}

/// Parses and validates a .triptracker or backup JSON string.
SnapshotValidationResult validateOfflineSnapshot(String jsonString) {
  if (jsonString.trim().isEmpty) {
    return const SnapshotValidationResult(valid: false, error: 'Empty or invalid JSON payload.');
  }

  if (jsonString.length > 10 * 1024 * 1024) {
    return const SnapshotValidationResult(
      valid: false,
      error: 'Backup file exceeds maximum allowed size (10MB).',
    );
  }

  Object? parsed;
  try {
    parsed = jsonDecode(jsonString);
  } catch (_) {
    return const SnapshotValidationResult(valid: false, error: 'Invalid JSON format.');
  }

  if (parsed is! Map) {
    return const SnapshotValidationResult(
      valid: false,
      error: 'Root object must be a valid JSON dictionary.',
    );
  }

  final raw = Map<String, dynamic>.from(parsed);
  raw.remove('__proto__');
  raw.remove('constructor');
  raw.remove('prototype');

  final trips = raw['trips'];
  if (trips is! List || trips.isEmpty) {
    return const SnapshotValidationResult(valid: false, error: 'Missing or invalid "trips" array.');
  }

  if (trips.length > 50) {
    return const SnapshotValidationResult(
      valid: false,
      error: 'Import contains too many trips (max 50).',
    );
  }

  final firstTrip = trips.first;
  final primaryTripName = (firstTrip is Map && firstTrip['name'] != null)
      ? firstTrip['name'].toString()
      : 'Untitled Trip';

  SnapshotManifest? manifest;
  if (raw['manifest'] is Map) {
    manifest = SnapshotManifest.fromJson(Map<String, dynamic>.from(raw['manifest'] as Map));
  }

  final expenses = raw['expenses'];
  int expenseCount = 0;
  double totalSpend = 0.0;
  final sanitizedExpenses = <Map<String, dynamic>>[];

  if (expenses is List) {
    for (final e in expenses) {
      if (e is Map) {
        final row = Map<String, dynamic>.from(e);
        sanitizedExpenses.add(row);
        final amt = (row['amount'] as num?)?.toDouble() ?? 0.0;
        final title = (row['title'] as String?)?.trim() ?? '';
        if (amt > 0 && !title.startsWith('Settlement:')) {
          totalSpend += amt;
        }
      }
    }
    expenseCount = sanitizedExpenses.length;
  }

  return SnapshotValidationResult(
    valid: true,
    manifest: manifest,
    primaryTripName: primaryTripName,
    tripCount: trips.length,
    expenseCount: expenseCount,
    totalSpend: totalSpend,
    sanitizedData: raw,
  );
}
