import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/expense_draft.dart';
import 'package:trip_tracker/domain/logic/last_expense.dart';
import 'package:trip_tracker/domain/logic/settlement_share_card.dart';
import 'package:trip_tracker/domain/models/expense.dart';

class MemStore implements KeyValueStore {
  final m = <String, String>{};
  @override
  String? getString(String key) => m[key];
  @override
  Future<void> setString(String key, String value) async => m[key] = value;
  @override
  Future<void> remove(String key) async => m.remove(key);
}

void main() {
  final fx = jsonDecode(File('../docs/flutter-migration/fixtures/expense_helpers.json').readAsStringSync()) as Map<String, dynamic>;

  test('latest non-settlement expense matches the web (ties, trips, deleted, settlements)', () {
    final last = fx['last'] as Map<String, dynamic>;
    final expenses = [for (final e in last['expenses'] as List) Expense.fromJson(e as Map<String, dynamic>)];
    for (final c in last['cases'] as List) {
      final input = (c['empty'] == true) ? <Expense>[] : expenses;
      expect(latestNonSettlementExpense(input, tripId: c['tripId'] as String?)?.id, c['result'], reason: jsonEncode(c));
    }
  });

  test('draft save format and TTL boundary match the web', () async {
    final d = fx['draft'] as Map<String, dynamic>;
    expect(draftTtl.inMilliseconds, d['ttl']);
    const t0 = 1000000;
    final store = MemStore();
    await saveDraft(store, 'k', {'title': 'Taxi', 'amount': '12'}, DateTime.fromMillisecondsSinceEpoch(t0));
    expect(jsonDecode(store.m['k']!), d['saved']);

    for (final l in d['loads'] as List) {
      await saveDraft(store, 'k', {'title': 'Taxi', 'amount': '12'}, DateTime.fromMillisecondsSinceEpoch(t0));
      final got = await loadDraft(store, 'k', DateTime.fromMillisecondsSinceEpoch(t0 + (l['elapsed'] as int)));
      expect(got, l['result'], reason: '${l['elapsed']}');
      expect(!store.m.containsKey('k'), l['removed'], reason: 'removed after ${l['elapsed']}');
    }
    for (final mcase in d['malformed'] as List) {
      store.m['m'] = mcase['raw'] as String;
      expect(await loadDraft(store, 'm', DateTime.fromMillisecondsSinceEpoch(6)), mcase['result'], reason: mcase['raw'] as String);
      expect(!store.m.containsKey('m'), mcase['removed'], reason: 'removed ${mcase['raw']}');
    }
    expect(await loadDraft(store, 'absent', DateTime.fromMillisecondsSinceEpoch(t0)), isNull);
  });

  test('settlement share card layout, caption and file name match the web', () {
    for (final c in fx['shareCard'] as List) {
      final i = c['input'] as Map<String, dynamic>;
      final amount = i['amount'] == 'NaN' ? double.nan : (i['amount'] as num).toDouble();
      final got = settlementShareCardLayout(SettlementShareCardInput(
        tripName: i['tripName'] as String,
        fromLabel: i['fromLabel'] as String,
        toLabel: i['toLabel'] as String,
        amount: amount,
        currencySymbol: i['currencySymbol'] as String,
        upiId: i['upiId'] as String?,
      ));
      final want = c['layout'] as Map<String, dynamic>;
      expect(got.width, want['width']);
      expect(got.height, want['height']);
      expect(got.amountText, want['amountText']);
      expect(got.caption, want['caption']);
      expect(got.fileName, want['fileName']);
      expect(got.lines, List<String>.from(want['lines'] as List));
    }
  });
}
