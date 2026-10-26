import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/settlement.dart';
import 'package:trip_tracker/features/expenses/presentation/widgets/balance_bars.dart';

void main() {
  MemberBalance b(String id, double v) => MemberBalance(memberId: id, name: id, balance: v);

  test('rows skip settled people and put the biggest creditor first', () {
    final rows = balanceBarRows([b('ben', -30), b('asha', 60), b('dev', 0.004), b('cara', -30)]);
    expect(rows.map((r) => r.memberId), ['asha', 'ben', 'cara']);
  });

  test('everyone settled gives no rows', () {
    expect(balanceBarRows([b('a', 0), b('b', 0.001)]), isEmpty);
  });
}
