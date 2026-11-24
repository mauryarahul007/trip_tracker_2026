import '../models/expense.dart';
import '../models/group.dart';
import '../models/member.dart';
import '../models/trip.dart';
import 'settlement.dart';
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

/// One person's net with me across trips, in one currency (> 0: they owe me, < 0: I owe them).
class PersonNet {
  const PersonNet({required this.key, required this.name, required this.currency, required this.net, required this.trips});
  final String key;
  final String name;
  final String currency;
  final double net;

  /// Names of the trips the amount comes from.
  final List<String> trips;
}

/// Who owes me and whom I owe, per person, across [trips], from each trip's own settle-up payments (the same
/// transfers the trip's Balances shows, so "simplify debts" is respected). A person is matched across trips by
/// their linked account, else by name; currencies are never blended. Sorted by size, largest first.
List<PersonNet> personNets({
  required String? userId,
  required List<Trip> trips,
  required Map<String, List<Member>> membersByTrip,
  required Map<String, List<Expense>> expensesByTrip,
  Map<String, List<Group>> groupsByTrip = const {},
}) {
  if (userId == null) return const [];
  final acc = <String, ({String name, String currency, double net, Set<String> trips})>{};
  for (final trip in trips) {
    final members = membersByTrip[trip.id] ?? const <Member>[];
    final mine = members.where((m) => !m.archived && m.linkedUserId == userId).firstOrNull?.id;
    if (mine == null) continue;
    final byId = {for (final m in members) m.id: m};
    final cur = trip.baseCurrency.isEmpty ? 'INR' : trip.baseCurrency;
    final result = calculateSettlements(
      trip,
      byId,
      expensesByTrip[trip.id] ?? const [],
      groupsByTrip[trip.id] ?? const <Group>[],
      trip.simplifyDebts,
    );
    for (final t in result.transfers) {
      final String otherId;
      final double signed;
      if (t.fromMemberId == mine) {
        otherId = t.toMemberId;
        signed = -t.amount;
      } else if (t.toMemberId == mine) {
        otherId = t.fromMemberId;
        signed = t.amount;
      } else {
        continue;
      }
      final other = byId[otherId];
      final name = other?.name ?? (signed > 0 ? t.fromLabel : t.toLabel);
      final who = other?.linkedUserId ?? 'name:${name.trim().toLowerCase()}';
      final key = '$who|$cur';
      final prev = acc[key];
      acc[key] = (
        name: prev?.name ?? name,
        currency: cur,
        net: (prev?.net ?? 0) + signed,
        trips: {...?prev?.trips, trip.name},
      );
    }
  }
  final out = [
    for (final e in acc.entries)
      if (e.value.net.abs() >= 0.01)
        PersonNet(
          key: e.key,
          name: e.value.name,
          currency: e.value.currency,
          net: double.parse(e.value.net.toStringAsFixed(2)),
          trips: e.value.trips.toList(),
        ),
  ]..sort((a, b) => b.net.abs().compareTo(a.net.abs()));
  return out;
}
