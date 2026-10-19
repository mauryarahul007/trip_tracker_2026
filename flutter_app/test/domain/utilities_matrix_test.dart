import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/trip_utilities.dart';

const _now = 1791244800000; // fixture clock

void main() {
  final m =
      (jsonDecode(File('../docs/flutter-migration/fixtures/utilities.json').readAsStringSync())
              as Map<String, dynamic>)['matrix']
          as Map<String, dynamic>;
  List<Map<String, dynamic>> cases(String k) => [for (final c in m[k] as List) c as Map<String, dynamic>];

  test('sortTrips by name (numeric, case/accent-insensitive) and date', () {
    final input = [for (final t in m['sortTripsInput'] as List) Map<String, dynamic>.from(t as Map<String, dynamic>)];
    for (final c in cases('sortTrips')) {
      final got = sortTrips(input, c['mode'] as String).map((t) => t['id']).toList();
      expect(got, c['result'], reason: '${c['mode']}');
    }
  });

  test('extractPrimaryCity', () {
    for (final c in cases('cities')) {
      final stops = c['stops'] as List?;
      final got = extractPrimaryCity(
        (c['destination'] as String?) ?? '',
        stops?.map((s) => s as Map<String, dynamic>).toList(),
      );
      expect(got, c['result'], reason: jsonEncode(c));
    }
  });

  test('formatDateRange and tripDayNumber', () {
    for (final c in cases('dateRanges')) {
      expect(formatDateRange(c['a'] as String, c['b'] as String), c['result'], reason: jsonEncode(c));
    }
    for (final c in cases('tripDays')) {
      expect(tripDayNumber(c['a'] as String, c['b'] as String), c['result'], reason: jsonEncode(c));
    }
  });

  test('formatRelativeTime thresholds', () {
    for (final c in cases('relative')) {
      final ago = c['ago'];
      final ts = ago is num
          ? DateTime.fromMillisecondsSinceEpoch(_now - ago.toInt(), isUtc: true).toIso8601String()
          : 'not-a-date';
      expect(formatRelativeTime(ts, _now), c['result'], reason: jsonEncode(c));
    }
  });

  test('parseJoinDeepLink', () {
    for (final c in cases('joinLinks')) {
      expect(parseJoinDeepLink(c['url'] as String), c['result'], reason: jsonEncode(c));
    }
  });

  test('UPI id validation and URIs for every app scheme', () {
    for (final c in cases('upiIds')) {
      expect(isValidUpiId(c['id'] as String), c['result'], reason: jsonEncode(c));
    }
    for (final c in cases('upiUris')) {
      final got = generateUpiUri({
        'payeeUpiId': 'a@okaxis',
        'payeeName': 'Al Ice',
        'amount': 12.5,
        'note': 'Trip & fun',
      }, c['scheme'] as String?);
      expect(got, c['result'], reason: jsonEncode(c));
    }
  });

  test('buildAutoGroupName', () {
    for (final c in cases('groupNames')) {
      expect(buildAutoGroupName(List<String>.from(c['names'] as List)), c['result'], reason: jsonEncode(c));
    }
  });

  test('inferSeasonalClimate', () {
    for (final c in cases('climates')) {
      final got = inferSeasonalClimate(c['destination'] as String, c['startDate'] as String?);
      expect(jsonDecode(jsonEncode(got)), c['result'], reason: jsonEncode(c));
    }
  });

  test('describeSyncItem', () {
    for (final c in cases('syncLabels')) {
      expect(describeSyncItem(c['item'] as Map<String, dynamic>), c['result'], reason: jsonEncode(c['item']));
    }
  });
}
