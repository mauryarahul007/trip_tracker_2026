import 'package:trip_tracker/domain/models/expense.dart';
import 'package:trip_tracker/domain/models/member.dart';
import 'package:trip_tracker/domain/models/trip.dart';
import 'package:trip_tracker/domain/models/trip_note.dart';

/// Smallest valid models for pure-logic tests.
Trip tripOf(String id, String name, {List<TripNote> notes = const []}) => Trip(
  id: id,
  name: name,
  startDate: '2026-10-01',
  endDate: '2026-10-09',
  baseCurrency: 'INR',
  ownerId: 'u1',
  joinCode: 'ABC123',
  notes: notes,
  createdAt: 0,
  updatedAt: 0,
);

Expense expenseOf(
  String id,
  String tripId,
  String title, {
  String date = '2026-10-02',
  bool isSettlement = false,
  List<String> splitMemberIds = const [],
  int? settlementConfirmedAt,
  int createdAt = 0,
}) => Expense(
  id: id,
  tripId: tripId,
  title: title,
  amount: 100,
  currency: 'INR',
  category: 'cat-food',
  date: date,
  paidBy: 'm1',
  splitMode: 'equal',
  isSettlement: isSettlement,
  splitMemberIds: splitMemberIds,
  settlementConfirmedAt: settlementConfirmedAt,
  createdAt: createdAt,
  updatedAt: 0,
);

Member memberOf(String id, {String? linkedUserId}) => Member(id: id, name: id, linkedUserId: linkedUserId);
