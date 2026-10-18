import '../models/expense.dart';
import '../models/group.dart';
import '../models/member.dart';
import '../models/trip.dart';
import 'trip_list_money.dart';

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
    // One definition of "my position on a trip", shared with the Trips list.
    final pos = myTripNet(
      userId,
      trip,
      membersByTrip[trip.id] ?? const <Member>[],
      expensesByTrip[trip.id] ?? const [],
    );
    final balance = pos.net;
    if (balance == null || balance.abs() < 0.01) continue;
    byCurrency[pos.currency] = double.parse(((byCurrency[pos.currency] ?? 0) + balance).toStringAsFixed(2));
  }
  final out = [for (final e in byCurrency.entries) CrossTripNet(e.key, e.value)];
  out.sort((a, b) => a.currency.compareTo(b.currency));
  return out;
}
