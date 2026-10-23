import '../models/expense.dart';
import '../models/trip.dart';
import 'settlement.dart';

const settleNudgeQuietDays = 3;
const settleNudgeSnoozeDays = 3;
const _day = Duration.millisecondsPerDay;

/// The payment to remind [me] about, or null. Shown only on an open trip that nobody has touched for
/// [settleNudgeQuietDays] and where [me] still owes: the largest of my payments, so the banner stays one line.
/// [dismissedAtMs] is when this person last hid it; it stays hidden for [settleNudgeSnoozeDays].
Transfer? settleNudge({
  required Trip trip,
  required List<Transfer> transfers,
  required String? me,
  required Iterable<Expense> expenses,
  required int nowMs,
  int? dismissedAtMs,
}) {
  if (me == null || trip.closed || trip.frozen || trip.archived) return null;
  if (dismissedAtMs != null && nowMs - dismissedAtMs < settleNudgeSnoozeDays * _day) return null;
  var lastTouch = 0;
  for (final e in expenses) {
    if (e.deletedAt == null && e.updatedAt > lastTouch) lastTouch = e.updatedAt;
  }
  if (lastTouch == 0 || nowMs - lastTouch < settleNudgeQuietDays * _day) return null;
  Transfer? best;
  for (final t in transfers) {
    if (t.fromMemberId == me && (best == null || t.amount > best.amount)) best = t;
  }
  return best;
}
