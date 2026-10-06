import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/currency.dart';

/// Locale-dependent money formatting vs Node ICU (en-US, en-IN, de, fr, ja,
/// Arabic-Indic digits, hi-IN, es). Intentional/ICU-version differences are
/// listed in `_knownDifferences` so they stay visible instead of silently skipped.
const _knownDifferences = <String, String>{};

void main() {
  final cases = [
    for (final c in (jsonDecode(File('../docs/flutter-migration/fixtures/locale_money.json').readAsStringSync())
        as Map<String, dynamic>)['cases'] as List)
      c as Map<String, dynamic>,
  ];

  test('formatMoneyNumber matches ICU for every locale/currency/amount', () {
    final failures = <String>[];
    for (final c in cases) {
      final key = '${c['locale']}|${c['currency']}|${c['amount']}';
      if (_knownDifferences.containsKey(key)) continue;
      final got = formatMoneyNumber((c['amount'] as num).toDouble(), c['currency'] as String, c['locale'] as String);
      if (got != c['result']) failures.add('$key: got ${jsonEncode(got)} want ${jsonEncode(c['result'])}');
    }
    expect(failures, isEmpty, reason: '${failures.length}/${cases.length} differ:\n${failures.take(25).join('\n')}');
  });
}
