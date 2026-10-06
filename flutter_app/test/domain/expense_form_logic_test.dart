import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/expense_form_logic.dart';
import 'package:trip_tracker/domain/models/expense.dart';
import 'package:trip_tracker/domain/models/member.dart';
import 'package:trip_tracker/domain/models/trip.dart';

ExpenseFormInput form({
  String title = 'Dinner',
  String amount = '100',
  String currency = 'INR',
  String base = 'INR',
  String mode = 'equal',
  List<String> split = const ['a', 'b'],
  Map<String, String> config = const {},
  String paidBy = 'a',
  PayerMode payerMode = PayerMode.single,
  Map<String, String> multi = const {},
  bool multiEnabled = false,
  bool fx = false,
  List<ReceiptItem> items = const [],
  String tax = '',
  String tip = '',
  String discount = '',
}) => ExpenseFormInput(
  title: title,
  amountText: amount,
  currency: currency,
  baseCurrency: base,
  category: 'Food',
  date: '2026-10-06',
  paidBy: paidBy,
  splitMode: mode,
  splitSelectedIds: split,
  splitConfig: config,
  payerMode: payerMode,
  multiPayerShares: multi,
  multiPayerEnabled: multiEnabled,
  currencyFxEnabled: fx,
  receiptItems: items,
  receiptTax: tax,
  receiptTip: tip,
  receiptDiscount: discount,
);

String? err(ExpenseFormInput f) => buildExpenseSubmission(f).error;
ExpenseSubmission ok(ExpenseFormInput f) {
  final r = buildExpenseSubmission(f);
  expect(r.error, isNull, reason: r.error);
  return r.submission!;
}

