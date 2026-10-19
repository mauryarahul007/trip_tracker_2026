import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import 'package:trip_tracker/domain/models/trip.dart';
import 'package:trip_tracker/domain/models/member.dart';
import 'package:trip_tracker/domain/models/group.dart';
import 'package:trip_tracker/domain/models/category.dart';
import 'package:trip_tracker/domain/models/expense.dart';

import 'package:trip_tracker/domain/logic/settlement.dart';
import 'package:trip_tracker/domain/logic/currency.dart';
import 'package:trip_tracker/domain/logic/math_expression.dart';
import 'package:trip_tracker/domain/logic/expense_quick_parser.dart';
import 'package:trip_tracker/domain/logic/trip_collab_merge.dart';
import 'package:trip_tracker/domain/logic/duplicate_expense_detector.dart';
import 'package:trip_tracker/domain/logic/burn_rate.dart';
import 'package:trip_tracker/domain/logic/predictive_expenses.dart';
import 'package:trip_tracker/domain/logic/category_helper.dart';
import 'package:trip_tracker/domain/logic/passes_and_chat_cards.dart';
import 'package:trip_tracker/domain/logic/notifications.dart';
import 'package:trip_tracker/domain/models/notification_item.dart';
import 'package:trip_tracker/domain/logic/trip_utilities.dart';
import 'package:trip_tracker/domain/logic/imports_and_exports.dart';

