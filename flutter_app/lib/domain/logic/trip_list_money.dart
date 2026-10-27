import '../models/expense.dart';
import '../models/group.dart';
import '../models/member.dart';
import '../models/trip.dart';
import 'settlement.dart';

/// Your position on one trip for the Trips list. [net] > 0 means you are owed; null [net] = you are not on the trip.
/// In a group, the group is one party (as the ledger settles it), so your position is the group's: a square group
/// reads 0 even when you paid for the others in it.
({double? net, String currency}) myTripNet(
  String? userId,
  Trip trip,
  List<Member> members,
  List<Expense> expenses, [
  List<Group> groups = const [],
]) {
  final cur = trip.baseCurrency.isEmpty ? 'INR' : trip.baseCurrency;
  if (userId == null) return (net: null, currency: cur);
  String? mine;
  for (final m in members) {
    if (!m.archived && m.linkedUserId == userId) {
      mine = m.id;
      break;
    }
  }
  if (mine == null) return (net: null, currency: cur);
  final result = calculateSettlements(trip, {for (final m in members) m.id: m}, expenses, groups, trip.simplifyDebts);
  for (final n in buildSettlementNodes(result.balances, groups)) {
    if (n.memberIds.contains(mine)) return (net: n.balance.abs() < 0.01 ? 0.0 : n.balance, currency: cur);
  }
  return (net: 0.0, currency: cur);
}

enum TripSection { now, upcoming, past }