void main() {
  explainTests();
  group('jsParseFloat', () {
    test('matches JS parseFloat on prefixes, signs, exponents and junk', () {
      expect(jsParseFloat('12abc'), 12);
      expect(jsParseFloat('  3.5kg'), 3.5);
      expect(jsParseFloat('.5'), 0.5);
      expect(jsParseFloat('-2'), -2);
      expect(jsParseFloat('1e3'), 1000);
      expect(jsParseFloat('5.'), 5);
      expect(jsParseFloat('abc').isNaN, isTrue);
      expect(jsParseFloat('').isNaN, isTrue);
      expect(jsParseFloat('-').isNaN, isTrue);
    });
  });

  group('validation order and messages (verbatim from the web)', () {
    test('amount first: blank, zero, negative, junk', () {
      for (final a in ['', '0', '-5', 'abc', '   ']) {
        expect(err(form(amount: a)), 'Please enter a valid amount greater than 0.', reason: '"$a"');
      }
    });

    test('amount is checked before title, title before members', () {
      expect(err(form(amount: '', title: '')), 'Please enter a valid amount greater than 0.');
      expect(err(form(title: '   ', split: [])), 'Please enter a title for the expense.');
      expect(err(form(split: [])), 'Please select at least one member to split the expense with.');
    });

    test('math expressions are evaluated: 12*3+4 -> 40', () {
      expect(ok(form(amount: '12*3+4')).amount, 40);
      expect(ok(form(amount: '2+3*4')).amount, 14);
    });

    test('title is trimmed on the way out', () {
      expect(ok(form(title: '  Taxi  ')).title, 'Taxi');
    });

    test('percentages must total 100 (within 0.02) and show the live sum', () {
      expect(
        err(form(mode: 'percentage', config: {'a': '60', 'b': '30'})),
        'Split percentages sum (90.00) must equal 100%.',
      );
      expect(err(form(mode: 'percentage', config: {'a': '60', 'b': '39.97'})), isNotNull); // 0.03 off
      expect(err(form(mode: 'percentage', config: {'a': '60', 'b': '39.99'})), isNull); // 0.01 off is fine
      expect(ok(form(mode: 'percentage', config: {'a': '60', 'b': '40'})).splitConfig, {'a': 60.0, 'b': 40.0});
    });

    test('exact amounts must equal the total, message uses the currency symbol', () {
      expect(
        err(form(mode: 'exact', config: {'a': '50', 'b': '40'})),
        'Split exact amounts sum (90.00) must equal ₹ 100.00.',
      );
      expect(
        err(form(mode: 'exact', currency: 'USD', base: 'USD', amount: '10', config: {'a': '4'})),
        'Split exact amounts sum (4.00) must equal \$ 10.00.',
      );
      expect(ok(form(mode: 'exact', config: {'a': '70', 'b': '30'})).splitConfig, {'a': 70.0, 'b': 30.0});
    });

    test('blank config entries count as 0; only selected members count toward the sum', () {
      expect(err(form(mode: 'exact', config: {'a': '100', 'zz': '50'})), isNull); // zz isn't in the split
      expect(ok(form(mode: 'exact', config: {'a': '100'})).splitConfig, {'a': 100.0, 'b': 0.0});
    });

    test('equal mode never carries a splitConfig; Shares (custom) keeps its weights (web bug fixed on purpose)', () {
      expect(ok(form(mode: 'equal', config: {'a': '5'})).splitConfig, isNull);
      expect(ok(form(mode: 'custom', config: {'a': '2', 'b': '1'})).splitConfig, {'a': 2.0, 'b': 1.0});
    });

    test('preview matches what will be saved, for every mode', () {
      expect(previewShares(form(amount: '100')), {'a': 50.0, 'b': 50.0});
      expect(previewShares(form(amount: '100', mode: 'custom', config: {'a': '3', 'b': '1'})), {'a': 75.0, 'b': 25.0});
      expect(previewShares(form(amount: '100', mode: 'percentage', config: {'a': '70', 'b': '30'})), {
        'a': 70.0,
        'b': 30.0,
      });
      expect(previewShares(form(amount: '100', mode: 'exact', config: {'a': '60', 'b': '40'})), {'a': 60.0, 'b': 40.0});
      expect(
        previewShares(form(amount: '12*3+4', split: ['a', 'b', 'c'])).values.fold<double>(0, (s, v) => s + v),
        closeTo(40, 1e-9),
      );
      expect(previewShares(form(amount: '')), isEmpty);
      expect(previewShares(form(amount: '100', split: [])), isEmpty);
    });

    test('itemized preview spreads items, tax and tip', () {
      const items = [
        ReceiptItem(id: '1', name: 'x', amount: 30, assignedMemberIds: ['a']),
        ReceiptItem(id: '2', name: 'y', amount: 60, assignedMemberIds: ['b']),
      ];
      final p = previewShares(form(amount: '100', mode: 'itemized', items: items, tax: '10'));
      expect(p['a']! + p['b']!, closeTo(100, 0.011));
      expect(p['b']! > p['a']!, isTrue);
      expect(itemizedTotal(items, tax: '10', tip: '5', discount: '3'), 102);
      expect(itemizedTotal(const [], discount: '50'), 0);
    });

    test('defaults: payer resolution, membership on a date', () {
      const ms = [
        Member(id: 'a', name: 'A', joinDate: '2026-10-03', leaveDate: '2026-10-08'),
        Member(id: 'b', name: 'B'),
      ];
      expect(resolveDefaultExpensePayerId(ms, parsedPaidById: 'b', currentMemberId: 'a'), 'b');
      expect(resolveDefaultExpensePayerId(ms, parsedPaidById: 'zz', currentMemberId: 'a'), 'a');
      expect(resolveDefaultExpensePayerId(ms, currentMemberId: 'zz'), isNull);
      expect(resolveDefaultExpensePayerId(ms, currentMemberId: 'zz', fallbackToFirstMember: true), 'a');
      expect(resolveDefaultExpensePayerId(const [], fallbackToFirstMember: true), isNull);
      expect(isMemberPresentOnDate(ms[0], '2026-10-02'), isFalse);
      expect(isMemberPresentOnDate(ms[0], '2026-10-03'), isTrue);
      expect(isMemberPresentOnDate(ms[0], '2026-10-08'), isTrue);
      expect(isMemberPresentOnDate(ms[0], '2026-10-09'), isFalse);
      expect(isMemberPresentOnDate(ms[1], '1999-01-01'), isTrue);
      expect(todayDateString(DateTime(2026, 3, 9)), '2026-03-09');
    });
  });

  group('itemized', () {
    const item = ReceiptItem(id: '1', name: 'Pasta', amount: 30);
    test('needs at least one item', () {
      expect(err(form(mode: 'itemized')), 'Please add at least one item to the itemized receipt breakdown.');
    });

    test('unassigned items go to everyone in the split; tax/tip/discount parse, zero becomes absent', () {
      final s = ok(form(mode: 'itemized', items: const [item], tax: '2.5', tip: '0', discount: 'x'));
      expect(s.itemizedConfig!.items.single.assignedMemberIds, ['a', 'b']);
      expect(s.itemizedConfig!.tax, 2.5);
      expect(s.itemizedConfig!.tip, isNull);
      expect(s.itemizedConfig!.discount, isNull);
    });

    test('assigned items keep their assignees', () {
      final s = ok(
        form(
          mode: 'itemized',
          items: const [
            ReceiptItem(id: '1', name: 'x', amount: 5, assignedMemberIds: ['b']),
          ],
        ),
      );
      expect(s.itemizedConfig!.items.single.assignedMemberIds, ['b']);
    });

    test('percent/exact sum check is skipped for itemized', () {
      expect(err(form(mode: 'itemized', items: const [item])), isNull);
    });
  });

  group('multi-payer', () {
    test('ignored unless the flag is on and the mode is multiple', () {
      final s = ok(form(multi: {'a': '100'}, multiEnabled: false, payerMode: PayerMode.multiple));
      expect(s.paidByShares, isNull);
      expect(s.paidBy, 'a');
    });

    test('nobody allocated -> message', () {
      expect(
        err(form(payerMode: PayerMode.multiple, multiEnabled: true, multi: {'a': '', 'b': '0'})),
        'Please allocate payment amounts for at least one member.',
      );
      expect(
        err(form(payerMode: PayerMode.multiple, multiEnabled: true, multi: {'a': '0.004'})),
        'Please allocate payment amounts for at least one member.',
      );
    });

    test('must add up to the total within 0.02, with the exact difference message', () {
      expect(
        err(form(payerMode: PayerMode.multiple, multiEnabled: true, multi: {'a': '60', 'b': '30'})),
        'Multi-payer sum (₹ 90.00) must equal total expense (₹ 100.00). Difference: ₹ 10.00.',
      );
      expect(err(form(payerMode: PayerMode.multiple, multiEnabled: true, multi: {'a': '60', 'b': '39.99'})), isNull);
    });

    test('top payer becomes paidBy; ties keep entry order', () {
      final s = ok(form(payerMode: PayerMode.multiple, multiEnabled: true, paidBy: 'a', multi: {'a': '30', 'b': '70'}));
      expect(s.paidBy, 'b');
      expect(s.paidByShares, {'a': 30.0, 'b': 70.0});
      final tie = ok(
        form(payerMode: PayerMode.multiple, multiEnabled: true, paidBy: 'a', multi: {'b': '50', 'a': '50'}),
      );
      expect(tie.paidBy, 'b'); // first entered wins the tie
    });

    test('amounts are rounded to cents', () {
      final s = ok(
        form(amount: '10', payerMode: PayerMode.multiple, multiEnabled: true, multi: {'a': '3.333', 'b': '6.667'}),
      );
      expect(s.paidByShares, {'a': 3.33, 'b': 6.67});
    });
  });

  group('foreign currency (stored in the trip base currency)', () {
    test('FX on: converts using default rates (10 USD -> 872.50 INR)', () {
      final s = ok(form(amount: '10', currency: 'USD', base: 'INR', fx: true));
      expect(s.amount, 872.5);
      expect(s.currency, 'USD'); // original currency is still recorded
    });

    test('custom per-trip rate wins', () {
      const f = ExpenseFormInput(
        title: 't',
        amountText: '10',
        currency: 'USD',
        baseCurrency: 'INR',
        category: 'c',
        date: 'd',
        paidBy: 'a',
        splitMode: 'equal',
        splitSelectedIds: ['a'],
        currencyFxEnabled: true,
        customRates: {'INR': 80.0},
      );
      expect(ok(f).amount, 800);
    });

    test('FX off: the typed number is kept as-is (matches the web)', () {
      expect(ok(form(amount: '10', currency: 'USD', base: 'INR', fx: false)).amount, 10);
    });

    test('same currency is never converted', () {
      expect(ok(form(amount: '10', currency: 'INR', base: 'INR', fx: true)).amount, 10);
    });

    test('multi-payer shares are converted and the rounding cent lands on the largest payer', () {
      final s = ok(
        form(
          amount: '10',
          currency: 'USD',
          base: 'INR',
          fx: true,
          payerMode: PayerMode.multiple,
          multiEnabled: true,
          multi: {'a': '3.33', 'b': '3.33', 'c': '3.34'},
          split: ['a', 'b', 'c'],
        ),
      );
      expect(s.amount, 872.5);
      final sum = s.paidByShares!.values.fold<double>(0, (a, b) => a + b);
      expect(
        (sum - 872.5).abs() < 0.0001,
        isTrue,
        reason: 'converted shares must add to the converted total, got $sum',
      );
      expect(s.paidBy, 'c');
    });
  });

  group('store rules', () {
    Trip trip({bool frozen = false, bool closed = false, double? threshold}) =>
        Trip.fromJson({'id': 't', 'name': 'T', 'frozen': frozen, 'closed': closed, 'approvalThreshold': threshold});

    test('frozen trips block everyone but a superadmin; closed trips block everyone', () {
      expect(
        tripWriteBlockReason(trip(frozen: true)),
        'This trip is currently locked / frozen by Superadmin. Modifications are disabled.',
      );
      expect(tripWriteBlockReason(trip(frozen: true), isSuperadmin: true), isNull);
      expect(tripWriteBlockReason(trip(closed: true)), 'This trip is closed. Reopen it to add expenses.');
      expect(
        tripWriteBlockReason(trip(closed: true), isSuperadmin: true),
        'This trip is closed. Reopen it to add expenses.',
      );
      expect(tripWriteBlockReason(trip()), isNull);
      expect(tripWriteBlockReason(null), isNull);
    });

    test('approval threshold: at-or-above waits; settlements, flag off, no threshold never wait', () {
      String s(double amount, {bool enabled = true, bool settlement = false, double? th = 100}) =>
          computeApprovalStatus(
            trip(threshold: th),
            thresholdEnabled: enabled,
            isSettlement: settlement,
            amount: amount,
          );
      expect(s(99.99), 'confirmed');
      expect(s(100), 'pending_approval');
      expect(s(500), 'pending_approval');
      expect(s(500, enabled: false), 'confirmed');
      expect(s(500, settlement: true), 'confirmed');
      expect(s(500, th: null), 'confirmed');
      expect(s(500, th: 0), 'confirmed');
      expect(computeApprovalStatus(null, thresholdEnabled: true, isSettlement: false, amount: 1e9), 'confirmed');
    });

    test('settlement detection is the title prefix', () {
      expect(isSettlementTitle('Settlement: A → B'), isTrue);
      expect(isSettlementTitle('settlement'), isFalse);
      expect(isSettlementTitle('Dinner (Settlement: no)'), isFalse);
    });
  });
}

