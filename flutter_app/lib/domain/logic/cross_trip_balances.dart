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
      groupsByTrip[trip.id] ?? const <Group>[],
    );
    final balance = pos.net;
    if (balance == null || balance.abs() < 0.01) continue;
    byCurrency[pos.currency] = double.parse(((byCurrency[pos.currency] ?? 0) + balance).toStringAsFixed(2));
  }
  final out = [for (final e in byCurrency.entries) CrossTripNet(e.key, e.value)];
  out.sort((a, b) => a.currency.compareTo(b.currency));
  return out;
}

/// My non-zero position on one trip (net > 0: owed to me; net < 0: I owe).
class TripNetPosition {
  const TripNetPosition({required this.tripId, required this.tripName, required this.currency, required this.net});
  final String tripId;
  final String tripName;
  final String currency;
  final double net;
}

/// Per-trip positions behind [crossTripNets] (same [myTripNet] rule), one entry per trip I am not square on.
List<TripNetPosition> tripNetPositions({
  required String? userId,
  required List<Trip> trips,
  required Map<String, List<Member>> membersByTrip,
  required Map<String, List<Expense>> expensesByTrip,
  Map<String, List<Group>> groupsByTrip = const {},
}) {
  if (userId == null) return const [];
  final out = <TripNetPosition>[];
  for (final trip in trips) {
    final pos = myTripNet(
      userId,
      trip,
      membersByTrip[trip.id] ?? const <Member>[],
      expensesByTrip[trip.id] ?? const [],
      groupsByTrip[trip.id] ?? const <Group>[],
    );
    final net = pos.net;
    if (net == null || net.abs() < 0.01) continue;
    out.add(TripNetPosition(tripId: trip.id, tripName: trip.name, currency: pos.currency, net: net));
  }
  return out;
}

/// The trip where I owe the most (largest negative net), or null when I owe nothing anywhere.
/// Currencies are never converted: amounts are compared as written, first trip wins a tie.
TripNetPosition? largestOpenDebt(List<TripNetPosition> positions) {
  TripNetPosition? best;
  for (final p in positions) {
    if (p.net >= 0) continue;
    if (best == null || p.net < best.net) best = p;
  }
  return best;
}

/// The trip where I am owed the most, or null when nobody owes me anywhere.
TripNetPosition? largestOwedToMe(List<TripNetPosition> positions) {
  TripNetPosition? best;
  for (final p in positions) {
    if (p.net <= 0) continue;
    if (best == null || p.net > best.net) best = p;
  }
  return best;
}
