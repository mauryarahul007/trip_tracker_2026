import 'package:trip_tracker/domain/models/admin.dart';
import 'package:trip_tracker/domain/models/admin_fleet.dart';
import 'package:trip_tracker/domain/models/expense.dart';
import 'package:trip_tracker/domain/models/member.dart';
import 'package:trip_tracker/domain/models/trip.dart';

/// The clock every fleet test uses: 2026-10-09 12:00 UTC.
final fleetNow = DateTime.utc(2026, 10, 9, 12).millisecondsSinceEpoch;
const _day = 24 * 60 * 60 * 1000;
const _min = 60 * 1000;
int ago(int days) => fleetNow - days * _day;

/// Six live trips and one archived, hand-built so each growth figure has a known answer:
///
/// * T1 Goa (o1, 100d old, locked, share link): first expense 5 min after creation, a settlement, and a
///   "same squad" follow-up trip T2 within 90 days.
/// * T2 Goa again (o1): two members, no spend.
/// * T3 Manali (o2): one member, no spend -> idle ghost.
/// * T4 Ooty (o3): ended 2026-09-30, spend, never settled -> unpaid ghost.
/// * T5 Kochi (o4): one member, only a settlement 75 days ago -> idle ghost and win-back.
/// * T7 Mixed (o5): INR + USD -> multi-currency slice, first expense within 10 minutes.
/// * T6 Old (o1): archived, ignored by the live pool.
FleetData sampleFleet() {
  Member m(String id, String name, String tripId, {String? user}) =>
      Member(id: id, name: name, tripId: tripId, linkedUserId: user);
  final members = {
    for (final x in [
      m('a1', 'Asha', 't1', user: 'u1'),
      m('b1', 'Ben', 't1', user: 'u2'),
      m('c1', 'Cara', 't1'),
      m('a2', 'Asha', 't2', user: 'u1'),
      m('b2', 'Ben', 't2', user: 'u2'),
      m('d3', 'Dev', 't3', user: 'u3'),
      m('e4', 'Eve', 't4', user: 'u4'),
      m('f4', 'Fay', 't4'),
      m('g5', 'Gus', 't5', user: 'u5'),
      m('h7', 'Hal', 't7', user: 'u7'),
      m('i7', 'Ina', 't7', user: 'u8'),
    ])
      x.id: x,
  };
  Trip trip(
    String id,
    String owner,
    int createdAt,
    List<String> memberIds, {
    String end = '',
    bool closed = false,
    bool archived = false,
    bool share = false,
    int views = 0,
  }) => Trip(
    id: id,
    name: id.toUpperCase(),
    startDate: '2026-01-01',
    endDate: end,
    baseCurrency: 'INR',
    ownerId: owner,
    joinCode: 'ABC123',
    memberIds: memberIds,
    closed: closed,
    archived: archived,
    shareEnabled: share,
    shareViewCount: views,
    createdAt: createdAt,
    updatedAt: createdAt,
  );
  final t1c = ago(100);
  Expense ex(
    String id,
    String tripId,
    String title,
    int createdAt, {
    double amount = 100,
    String currency = 'INR',
    String paidBy = 'a1',
    String mode = 'equal',
    bool settle = false,
    String? receipt,
    Map<String, double> shares = const {},
  }) => Expense(
    id: id,
    tripId: tripId,
    title: title,
    amount: amount,
    currency: currency,
    category: 'cat-food',
    date: DateTime.fromMillisecondsSinceEpoch(createdAt, isUtc: true).toIso8601String().substring(0, 10),
    paidBy: paidBy,
    splitMode: mode,
    splitMemberIds: shares.keys.toList(),
    resolvedShares: shares,
    receiptPath: receipt,
    isSettlement: settle,
    createdByUserId: 'u1',
    createdAt: createdAt,
    updatedAt: createdAt,
  );
  return FleetData(
    members: members,
    trips: [
      FleetTrip(
        trip: trip('t1', 'o1', t1c, ['a1', 'b1', 'c1'], closed: true, share: true, views: 7),
        joinPreviewCount: 3,
        closeoutPulse: 'yes',
      ),
      FleetTrip(trip: trip('t2', 'o1', ago(70), ['a2', 'b2']), splitwiseImportCount: 5),
      FleetTrip(trip: trip('t3', 'o2', ago(3), ['d3'])),
      FleetTrip(
        trip: trip('t4', 'o3', ago(20), ['e4', 'f4'], end: '2026-09-30'),
        closeoutPulse: 'no',
      ),
      FleetTrip(trip: trip('t5', 'o4', ago(80), ['g5'])),
      FleetTrip(trip: trip('t6', 'o1', ago(200), const [], archived: true)),
      FleetTrip(trip: trip('t7', 'o5', ago(10), ['h7', 'i7'])),
    ],
    expenses: [
      ex(
        'e1',
        't1',
        'Dinner',
        t1c + 5 * _min,
        amount: 900,
        receipt: 'r.jpg',
        shares: {'a1': 300, 'b1': 300, 'c1': 300},
      ),
      ex(
        'e2',
        't1',
        'Taxi',
        t1c + _day,
        amount: 300,
        paidBy: 'b1',
        mode: 'exact',
        shares: {'a1': 100, 'b1': 100, 'c1': 100},
      ),
      ex(
        's1',
        't1',
        'Settlement: Ben ➔ Asha',
        t1c + 2 * _day,
        amount: 300,
        paidBy: 'b1',
        settle: true,
        shares: {'a1': 300},
      ),
      ex('e4', 't4', 'Lunch', ago(19), amount: 400, currency: 'USD', paidBy: 'e4', shares: {'e4': 200, 'f4': 200}),
      ex('s5', 't5', 'Settlement: x', ago(75), amount: 100, paidBy: 'g5', settle: true, shares: {'g5': 100}),
      ex('e7a', 't7', 'Snacks', ago(10) + 3 * _min, amount: 50, paidBy: 'h7', shares: {'h7': 25, 'i7': 25}),
      ex('e7b', 't7', 'Museum', ago(9), amount: 20, currency: 'USD', paidBy: 'i7', shares: {'h7': 10, 'i7': 10}),
    ],
  );
}

/// Eight users: seven signed up from "instagram" or nothing, plus one older account for the retention rule.
List<AdminUser> sampleUsers() => [
  for (var i = 1; i <= 8; i++)
    AdminUser(
      id: 'u$i',
      email: 'u$i@b.c',
      createdAt: DateTime.fromMillisecondsSinceEpoch(ago(i * 10)),
      signupSource: i <= 3 ? 'instagram' : null,
    ),
];
