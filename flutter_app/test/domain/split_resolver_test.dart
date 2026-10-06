import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/currency.dart';
import 'package:trip_tracker/domain/logic/split_resolver.dart';
import 'package:trip_tracker/domain/models/expense.dart';

void main() {
  final cases = [
    for (final c in (jsonDecode(File('../docs/flutter-migration/fixtures/split_resolver.json').readAsStringSync()) as Map<String, dynamic>)['cases'] as List)
      c as Map<String, dynamic>,
  ];

  test('resolveShares matches the web for every fixture case (${cases.length} cases)', () {
    final failures = <String>[];
    for (final c in cases) {
      final e = c['expense'] as Map<String, dynamic>;
      final got = resolveShares(
        amount: (e['amount'] as num).toDouble(),
        splitMode: e['splitMode'] as String,
        paidBy: e['paidBy'] as String,
        participants: List<String>.from(c['participants'] as List),
        currency: e['currency'] as String?,
        splitConfig: (e['splitConfig'] as Map<String, dynamic>?)?.map((k, v) => MapEntry(k, (v as num).toDouble())),
        itemizedConfig: e['itemizedConfig'] == null ? null : ItemizedReceiptConfig.fromJson(e['itemizedConfig'] as Map<String, dynamic>),
      );
      final want = (c['result'] as Map<String, dynamic>).map((k, v) => MapEntry(k, (v as num).toDouble()));
      if (got.length != want.length || want.entries.any((w) => got[w.key] != w.value)) {
        failures.add('${c['label']}: got $got want $want');
      }
    }
    expect(failures, isEmpty, reason: '${failures.length}/${cases.length}:\n${failures.take(15).join('\n')}');
  });

  test('shares always sum to the amount for every mode that distributes (property)', () {
    for (final c in cases) {
      final e = c['expense'] as Map<String, dynamic>;
      final mode = e['splitMode'] as String;
      final res = (c['result'] as Map<String, dynamic>);
      if (res.isEmpty || mode == 'itemized') continue;
      // Percent splits that don't total 100% are rejected by form validation; the resolver just scales.
      if (mode == 'percentage') {
        final cfg = (e['splitConfig'] as Map<String, dynamic>?) ?? const {};
        if ((cfg.values.fold<double>(0, (a, b) => a + (b as num).toDouble()) - 100).abs() > 0.011) continue;
      }
      final sum = res.values.fold<double>(0, (a, b) => a + (b as num).toDouble());
      // Within half a currency unit (the web rounds 100.01 JPY to 100).
      final tol = getCurrencyDecimals((e['currency'] as String?) ?? '') == 0 ? 0.5 : 0.0051;
      expect((sum - (e['amount'] as num)).abs() < tol, isTrue, reason: '${c['label']} sum=$sum');
    }
  });
}
