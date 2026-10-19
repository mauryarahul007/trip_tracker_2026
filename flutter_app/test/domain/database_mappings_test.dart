import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/data/mappers/row_mappers.dart';

/// Real DB row -> domain, checked against rows/objects generated from the
/// TS mappers' shapes (docs/flutter-migration/fixtures/database_mappings.json).
void main() {
  late Map<String, dynamic> fx;
  setUpAll(() {
    fx = jsonDecode(
      File('../docs/flutter-migration/fixtures/database_mappings.json').readAsStringSync(),
    ) as Map<String, dynamic>;
  });

  Map<String, dynamic> row(String k) => Map<String, dynamic>.from(fx[k]['dbRow'] as Map);
  Map<String, dynamic> app(String k) => Map<String, dynamic>.from(fx[k]['appObject'] as Map);

  test('trip row -> domain', () {
    final t = tripFromRow(row('trips')).toJson();
    final a = app('trips');
    for (final k in [
      'id',
      'name',
      'startDate',
      'endDate',
      'baseCurrency',
      'ownerId',
      'joinCode',
      'archived',
      'destination',
    ]) {
      expect(t[k], a[k], reason: k);
    }
  });

  test('member row -> domain', () {
    final m = memberFromRow(row('members')).toJson();
    final a = app('members');
    for (final k in ['id', 'tripId', 'name', 'linkedUserId', 'archived', 'joinDate']) {
      expect(m[k], a[k], reason: k);
    }
  });

  test('expense row -> domain matches mapExpense()', () {
    final e = expenseFromRow(row('expenses')).toJson();
    final a = app('expenses')..removeWhere((_, v) => v == null);
    for (final k in a.keys) {
      expect(e[k], a[k], reason: k);
    }
  });

  test('expense domain -> upsert args uses real RPC params', () {
    final args = expenseToUpsertArgs(expenseFromRow(row('expenses')));
    expect(args['p_category'], 'Entertainment');
    expect(args['p_paid_by'], row('expenses')['paid_by']);
    expect(args['p_split_member_ids'], row('expenses')['split_member_ids']);
    expect(args['p_receipt_path'], 'receipts/t1/e1.jpg');
  });

  test('message row -> domain', () {
    final m = messageFromRow(row('messages')).toJson();
    final a = app('messages');
    for (final k in ['id', 'tripId', 'memberId', 'body', 'eventKind', 'createdAt', 'reactions', 'isPinned']) {
      expect(m[k], a[k], reason: k);
    }
  });
}
