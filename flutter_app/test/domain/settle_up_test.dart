import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/settle_up.dart';
import 'package:trip_tracker/domain/logic/settlement.dart';

void main() {
  const t = Transfer(
    from: 'a',
    to: 'b',
    fromLabel: 'Ben',
    toLabel: 'Asha',
    fromMemberId: 'm2',
    toMemberId: 'm1',
    amount: 100,
  );

  test('full payment: web title, debtor pays, creditor takes 100%', () {
    final p = planSettlement(t, amount: 100, currency: 'INR', date: '2026-10-06')!;
    expect(p.isPartial, isFalse);
    expect(p.submission.title, 'Settlement: Ben ➔ Asha');
    expect(p.submission.paidBy, 'm2');
    expect(p.submission.splitMemberIds, ['m1']);
    expect(p.submission.splitConfig, {'m1': 100});
    expect(p.submission.splitMode, 'exact');
    expect(p.submission.category, 'cat-misc');
  });

  test('partial payment leaves the rest; note joins the title', () {
    final p = planSettlement(t, amount: 40, currency: 'INR', date: '2026-10-06', note: ' UPI ')!;
    expect(p.isPartial, isTrue);
    expect(p.remaining, 60);
    expect(p.submission.title, 'Settlement: Ben ➔ Asha — UPI');
  });

  test('non-positive amount is refused', () {
    expect(planSettlement(t, amount: 0, currency: 'INR', date: 'd'), isNull);
  });
}
