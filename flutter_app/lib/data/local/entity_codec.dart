import 'dart:convert';

import 'package:drift/drift.dart';

import '../../domain/models/category.dart';
import '../../domain/models/expense.dart';
import '../../domain/models/group.dart';
import '../../domain/models/member.dart';
import '../../domain/models/trip.dart';
import 'app_database.dart';

/// Domain <-> Drift row conversion. Trips and expenses keep the full domain
/// object in `domain_json`; flat columns exist for querying/indexing.

String _iso(int ms) => DateTime.fromMillisecondsSinceEpoch(ms, isUtc: true).toIso8601String();

TripsTableCompanion tripToCompanion(Trip t) => TripsTableCompanion(
  id: Value(t.id),
  name: Value(t.name),
  startDate: Value(t.startDate),
  endDate: Value(t.endDate),
  baseCurrency: Value(t.baseCurrency),
  ownerId: Value(t.ownerId),
  joinCode: Value(t.joinCode),
  destination: Value(t.destination),
  simplifyDebts: Value(t.simplifyDebts),
  archived: Value(t.archived),
  frozen: Value(t.frozen),
  closed: Value(t.closed),
  createdAt: Value(_iso(t.createdAt)),
  updatedAt: Value(_iso(t.updatedAt)),
  // Membership lists are derived from the members/groups tables on read.
  domainJson: Value(jsonEncode(t.copyWith(memberIds: const [], groupIds: const []).toJson())),
);

Trip? entryToTrip(TripEntry e, {List<String> memberIds = const [], List<String> groupIds = const []}) {
  final raw = e.domainJson;
  if (raw == null) return null;
  return Trip.fromJson(jsonDecode(raw) as Map<String, dynamic>).copyWith(memberIds: memberIds, groupIds: groupIds);
}

ExpensesTableCompanion expenseToCompanion(Expense x) => ExpensesTableCompanion(
  id: Value(x.id),
  tripId: Value(x.tripId),
  title: Value(x.title),
  amount: Value(x.amount),
  currency: Value(x.currency),
  categoryId: Value(x.category),
  paidByMemberId: Value(x.paidBy),
  splitMode: Value(x.splitMode),
  date: Value(x.date),
  receiptUrl: Value(x.receiptPath),
  isReimbursement: Value(x.isSettlement),
  archived: Value(x.deletedAt != null),
  recycledAt: Value(x.deletedAt == null ? null : _iso(x.deletedAt!)),
  approvalStatus: Value(x.approvalStatus),
  createdAt: Value(_iso(x.createdAt)),
  updatedAt: Value(_iso(x.updatedAt)),
  domainJson: Value(jsonEncode(x.toJson())),
);

Expense? entryToExpense(ExpenseEntry e) {
  final raw = e.domainJson;
  return raw == null ? null : Expense.fromJson(jsonDecode(raw) as Map<String, dynamic>);
}

MembersTableCompanion memberToCompanion(Member m, String tripId) => MembersTableCompanion(
  id: Value(m.id),
  tripId: Value(tripId),
  name: Value(m.name),
  email: Value(m.email),
  linkedUserId: Value(m.linkedUserId),
  archived: Value(m.archived),
  joinDate: Value(m.joinDate),
  leaveDate: Value(m.leaveDate),
);

Member entryToMember(MemberEntry e) => Member(
  id: e.id,
  name: e.name,
  email: e.email,
  tripId: e.tripId,
  archived: e.archived,
  linkedUserId: e.linkedUserId,
  joinDate: e.joinDate,
  leaveDate: e.leaveDate,
);

GroupsTableCompanion groupToCompanion(Group g, String tripId) =>
    GroupsTableCompanion(id: Value(g.id), tripId: Value(tripId), name: Value(g.name));

CategoriesTableCompanion categoryToCompanion(Category c, String tripId) => CategoriesTableCompanion(
  id: Value(c.id),
  tripId: Value(tripId),
  name: Value(c.name),
  icon: Value(c.icon),
  isCustom: Value(c.isCustom),
);

Category entryToCategory(CategoryEntry e) =>
    Category(id: e.id, tripId: e.tripId, name: e.name, icon: e.icon, isCustom: e.isCustom);
