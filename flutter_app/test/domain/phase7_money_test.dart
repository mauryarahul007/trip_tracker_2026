import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/cross_trip_balances.dart';
import 'package:trip_tracker/domain/logic/csv_export.dart';
import 'package:trip_tracker/domain/logic/currency.dart';
import 'package:trip_tracker/domain/logic/exchange_rates.dart';
import 'package:trip_tracker/domain/models/expense.dart';
import 'package:trip_tracker/domain/models/group.dart';
import 'package:trip_tracker/domain/models/member.dart';
import 'package:trip_tracker/domain/models/trip.dart';
import 'package:trip_tracker/features/expenses/presentation/widgets/settlement_card.dart';
import 'package:trip_tracker/domain/logic/settlement_share_card.dart';

void main() {
  test('live rates use a fresh cache and fall back when the fetch fails', () async {
    String? stored;
    final fresh = await loadExchangeRates(
      cachedJson: null,
      writeCache: (json) async => stored = json,
      online: true,
      fetch: () async => {'USD': 1, 'INR': 90},
      now: DateTime.utc(2026, 10, 6),
    );
    expect(fresh['INR'], 90);
    expect(stored, isNotNull);

    final cached = await loadExchangeRates(
      cachedJson: stored,
      writeCache: (_) async {},
      online: false,
      fetch: () async => throw StateError('offline'),
      now: DateTime.utc(2026, 10, 6, 12),
    );
    expect(cached['INR'], 90);

    final fallback = await loadExchangeRates(
      cachedJson: null,
      writeCache: (_) async {},
      online: false,
      fetch: () async => null,
    );
    expect(fallback['USD'], defaultExchangeRates['USD']);
  });

  test('csv escapes formulas and backup rejects a missing trips array', () {
    const trip = Trip(
      id: 't1',
      name: 'Goa',
      startDate: '2026-10-01',
      endDate: '2026-10-09',
      baseCurrency: 'INR',
      ownerId: 'u1',
      joinCode: 'goa',
      memberIds: ['m1'],
      createdAt: 1,
      updatedAt: 1,
    );
    final csv = exportTripLedgerCsv(
      trip: trip,
      members: const [Member(id: 'm1', name: 'Asha', tripId: 't1')],
      expenses: const [
        Expense(
          id: 'e1',
          tripId: 't1',
          title: '=cmd',
          amount: 10,
          currency: 'INR',
          category: 'cat-food',
          date: '2026-10-02',
          paidBy: 'm1',
          splitMode: 'equal',
          createdAt: 1,
          updatedAt: 1,
        ),
      ],
      generatedAt: DateTime.utc(2026, 10, 6),
    );
    expect(csv, contains("'=cmd"));
    expect(summarizeBackup('{"trips":[]}').valid, isTrue);
    expect(summarizeBackup('nope').valid, isFalse);
  });

  test('cross-trip nets stay in each currency', () {
    Trip trip(String id, String cur) => Trip(
      id: id,
      name: id,
      startDate: '2026-10-01',
      endDate: '2026-10-09',
      baseCurrency: cur,
      ownerId: 'u1',
      joinCode: id,
      memberIds: const ['me', 'ben'],
      createdAt: 1,
      updatedAt: 1,
    );
    Expense paid(String tripId, String cur) => Expense(
      id: 'e-$tripId',
      tripId: tripId,
      title: 'Lunch',
      amount: 100,
      currency: cur,
      category: 'cat-food',
      date: '2026-10-02',
      paidBy: 'me',
      splitMode: 'equal',
      splitMemberIds: const ['me', 'ben'],
      resolvedShares: const {'me': 50, 'ben': 50},
      createdAt: 1,
      updatedAt: 1,
    );
    final nets = crossTripNets(
      userId: 'u1',
      trips: [trip('a', 'INR'), trip('b', 'USD')],
      membersByTrip: {
        'a': const [
          Member(id: 'me', name: 'Asha', tripId: 'a', linkedUserId: 'u1'),
          Member(id: 'ben', name: 'Ben', tripId: 'a'),
        ],
        'b': const [
          Member(id: 'me', name: 'Asha', tripId: 'b', linkedUserId: 'u1'),
          Member(id: 'ben', name: 'Ben', tripId: 'b'),
        ],
      },
      expensesByTrip: {
        'a': [paid('a', 'INR')],
        'b': [paid('b', 'USD')],
      },
    );
    expect(nets.map((n) => n.currency), ['INR', 'USD']);
    expect(nets.every((n) => n.net > 0), isTrue);
  });

  test('cross-trip nets count a square group as settled', () {
    // Sikkim case: I paid for my partner; our group owes nobody, so the trip is settled for me.
    const trip = Trip(
      id: 's',
      name: 'Sikkim',
      startDate: '2026-10-01',
      endDate: '2026-10-09',
      baseCurrency: 'INR',
      ownerId: 'u1',
      joinCode: 's',
      memberIds: ['me', 'wife', 'ben'],
      createdAt: 1,
      updatedAt: 1,
    );
    Expense e(String id, String by, double amt, Map<String, double> shares) => Expense(
      id: id,
      tripId: 's',
      title: id,
      amount: amt,
      currency: 'INR',
      category: 'cat-food',
      date: '2026-10-02',
      paidBy: by,
      splitMode: 'exact',
      splitMemberIds: shares.keys.toList(),
      resolvedShares: shares,
      createdAt: 1,
      updatedAt: 1,
    );
    const members = [
      Member(id: 'me', name: 'Me', tripId: 's', linkedUserId: 'u1'),
      Member(id: 'wife', name: 'Wife', tripId: 's'),
      Member(id: 'ben', name: 'Ben', tripId: 's'),
    ];
    final expenses = [
      e('hotel', 'me', 600, {'me': 300, 'wife': 300}),
      e('cab', 'ben', 200, {'ben': 200}),
    ];
    final household = [
      const Group(id: 'g', tripId: 's', name: 'Us', memberIds: ['me', 'wife']),
    ];
    // Raw member balance: me +300, wife -300, ben 0. As a household we are square.
    final ungrouped = crossTripNets(
      userId: 'u1',
      trips: [trip],
      membersByTrip: {'s': members},
      expensesByTrip: {'s': expenses},
    );
    expect(ungrouped.single.net, 300);
    final grouped = crossTripNets(
      userId: 'u1',
      trips: [trip],
      membersByTrip: {'s': members},
      expensesByTrip: {'s': expenses},
      groupsByTrip: {'s': household},
    );
    expect(grouped, isEmpty);
  });

  test('share card png is a real image', () async {
    final layout = settlementShareCardLayout(
      const SettlementShareCardInput(
        tripName: 'Goa',
        fromLabel: 'Ben',
        toLabel: 'Asha',
        amount: 30,
        currencySymbol: '₹',
      ),
    );
    final bytes = await renderSettlementPng(layout);
    expect(bytes.length, greaterThan(32));
    expect(bytes[0], 0x89); // PNG
  });
}
