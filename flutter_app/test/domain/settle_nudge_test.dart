import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/settle_nudge.dart';
import 'package:trip_tracker/domain/logic/settlement.dart';

import 'package:trip_tracker/domain/models/trip.dart';

import '../support/model_builders.dart';

const _day = Duration.millisecondsPerDay;

Transfer _pay(String from, String to, double amount) => Transfer(
  from: 'member:$from',
  to: 'member:$to',
  fromLabel: from,
  toLabel: to,
  fromMemberId: from,
  toMemberId: to,
  amount: amount,
);

void main() {
  final trip = tripOf('t1', 'Goa');
  final ex = [expenseOf('e1', 't1', 'Lunch').copyWith(updatedAt: 10 * _day)];
  final transfers = [_pay('me', 'ben', 100), _pay('me', 'cara', 300), _pay('ben', 'cara', 50)];

  Transfer? nudge({int now = 14 * _day, int? dismissed, List<Transfer>? t, String? me = 'me', Trip? trip0}) =>
      settleNudge(
        trip: trip0 ?? trip,
        transfers: t ?? transfers,
        me: me,
        expenses: ex,
        nowMs: now,
        dismissedAtMs: dismissed,
      );

  test('quiet for 3 days and I owe: my largest payment', () => expect(nudge()!.toLabel, 'cara'));
  test('2 days quiet is not enough, 3 is', () {
    expect(nudge(now: 12 * _day), isNull);
    expect(nudge(now: 13 * _day), isNotNull);
  });
  test('nothing to say when I owe nobody, or I am unknown', () {
    expect(nudge(t: [_pay('ben', 'me', 50)]), isNull);
    expect(nudge(me: null), isNull);
  });
  test('a deleted newer expense does not count as activity', () {
    final withDeleted = [...ex, expenseOf('e2', 't1', 'Oops').copyWith(updatedAt: 13 * _day, deletedAt: 13 * _day)];
    expect(settleNudge(trip: trip, transfers: transfers, me: 'me', expenses: withDeleted, nowMs: 14 * _day), isNotNull);
  });
  test('no expenses: no nudge', () {
    expect(settleNudge(trip: trip, transfers: transfers, me: 'me', expenses: const [], nowMs: 14 * _day), isNull);
  });
  test('hidden for 3 days after dismissing, back after', () {
    expect(nudge(dismissed: 12 * _day), isNull);
    expect(nudge(dismissed: 11 * _day), isNotNull);
  });
  test('closed, frozen and archived trips are never nudged', () {
    for (final t in [trip.copyWith(closed: true), trip.copyWith(frozen: true), trip.copyWith(archived: true)]) {
      expect(nudge(trip0: t), isNull);
    }
  });
}
