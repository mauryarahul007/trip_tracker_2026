import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/models/expense.dart';
import 'package:trip_tracker/features/expenses/presentation/conflict_sheet.dart';

void main() {
  const local = Expense(
    id: 'e1',
    tripId: 't1',
    title: 'Beach lunch',
    amount: 90,
    currency: 'INR',
    category: 'food',
    date: '2026-10-20',
    paidBy: 'm1',
    splitMode: 'equal',
    splitMemberIds: ['m1', 'm2', 'm3'],
    createdAt: 1,
    updatedAt: 1,
  );

  List<ConflictField> diff(Expense server) =>
      conflictFields(local, server, money: (v, c) => '$c $v', nameOf: (id) => 'name-$id');

  test('only the fields that were edited differ', () {
    final fields = diff(local.copyWith(amount: 40, paidBy: 'm2', updatedAt: 2));
    expect(fields.where((f) => f.differs).map((f) => f.key), [ConflictFieldKey.amount, ConflictFieldKey.paidBy]);
    expect(fields.firstWhere((f) => f.key == ConflictFieldKey.paidBy).server, 'name-m2');
  });

  test('split compares mode and head count', () {
    final fields = diff(local.copyWith(splitMemberIds: ['m1', 'm2']));
    expect(fields.where((f) => f.differs).map((f) => f.key), [ConflictFieldKey.split]);
  });

  test('an invisible-only change (updatedAt) shows no differing field', () {
    expect(diff(local.copyWith(updatedAt: 9)).any((f) => f.differs), isFalse);
  });

  test('category and split use readable text when the caller supplies it', () {
    final fields = conflictFields(
      local,
      local.copyWith(category: 'cat-stay', splitMemberIds: ['m1']),
      money: (v, c) => '$c $v',
      nameOf: (id) => id,
      categoryOf: (id) => id == 'food' ? 'Food & Dining' : 'Stay & Hotel',
      splitOf: (mode, n) => '$mode for $n',
    );
    final cat = fields.firstWhere((f) => f.key == ConflictFieldKey.category);
    expect((cat.local, cat.server), ('Food & Dining', 'Stay & Hotel'));
    final split = fields.firstWhere((f) => f.key == ConflictFieldKey.split);
    expect((split.local, split.server), ('equal for 3', 'equal for 1'));
  });
}