void main() {
  late String fixturesDir;

  setUpAll(() {
    final possiblePaths = [
      '../docs/flutter-migration/fixtures',
      'docs/flutter-migration/fixtures',
      '../../docs/flutter-migration/fixtures',
    ];
    for (final p in possiblePaths) {
      if (Directory(p).existsSync()) {
        fixturesDir = p;
        break;
      }
    }
  });

  Map<String, dynamic> loadFixture(String filename) {
    final file = File('$fixturesDir/$filename');
    return jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
  }

  group('Golden Fixtures Parity Suite', () {
    test('1. settlement.json matches simplified, direct, summary & pairGroups', () {
      final json = loadFixture('settlement.json');
      final trip = Trip.fromJson(json['trip'] as Map<String, dynamic>);
      final membersList = (json['members'] as List).map((m) => Member.fromJson(m as Map<String, dynamic>)).toList();
      final membersMap = {for (final m in membersList) m.id: m};
      final expenses = (json['expenses'] as List).map((e) => Expense.fromJson(e as Map<String, dynamic>)).toList();
      final groups = [
        const Group(id: 'g1', tripId: 't1', name: 'Couples (Alice & Bob)', memberIds: ['m1', 'm2']),
      ];

      // Simplified
      final simplified = calculateSettlements(trip, membersMap, expenses, groups, true);
      expect(simplified.toJson(), json['results']['simplified']);

      // Direct
      final direct = calculateSettlements(trip, membersMap, expenses, groups, false);
      expect(direct.toJson(), json['results']['direct']);

      // Summary
      final summary = summarizeSettlement(simplified.balances, simplified.transfers);
      expect(summary.toJson(), json['results']['summary']);

      // Pair Groups
      final pairGroups = groupSettlementsByPair(expenses.where((e) => e.isSettlement).toList());
      final expectedPairGroups = (json['results']['pairGroups'] as List).cast<Map<String, dynamic>>();
      expect(pairGroups.length, expectedPairGroups.length);
      expect(pairGroups[0].totalPaid, expectedPairGroups[0]['totalPaid']);
      expect(pairGroups[0].fromMemberId, expectedPairGroups[0]['fromMemberId']);
      expect(pairGroups[0].toMemberId, expectedPairGroups[0]['toMemberId']);

      // Single member trip
      final singleTrip = Trip.fromJson({
        ...json['trip'] as Map<String, dynamic>,
        'id': 't_single',
        'memberIds': ['m1'],
      });
      final singleExpenses = <Expense>[
        const Expense(
          id: 'e_solo',
          tripId: 't_single',
          title: 'Solo Coffee',
          amount: 5,
          currency: 'EUR',
          category: 'cat-food',
          date: '2026-10-01',
          paidBy: 'm1',
          splitMode: 'equal',
          resolvedShares: {'m1': 5},
          createdAt: 1,
          updatedAt: 1,
        ),
      ];
      final singleRes = calculateSettlements(singleTrip, {'m1': membersMap['m1']!}, singleExpenses);
      expect(singleRes.toJson(), json['results']['singleMemberResult']);
    });

    test('2. default_split_roles.json matches permissions and split copy', () {
      final json = loadFixture('default_split_roles.json');
      final roles = json['roles'] as List;
      for (final r in roles) {
        expect(r['canAddExpense'], true);
        expect(r['canEditOwnExpense'], false);
        expect(r['canEditOthersExpense'], false);
        expect(r['canManageTrip'], false);
        expect(r['isViewer'], false);
      }
      expect(json['split_copy']['output'], isNull);
    });

    test('3. currency.json matches formatting, conversions and country map', () {
      final json = loadFixture('currency.json');
      final formattings = (json['formatting'] as List).cast<Map<String, dynamic>>();
      for (final f in formattings) {
        final code = f['currency'] as String;
        expect(getCurrencyDecimals(code), f['decimals']);
        expect(getCurrencySymbol(code), f['symbol']);
        expect(formatAmount(1234.56, code), f['formatted_1234_56']);
        expect(formatAmount(0, code), f['formatted_0']);
        expect(formatMoneyNumber(1234.56, code), f['moneyNumber']);
      }

      final conversions = (json['conversions'] as List).cast<Map<String, dynamic>>();
      for (final c in conversions) {
        final res = convertCurrency((c['amount'] as num).toDouble(), c['from'] as String, c['to'] as String);
        expect(res.toJson(), c['result']);
      }

      final countryMap = (json['countryMap'] as List).cast<Map<String, dynamic>>();
      for (final cm in countryMap) {
        expect(currencyForCountryCode(cm['countryCode'] as String), cm['currency']);
      }
    });

    test('4. quick_parser_math.json matches parseCases and mathCases', () {
      final json = loadFixture('quick_parser_math.json');
      final categories = [
        const Category(id: 'cat-food', tripId: 't1', name: 'Food & Dining', icon: '🍽️'),
        const Category(id: 'cat-travel', tripId: 't1', name: 'Travel & Transport', icon: '🚕'),
        const Category(id: 'cat-groceries', tripId: 't1', name: 'Groceries', icon: '🛒'),
      ];
      final members = [
        const Member(id: 'm1', name: 'Alice'),
        const Member(id: 'm2', name: 'Bob'),
        const Member(id: 'm3', name: 'Charlie'),
      ];

      final parseCases = (json['parseCases'] as List).cast<Map<String, dynamic>>();
      for (final pc in parseCases) {
        final parsed = parseQuickExpense(pc['input'] as String, categories, [], members, null, DateTime(2026, 10, 6));
        expect(parsed?.toJson(), pc['output']);
      }

      final mathCases = (json['mathCases'] as List).cast<Map<String, dynamic>>();
      for (final mc in mathCases) {
        final res = evaluateMathExpression(mc['expression'] as String);
        expect(res, mc['result']);
      }
    });

    test('5. collab_merge.json matches applyRemoteTrip and mergeTripRoster', () {
      final json = loadFixture('collab_merge.json');
      final local = Trip.fromJson(json['tripMerge']['localTrip'] as Map<String, dynamic>);
      final remote = Trip.fromJson(json['tripMerge']['remoteTrip'] as Map<String, dynamic>);
      final merged = applyRemoteTrip(local, remote, false);
      expect(merged.name, json['tripMerge']['mergedTrip']['name']);
      expect(merged.checklist.length, (json['tripMerge']['mergedTrip']['checklist'] as List).length);
      expect(merged.notes.length, (json['tripMerge']['mergedTrip']['notes'] as List).length);
      expect(merged.passes.length, (json['tripMerge']['mergedTrip']['passes'] as List).length);

      // Real mergeTripRoster signature
      final args = json['rosterMerge']['args'] as Map<String, dynamic>;
      final trips = [for (final t in args['trips'] as List) Trip.fromJson(t as Map<String, dynamic>)];
      Map<String, Member> members(Map<String, dynamic> m) => {
        for (final e in m.entries) e.key: Member.fromJson(e.value as Map<String, dynamic>),
      };
      Map<String, Group> groups(Map<String, dynamic> m) => {
        for (final e in m.entries) e.key: Group.fromJson(e.value as Map<String, dynamic>),
      };
      final r = args['roster'] as Map<String, dynamic>;
      final roster = TripRoster(
        trip: Trip.fromJson(r['trip'] as Map<String, dynamic>),
        members: members(r['members'] as Map<String, dynamic>),
        groups: groups(r['groups'] as Map<String, dynamic>),
      );
      void expectTrip(Trip actual, Map<String, dynamic> want, String why) {
        final j = actual.toJson();
        for (final k in ['id', 'name', 'memberIds', 'groupIds', 'expenseCount', 'updatedAt']) {
          expect(j[k], want[k], reason: '$why: $k');
        }
        expect(
          (j['checklist'] as List).map((c) => (c as Map)['id']),
          (want['checklist'] as List).map((c) => c['id']),
          reason: '$why: checklist',
        );
      }

      for (final c in json['rosterMerge']['cases'] as List) {
        final want = c['result'] as Map<String, dynamic>;
        final got = mergeTripRoster(
          trips,
          members(args['members'] as Map<String, dynamic>),
          groups(args['groups'] as Map<String, dynamic>),
          't1',
          roster,
          c['keepLocalCollab'] as bool,
        );
        final why = 'keep=${c['keepLocalCollab']}';
        expect(got.members.keys.toSet(), (want['members'] as Map).keys.toSet(), reason: why);
        expect(got.members['m1']!.name, want['members']['m1']['name'], reason: why);
        expect(got.groups.keys.toSet(), (want['groups'] as Map).keys.toSet(), reason: why);
        expect(got.trips.length, (want['trips'] as List).length, reason: why);
        for (var i = 0; i < got.trips.length; i++) {
          expectTrip(got.trips[i], (want['trips'] as List)[i] as Map<String, dynamic>, why);
        }
      }
      final missing = mergeTripRoster(
        trips,
        members(args['members'] as Map<String, dynamic>),
        groups(args['groups'] as Map<String, dynamic>),
        'nope',
        roster,
        false,
      );
      expect(missing.members.keys.toSet(), (json['rosterMerge']['missingTrip']['members'] as Map).keys.toSet());

      // applyLiveCollabRow
      final liveBase = Trip.fromJson(json['liveRow']['baseTrip'] as Map<String, dynamic>);
      for (final c in json['liveRow']['cases'] as List) {
        final want = c['result'] as Map<String, dynamic>;
        final got = applyLiveCollabRow(
          liveBase,
          Map<String, dynamic>.from(c['row'] as Map),
          c['keepLocalCollab'] as bool,
        ).toJson();
        final why = '${jsonEncode(c['row'])} keep=${c['keepLocalCollab']}';
        expect(got['name'], want['name'], reason: why);
        expect(got['updatedAt'], want['updatedAt'], reason: why);
        expect(
          (got['checklist'] as List).map((x) => (x as Map)['id']),
          (want['checklist'] as List).map((x) => x['id']),
          reason: why,
        );
        expect((got['notes'] as List).length, (want['notes'] as List).length, reason: why);
        expect((got['passes'] as List).length, (want['passes'] as List).length, reason: why);
        expect(got['fxConfig'] != null, want['fxConfig'] != null, reason: why);
      }
    });

    test('6. duplicate_burn_predictive.json matches detector, burn rate & chips', () {
      final json = loadFixture('duplicate_burn_predictive.json');
      final existingExpenses = <Expense>[
        const Expense(
          id: 'e1',
          tripId: 't1',
          title: 'Dinner at Chalet',
          amount: 50,
          currency: 'EUR',
          date: '2026-10-01',
          paidBy: 'm1',
          splitMode: 'equal',
          category: 'cat-food',
          createdAt: 1,
          updatedAt: 1,
        ),
        const Expense(
          id: 'e2',
          tripId: 't1',
          title: 'Taxi to Peak',
          amount: 25,
          currency: 'EUR',
          date: '2026-10-01',
          paidBy: 'm2',
          splitMode: 'equal',
          category: 'cat-travel',
          createdAt: 1,
          updatedAt: 1,
        ),
      ];

      final exact = detectDuplicateExpense(
        const CandidateExpense(
          title: 'Dinner at Chalet',
          amount: 50,
          currency: 'EUR',
          date: '2026-10-01',
          paidById: 'm1',
        ),
        existingExpenses,
      );
      expect(exact?.isDuplicate, true);
      expect(exact?.confidence, 'high');
      expect(exact?.reason, json['duplicateExact']['reason']);

      final diff = detectDuplicateExpense(
        const CandidateExpense(title: 'Museum Ticket', amount: 15, currency: 'EUR', date: '2026-10-02', paidById: 'm1'),
        existingExpenses,
      );
      expect(diff, isNull);

      final burn = computeBurnRateInsight('2026-10-01', '2026-10-08', 225, DateTime.utc(2026, 10, 4, 12));
      expect(burn?.toJson(), json['burnRate']);

      final categories = [
        const Category(id: 'cat-food', tripId: 't1', name: 'Food & Dining', icon: '🍽️'),
        const Category(id: 'cat-travel', tripId: 't1', name: 'Travel & Transport', icon: '🚕'),
      ];
      final allExpenses = <Expense>[
        ...existingExpenses,
        const Expense(
          id: 'e3',
          tripId: 't1',
          title: 'Dinner at Chalet',
          amount: 45,
          currency: 'EUR',
          date: '2026-10-02',
          paidBy: 'm1',
          splitMode: 'equal',
          category: 'cat-food',
          createdAt: 1,
          updatedAt: 1,
        ),
      ];
      final chips = getPredictiveQuickChips(categories, allExpenses, DateTime(2026, 10, 4, 13));
      final chipsJson = chips.map((c) => c.toJson()).toList();
      expect(chipsJson, json['predictiveChips']);
    });

    test('7. categories.json matches suggestions and icon parsing', () {
      final json = loadFixture('categories.json');
      final categories = [
        const Category(id: 'cat-food', tripId: 't1', name: 'Food & Dining', icon: '🍽️'),
        const Category(id: 'cat-travel', tripId: 't1', name: 'Travel & Transport', icon: '🚕'),
        const Category(id: 'cat-stay', tripId: 't1', name: 'Stay & Hotel', icon: '🏨'),
        const Category(id: 'cat-entertainment', tripId: 't1', name: 'Entertainment', icon: '🎟️'),
        const Category(id: 'cat-health', tripId: 't1', name: 'Health & Pharmacy', icon: '💊'),
      ];

      final suggestions = (json['suggestions'] as List).cast<Map<String, dynamic>>();
      for (final s in suggestions) {
        expect(autoSuggestCategory(s['keyword'] as String, categories), s['suggestedCategory']);
      }

      final iconParses = (json['iconParses'] as List).cast<Map<String, dynamic>>();
      for (final ip in iconParses) {
        final parsed = parseCategoryIcon(ip['input'] as String);
        expect(parsed.toJson(), ip['parsed']);
      }
    });

    test('8. imports_exports.json matches Splitwise, backup validation & ics', () {
      final json = loadFixture('imports_exports.json');
      const csv =
          'Date,Description,Category,Cost,Currency,Alice,Bob\n'
          '2026-10-01,Groceries,Food,100.00,USD,50.00,50.00\n'
          '2026-10-02,Dinner,Food,80.00,USD,40.00,40.00';
      final parsed = parseSplitwiseCsv(csv);
      expect(parsed.toJson(), json['parsedSplitwise']);

      final backup = validateAndSanitizeBackup(<String, dynamic>{});
      expect(backup, json['validatedBackup']);

      final ics = generateTripIcs(<String, dynamic>{});
      expect(ics, json['ics']);
    });

    test('9. passes_chat_cards.json matches cleanPassenger, airport, passStub & cardPresentation', () {
      final json = loadFixture('passes_chat_cards.json');
      expect(cleanPassengerName('DOE/JOHN MR'), json['cleanedPassenger']);
      expect(resolveAirportCode('New York'), json['resolvedAirport']);

      final stub = buildPassStub({
        'myNet': 60,
        'paid': 120,
        'share': 60,
        'group': null,
      }, (double amt) => '\$${amt.toStringAsFixed(2)}');
      expect(stub.toJson(), json['passStub']);

      final card = getChatExpenseCardPresentation('settlement_recorded', true, 'Alice');
      expect(card.toJson(), json['cardPresentation']);

      final body = expenseEventBody('expense_added', {'title': 'Ski Pass', 'amount': 150, 'currency': 'EUR'});
      expect(body, json['eventBody']);
    });

    test('10. notifications.json matches headlines, body & burst grouping', () {
      final json = loadFixture('notifications.json');
      final catalogue = (json['renderedCatalogue'] as List).cast<Map<String, dynamic>>();
      for (final item in catalogue) {
        expect(getNotificationHeadline(item['type'] as String), item['headline']);
        final n = NotificationItem(
          id: 'n',
          tripId: 't1',
          title: 'Alps Roadtrip',
          body: '',
          data: {'type': item['type'], ...(item['params'] as Map<String, dynamic>)},
          createdAt: '2026-10-06T00:00:00Z',
        );
        expect(renderNotificationBody(n), item['body']);
      }

      final burstList = [
        {
          'id': 'n1',
          'userId': 'u1',
          'tripId': 't1',
          'title': 'Trip Tracker',
          'data': {'type': 'expense_added'},
          'createdAt': '2026-10-06T00:00:00Z',
          'read': false,
        },
        {
          'id': 'n2',
          'userId': 'u1',
          'tripId': 't1',
          'title': 'Trip Tracker',
          'data': {'type': 'expense_updated'},
          'createdAt': '2026-10-06T00:01:00Z',
          'read': false,
        },
      ];
      final burst = groupNotificationBursts(burstList);
      expect(burst.length, 2);
    });

    test('11. utilities.json matches sort, suggestions, dates, deep links, upi & passport', () {
      final json = loadFixture('utilities.json');
      final trips = [
        {'id': 't1', 'name': 'Zanzibar Retreat', 'startDate': '2026-11-01', 'createdAt': 1000},
        {'id': 't2', 'name': 'Amsterdam City Trip', 'startDate': '2026-09-01', 'createdAt': 2000},
        {'id': 't3', 'name': 'Berlin Weekend', 'startDate': '2026-10-15', 'createdAt': 1500},
      ];

      expect(sortTrips(trips, 'alphabetical'), json['sort']['sortedByName']);
      expect(sortTrips(trips, 'date'), json['sort']['sortedByDate']);

      expect(suggestTripName('Tokyo', '2026-10-01', '2026-10-10'), json['suggestions']['suggestedName']);
      expect(guessTripCurrency('Japan'), json['suggestions']['guessedCurr']);
      expect(extractPrimaryCity('Paris, France'), json['suggestions']['extractedCity']);

      expect(formatDateRange('2026-10-01', '2026-10-08'), json['dates']['dateRange']);
      expect(tripDayNumber('2026-10-01', '2026-10-03'), json['dates']['tripDay']);
      expect(formatRelativeTime(1791244800000 - 3600000, 1791244800000), json['dates']['relativeTime']);

      expect(buildCanonicalJoinLink('ABC123'), json['deepLink']['canonicalJoin']);
      expect(parseJoinDeepLink('com.triptracker.app://join/ABC123'), json['deepLink']['parsedJoin']);

      final upiUri = generateUpiUri({
        'payeeUpiId': 'traveler@okhdfcbank',
        'payeeName': 'Alice',
        'amount': 1500,
        'note': 'Trip Settlement',
      });
      expect(upiUri, json['upi']['upiUri']);
      expect(isValidUpiId('traveler@okhdfcbank'), json['upi']['upiValid']);

      expect(buildAutoGroupName(['Alice', 'Bob']), json['autoGroup']);

      final passport = computeTravelerPassport([
        {
          'id': 't1',
          'name': 'France',
          'destination': 'Paris',
          'startDate': '2026-09-01',
          'endDate': '2026-09-05',
          'closed': true,
        },
        {
          'id': 't2',
          'name': 'Italy',
          'destination': 'Rome',
          'startDate': '2026-10-01',
          'endDate': '2026-10-06',
          'closed': false,
        },
      ], 1791244800000);
      expect(passport.toJson(), json['travelerPassport']);

      final achievements = calculateTripAchievements(
        trips[0],
        [
          {'id': 'e1', 'title': 'Morning Coffee', 'amount': 5, 'category': 'cat-food', 'date': '2026-10-01'},
          {'id': 'e2', 'title': 'Afternoon Tea', 'amount': 4, 'category': 'cat-food', 'date': '2026-10-01'},
          {'id': 'e3', 'title': 'Cafe Breakfast', 'amount': 15, 'category': 'cat-food', 'date': '2026-10-02'},
        ],
        [
          {'id': 'm1', 'name': 'Alice'},
        ],
        [
          {'id': 'cat-food', 'name': 'Food & Dining', 'icon': '☕'},
        ],
        true,
      );
      expect(achievements.map((AchievementBadge a) => a.toJson()).toList(), json['achievements']);

      expect(inferSeasonalClimate('Switzerland', '2026-10-01'), json['packing']['packingSeasonal']);
      expect(
        generateSmartPackingSuggestions({
          'destination': 'Switzerland',
          'startDate': '2026-10-01',
          'endDate': '2026-10-07',
          'durationDays': 7,
        }),
        json['packing']['packingSuggestions'],
      );

      expect(
        describeSyncItem({
          'id': 'sq-1',
          'type': 'addExpense',
          'payload': {'title': 'Dinner', 'amount': 45},
        }),
        json['syncQueueLabel'],
      );
    });
  });
}
