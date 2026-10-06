import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/duplicate_expense_detector.dart';
import 'package:trip_tracker/domain/models/category.dart';
import 'package:trip_tracker/domain/models/expense.dart';
import 'package:trip_tracker/domain/models/member.dart';

void main() {
  test('detectDuplicateExpense matrix matches TS (every branch)', () {
    final m = (jsonDecode(File('../docs/flutter-migration/fixtures/duplicate_burn_predictive.json').readAsStringSync())
        as Map<String, dynamic>)['detectorMatrix'] as Map<String, dynamic>;
    final existing = [for (final e in m['existing'] as List) Expense.fromJson({...e as Map<String, dynamic>, 'tripId': 't1', 'splitMode': 'equal'})];
    final cats = [for (final c in m['categories'] as List) Category.fromJson(c as Map<String, dynamic>)];
    final members = [for (final x in m['members'] as List) Member.fromJson(x as Map<String, dynamic>)];

    for (final c in m['cases'] as List) {
      final cand = c['candidate'] as Map<String, dynamic>;
      final want = c['result'] as Map<String, dynamic>?;
      final got = detectDuplicateExpense(cand, existing, cats, members);
      final why = jsonEncode(cand);
      if (want == null) {
        expect(got, isNull, reason: why);
      } else {
        expect(got, isNotNull, reason: why);
        expect(got!.confidence, want['confidence'], reason: why);
        expect(got.reason, want['reason'], reason: why);
        expect(got.matchedExpense.id, want['matchedExpense']['id'], reason: why);
        expect(got.matchedPayerName, want['matchedPayerName'], reason: why);
      }
    }
  });
}
