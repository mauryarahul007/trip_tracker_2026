import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/app/router.dart';
import 'package:trip_tracker/domain/logic/cross_trip_balances.dart';
import 'package:trip_tracker/domain/logic/expense_list_logic.dart';
import 'package:trip_tracker/domain/models/expense.dart';
import 'package:trip_tracker/features/auth/presentation/splash_screen.dart';
import 'package:trip_tracker/features/trips/presentation/widgets/horizon_home_hero.dart';
import 'package:trip_tracker/l10n/app_localizations.dart';
import 'package:trip_tracker/shared/theme/app_theme.dart';
import 'package:trip_tracker/shared/theme/app_tokens.dart';

import '../support/pump_app.dart';
import '../support/seed.dart';

Widget _host(Widget child, {required bool horizon}) => ProviderScope(
  child: MaterialApp(
    theme: AppTheme.light(horizon: horizon),
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    home: Scaffold(body: child),
  ),
);

Future<void> go(WidgetTester t, String path) async {
  unawaited(containerOf(t).read(routerProvider).push<void>(path));
  await settle(t, rounds: 10);
}

void main() {
  group('Horizon phase 3a: Start and Home (flag enableHorizonUi)', () {
    testWidgets('splash shows the night hero, name and tagline only with Horizon', (tester) async {
      await tester.pumpWidget(_host(const SplashScreen(), horizon: true));
      await tester.pump(const Duration(seconds: 1));
      expect(find.byKey(const Key('horizon-splash')), findsOneWidget);
      expect(find.text('Trip Tracker'), findsOneWidget);
      expect(find.text('SPLIT · TRAVEL · SETTLE'), findsOneWidget);

      await tester.pumpWidget(_host(const SplashScreen(), horizon: false));
      await tester.pump(const Duration(seconds: 1));
      expect(find.byKey(const Key('horizon-splash')), findsNothing);
    });

    testWidgets('balance hero: owed is green with a plus, owe is red with a minus', (tester) async {
      late AppTokens t;
      await tester.pumpWidget(
        _host(
          Builder(
            builder: (context) {
              t = context.tokens;
              return HorizonBalanceHero(nets: const [CrossTripNet('INR', 4476)], tripCount: 3, onTap: () {});
            },
          ),
          horizon: true,
        ),
      );
      expect(find.text('ACROSS 3 TRIPS'), findsOneWidget);
      final owed = tester.widget<Text>(find.byKey(const Key('horizon-hero-amount')));
      expect(owed.data, startsWith('+'));
      expect(owed.style!.color, t.owedOnDark);
      expect(find.text('owed to you'), findsOneWidget);

      await tester.pumpWidget(
        _host(
          HorizonBalanceHero(nets: const [CrossTripNet('INR', -900)], tripCount: 1, onTap: () {}),
          horizon: true,
        ),
      );
      final owe = tester.widget<Text>(find.byKey(const Key('horizon-hero-amount')));
      expect(owe.data, startsWith('−'));
      expect(owe.style!.color, t.oweOnDark);
      expect(find.text('you owe'), findsOneWidget);
    });

    testWidgets('balance hero never blends currencies', (tester) async {
      await tester.pumpWidget(
        _host(
          HorizonBalanceHero(
            nets: const [CrossTripNet('INR', 100), CrossTripNet('EUR', -20)],
            tripCount: 2,
            onTap: () {},
          ),
          horizon: true,
        ),
      );
      expect(find.text('2 currencies'), findsOneWidget);
      await tester.pumpWidget(_host(HorizonBalanceHero(nets: const [], tripCount: 2, onTap: () {}), horizon: true));
      expect(find.text('All square'), findsOneWidget);
    });

    testWidgets('quick actions fire their callbacks', (tester) async {
      final tapped = <String>[];
      await tester.pumpWidget(
        _host(
          HorizonQuickActions(
            actions: [
              for (final k in ['new', 'join', 'settle'])
                HorizonQuickAction(k, BentoTone.sky, Icons.add, k, () => tapped.add(k)),
            ],
          ),
          horizon: true,
        ),
      );
      for (final k in ['new', 'join', 'settle']) {
        await tester.tap(find.byKey(Key('horizon-action-$k')));
      }
      expect(tapped, ['new', 'join', 'settle']);
    });

    testWidgets('greeting shows the time of day and the first name', (tester) async {
      await tester.pumpWidget(
        _host(HorizonGreeting(name: 'Rahul Maurya', now: DateTime(2026, 11, 24, 20)), horizon: true),
      );
      expect(find.text('Good evening'), findsOneWidget);
      expect(find.text('Rahul'), findsOneWidget);
    });
  });

  group('Horizon phase 3b: Trip screens (flag enableHorizonUi)', () {
    testApp('Balances opens on your position: paid, share and total under it', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableHorizonUi'});
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 90);
      await go(tester, '/trip/${s.tripId}/ledger');
      await settle(tester);
      expect(find.byKey(const Key('sticky-balance')), findsNothing);
      expect(tester.widget<Text>(find.byKey(const Key('horizon-position-amount'))).data, '+₹60.00');
      expect(find.text('₹90.00'), findsWidgets); // you paid and the trip total
    });

    test('rowImpact: lent, owe, even and not involved', () {
      Expense ex({String paidBy = 'me', Map<String, double>? paidBy2, required Map<String, double> shares}) => Expense(
        id: 'e',
        tripId: 't',
        title: 'x',
        amount: 300,
        currency: 'INR',
        category: 'food',
        splitMode: 'equal',
        createdAt: 0,
        updatedAt: 0,
        paidBy: paidBy,
        paidByShares: paidBy2,
        splitMemberIds: shares.keys.toList(),
        resolvedShares: shares,
        date: '2026-11-21',
      );
      expect(rowImpact(ex(shares: {'me': 100, 'a': 100, 'b': 100}), 'me').net, 200);
      expect(rowImpact(ex(paidBy: 'a', shares: {'me': 100, 'a': 100, 'b': 100}), 'me').net, -100);
      expect(rowImpact(ex(paidBy: 'a', shares: {'a': 150, 'b': 150}), 'me').involved, isFalse);
      expect(rowImpact(ex(paidBy2: {'me': 100, 'a': 200}, shares: {'me': 100, 'a': 200}), 'me').net, 0);
    });

    testApp('Spend rows say what each expense means for you', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableHorizonUi', 'enableTidyExpenses'});
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 90);
      containerOf(tester).read(routerProvider).go('/trip/${s.tripId}/expenses');
      await settle(tester, rounds: 14);
      await tester.tap(find.byKey(const Key('tab-menu')));
      await settle(tester);
      await tester.tap(find.text('Expand all days'));
      await settle(tester);
      expect(tester.widget<Text>(find.byKey(const Key('row-impact')).first).data, 'you lent ₹60.00');
    });

    testApp('flag off keeps the Calm boarding pass', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await addExpense(tester, s, amount: 90);
      await go(tester, '/trip/${s.tripId}/ledger');
      await settle(tester);
      expect(find.byKey(const Key('horizon-position')), findsNothing);
      expect(find.byKey(const Key('sticky-balance')), findsOneWidget);
    });
  });
}
