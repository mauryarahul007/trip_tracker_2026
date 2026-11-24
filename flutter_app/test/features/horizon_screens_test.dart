import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/cross_trip_balances.dart';
import 'package:trip_tracker/features/auth/presentation/splash_screen.dart';
import 'package:trip_tracker/features/trips/presentation/widgets/horizon_home_hero.dart';
import 'package:trip_tracker/l10n/app_localizations.dart';
import 'package:trip_tracker/shared/theme/app_theme.dart';
import 'package:trip_tracker/shared/theme/app_tokens.dart';

Widget _host(Widget child, {required bool horizon}) => ProviderScope(
  child: MaterialApp(
    theme: AppTheme.light(horizon: horizon),
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    home: Scaffold(body: child),
  ),
);

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
}