void explainTests() {
  group('explainShares', () {
    test('equal / shares / percent / exact give working that matches the resolver', () {
      final eq = explainShares(form(amount: '100', split: ['a', 'b', 'c']));
      expect(eq.map((e) => e.formula).toSet(), {'100.00 ÷ 3'});
      expect(eq.map((e) => e.amount).fold<double>(0, (a, b) => a + b), closeTo(100, 1e-9));

      final sh = explainShares(form(amount: '90', mode: 'custom', config: {'a': '2', 'b': '1'}));
      expect(sh.firstWhere((e) => e.memberId == 'a').formula, '90.00 × 2 ÷ 3 shares');
      expect(sh.firstWhere((e) => e.memberId == 'a').amount, 60);

      final pc = explainShares(form(amount: '200', mode: 'percentage', config: {'a': '25', 'b': '75'}));
      expect(pc.firstWhere((e) => e.memberId == 'b').formula, '200.00 × 75%');

      final ex = explainShares(form(amount: '100', mode: 'exact', config: {'a': '60', 'b': '40'}));
      expect(ex.firstWhere((e) => e.memberId == 'a').formula, 'typed amount 60.00');
    });

    test('nothing to explain until the amount and split are valid', () {
      expect(explainShares(form(amount: '')), isEmpty);
      expect(explainShares(form(split: [])), isEmpty);
    });
  });
}
