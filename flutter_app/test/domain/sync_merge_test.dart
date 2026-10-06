import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/sync_merge.dart';
import 'package:trip_tracker/domain/models/expense.dart';

Expense e(String id, {double amount = 10, String title = 't'}) => Expense(
      id: id,
      tripId: 't1',
      title: title,
      amount: amount,
      currency: 'USD',
      category: 'Food',
      date: '2026-01-01',
      paidBy: 'm1',
      splitMode: 'equal',
      createdAt: 0,
      updatedAt: 0,
    );

void main() {
  test('collectDirtyIds', () {
    final ids = collectDirtyIds(const [
      QueuedOp('addExpense', {'tempId': 'a'}),
      QueuedOp('updateExpense', {'id': 'b'}),
      QueuedOp('emptyRecycleBin', {'tripId': 't'}),
    ]);
    expect(ids, {'a', 'b'});
  });

  test('mergeExpenses: server overwrites clean, local keeps dirty and optimistic', () {
    final merged = mergeExpenses(
      [e('1', amount: 1), e('2', amount: 2), e('3', amount: 3)],
      [e('1', amount: 100), e('2', amount: 200)],
      {'2', '3'},
    );
    expect(merged.map((x) => '${x.id}:${x.amount}'), ['1:100.0', '2:2.0', '3:3.0']);
  });

  test('detectExpenseConflicts only flags dirty + meaningfully different', () {
    final queue = [const QueuedOp('deleteExpense', {'id': 'a'})];
    final c = detectExpenseConflicts(
      [e('a', amount: 1), e('b', amount: 1), e('c')],
      [e('a', amount: 2), e('b', amount: 2), e('c')],
      {'a', 'c'},
      queue,
    );
    expect(c.single.expenseId, 'a');
    expect(c.single.queuedOp, 'deleteExpense');
  });
}
