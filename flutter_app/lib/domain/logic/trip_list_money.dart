import '../models/expense.dart';
import '../models/member.dart';
import '../models/trip.dart';
import 'settlement.dart';

/// Your position on one trip for the Trips list. [net] > 0 means you are owed; null [net] = you are not on the trip.
({double? net, String currency}) myTripNet(String? userId, Trip trip, List<Member> members, List<Expense> expenses) {
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
  final result = calculateSettlements(trip, {for (final m in members) m.id: m}, expenses, const [], trip.simplifyDebts);
  for (final b in result.balances) {
    if (b.memberId == mine) return (net: b.balance.abs() < 0.01 ? 0.0 : b.balance, currency: cur);
  }
  return (net: 0.0, currency: cur);
}

enum TripSection { now, upcoming, past }
