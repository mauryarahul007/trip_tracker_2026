import '../models/expense.dart';

/// One payment on the back of the settlement pass, seen from me: money I sent or money I got.
class SettleEntry {
  const SettleEntry({
    required this.id,
    required this.date,
    required this.amount,
    required this.otherMemberId,
    required this.sent,
    required this.confirmed,
  });

  final String id;
  final String date;
  final double amount;

  /// Who I paid, or who paid me.
  final String otherMemberId;
  final bool sent;
  final bool confirmed;
}

/// How far the trip is settled, and my recent payments. Backs the settle-up status pass (`enableSettleStatusPass`).
class SettleStatus {
  const SettleStatus({
    required this.settled,
    required this.outstanding,
    required this.confirmed,
    required this.waitingOnMe,
    required this.waitingOnOthers,
    required this.recent,
  });

  /// Money recorded as paid back so far.
  final double settled;

  /// Money still to move between people.
  final double outstanding;
  final int confirmed;

  /// Payments made to me that I still have to confirm.
  final int waitingOnMe;

  /// Payments that the person paid still has to confirm.
  final int waitingOnOthers;

  /// My last payments, newest first.
  final List<SettleEntry> recent;

  int get payments => confirmed + waitingOnMe + waitingOnOthers;

  /// Share of the trip's settle-up already recorded, 0..1. A trip with nothing to settle reads as done.
  double get fraction {
    final total = settled + outstanding;
    if (total < 0.01) return 1;
    return (settled / total).clamp(0.0, 1.0);
  }
}

/// A settlement row is paid by `paidBy` to `splitMemberIds.first`. Without [confirmationOn] every recorded
/// payment counts as confirmed, because nobody is asked to confirm it. A null [recentCount] keeps all of mine.
SettleStatus settleStatus(
  Iterable<Expense> all, {
  required double outstanding,
  required String? me,
  required bool confirmationOn,
  int? recentCount = 5,
}) {
  final rows = [
    for (final e in all)
      if (e.isSettlement && e.deletedAt == null && e.splitMemberIds.isNotEmpty) e,
  ];
  var settled = 0.0;
  var confirmed = 0, waitingOnMe = 0, waitingOnOthers = 0;
  for (final e in rows) {
    settled += e.amount;
    if (!confirmationOn || e.settlementConfirmedAt != null) {
      confirmed++;
    } else if (me != null && e.splitMemberIds.first == me) {
      waitingOnMe++;
    } else {
      waitingOnOthers++;
    }
  }
  final mine = [
    for (final e in rows)
      if (me != null && (e.paidBy == me || e.splitMemberIds.first == me)) e,
  ]..sort((a, b) => b.date != a.date ? b.date.compareTo(a.date) : b.createdAt.compareTo(a.createdAt));
  return SettleStatus(
    settled: settled,
    outstanding: outstanding,
    confirmed: confirmed,
    waitingOnMe: waitingOnMe,
    waitingOnOthers: waitingOnOthers,
    recent: [
      for (final e in mine.take(recentCount ?? mine.length))
        SettleEntry(
          id: e.id,
          date: e.date,
          amount: e.amount,
          otherMemberId: e.paidBy == me ? e.splitMemberIds.first : e.paidBy,
          sent: e.paidBy == me,
          confirmed: !confirmationOn || e.settlementConfirmedAt != null,
        ),
    ],
  );
}
