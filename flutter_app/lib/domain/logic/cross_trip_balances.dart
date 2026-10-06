import '../models/expense.dart';
import '../models/group.dart';
import '../models/member.dart';
import '../models/trip.dart';
import 'settlement.dart';

class CrossTripNet {
  const CrossTripNet(this.currency, this.net);
  final String currency;
  final double net;
}

/// Net "you are owed" (positive) per currency across every trip, from local
/// data. Same grouping rule as `useCrossTripBalances`: never blend currencies.
List<CrossTripNet> crossTripNets({
  required String? userId,
  required List<Trip> trips,
  required Map<String, List<Member>> membersByTrip,
  required Map<String, List<Expense>> expensesByTrip,
  Map<String, List<Group>> groupsByTrip = const {},
}) {
  if (userId == null || trips.isEmpty) return const [];
  final byCurrency = <String, double>{};
  for (final trip in trips) {
    final members = membersByTrip[trip.id] ?? const <Member>[];
    String? mine;
    for (final m in members) {
      if (!m.archived && m.linkedUserId == userId) {
        mine = m.id;
        break;
      }
    }
    if (mine == null) continue;
    final result = calculateSettlements(
      trip,
      {for (final m in members) m.id: m},
      expensesByTrip[trip.id] ?? const <Expense>[],
      groupsByTrip[trip.id] ?? const <Group>[],
      trip.simplifyDebts,
    );
    var balance = 0.0;
    for (final b in result.balances) {
      if (b.memberId == mine) {
        balance = b.balance;
        break;
      }
    }
    if (balance.abs() < 0.01) continue;
    final cur = trip.baseCurrency.isEmpty ? 'INR' : trip.baseCurrency;
    byCurrency[cur] = double.parse(((byCurrency[cur] ?? 0) + balance).toStringAsFixed(2));
  }
  final out = [for (final e in byCurrency.entries) CrossTripNet(e.key, e.value)];
  out.sort((a, b) => a.currency.compareTo(b.currency));
  return out;
}
