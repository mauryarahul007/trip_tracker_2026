import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/clock.dart';
import '../../../core/storage/prefs.dart';
import '../../../domain/logic/settle_nudge.dart';
import '../../../domain/logic/settlement.dart';
import '../../trip_details/application/trip_nav.dart';
import 'expenses_providers.dart';

/// When this person last hid the settle-up banner for a trip, kept on this device only.
class SettleNudgeDismissed extends Notifier<int?> {
  SettleNudgeDismissed(this.tripId);
  final String tripId;

  String get _key => 'trip.settleNudge.$tripId';

  @override
  int? build() => ref.read(sharedPreferencesProvider).getInt(_key);

  Future<void> dismiss() async {
    final now = ref.read(nowProvider)().millisecondsSinceEpoch;
    state = now;
    await ref.read(sharedPreferencesProvider).setInt(_key, now);
  }
}

final settleNudgeDismissedProvider = NotifierProvider.family<SettleNudgeDismissed, int?, String>(
  SettleNudgeDismissed.new,
);

/// The payment the banner mentions, or null when there is nothing to nudge (see [settleNudge]).
final settleNudgeProvider = Provider.family<Transfer?, String>((ref, tripId) {
  final trip = ref.watch(tripProvider(tripId)).value;
  final result = ref.watch(tripSettlementProvider(tripId));
  final expenses = ref.watch(tripExpensesProvider(tripId)).value;
  if (trip == null || result == null || expenses == null) return null;
  return settleNudge(
    trip: trip,
    transfers: result.transfers,
    me: ref.watch(myMemberIdProvider(tripId)),
    expenses: expenses,
    nowMs: ref.read(nowProvider)().millisecondsSinceEpoch,
    dismissedAtMs: ref.watch(settleNudgeDismissedProvider(tripId)),
  );
});
