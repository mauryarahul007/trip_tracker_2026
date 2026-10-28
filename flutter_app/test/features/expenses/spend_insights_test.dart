import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/domain/models/member.dart';
import 'package:trip_tracker/domain/models/expense.dart';
import 'package:trip_tracker/features/expenses/application/expenses_providers.dart';
import 'package:trip_tracker/features/expenses/presentation/spend_insights_screen.dart';
import 'package:trip_tracker/features/trip_details/application/trip_nav.dart';
import 'package:trip_tracker/l10n/app_localizations.dart';
import 'package:trip_tracker/shared/theme/app_theme.dart';

Expense _e(
  String id,
  double amount,
  String cat,
  String date, {
  String paidBy = 'm-1',
  List<String> split = const ['m-1'],
}) => Expense(
  id: id,
  tripId: 't-1',
  title: id,
  amount: amount,
  currency: 'INR',
  category: cat,
  date: date,
  paidBy: paidBy,
  splitMode: 'equal',
  splitMemberIds: split,
  resolvedShares: {for (final m in split) m: amount / split.length},
  createdAt: 1,
  updatedAt: 1,
);

Widget _host(List<Expense> expenses, {bool v2 = false}) => ProviderScope(
  overrides: [
    // Only the Insights upgrade flag is driven here; budget and the rest stay off.
    flagProvider.overrideWith((ref, k) => Stream.value(k.$1 == 'enableInsightsV2' && v2)),
    tripMembersProvider('t-1')
        .overrideWith((ref) => Stream.value(const [Member(id: 'm-1', name: 'Asha'), Member(id: 'm-2', name: 'Ben')])),
    tripExpensesProvider('t-1').overrideWith((ref) => Stream.value(expenses)),
    tripProvider('t-1').overrideWith((ref) => Stream.value(null)),
    tripCategoriesProvider('t-1').overrideWithValue(const []),
  ],
  child: MaterialApp(
    theme: AppTheme.light(),
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    home: const SpendInsightsScreen(tripId: 't-1'),
  ),
);

void main() {
  testWidgets('shows the empty message when nothing was spent', (tester) async {
    await tester.pumpWidget(_host(const []));
    await tester.pump();
    expect(find.text('Add some expenses to see insights.'), findsOneWidget);
  });

  testWidgets('shows daily average, biggest day, line and donut for spending', (tester) async {
    await tester.pumpWidget(_host([_e('a', 100, 'cat-food', '2026-11-12'), _e('b', 300, 'cat-stay', '2026-11-13')]));
    await tester.pump();
    expect(find.byKey(const Key('insight-avg')), findsOneWidget);
    expect(find.byKey(const Key('insight-biggest')), findsOneWidget);
    expect(find.byKey(const Key('insight-line')), findsOneWidget);
    expect(find.byKey(const Key('insight-donut')), findsOneWidget);
  });

  group('Insights upgrade (enableInsightsV2)', () {
    final spend = [
      _e('hotel', 300, 'cat-stay', '2026-11-12', split: ['m-1', 'm-2']),
      _e('cab', 50, 'cat-travel', '2026-11-13', paidBy: 'm-2', split: ['m-1', 'm-2']),
      _e('dinner', 120, 'cat-food', '2026-11-13'),
    ];

    testWidgets('shows hero, daily bars, running total, categories, paid vs share and top expenses', (tester) async {
      tester.view.physicalSize = const Size(430, 2600);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(_host(spend, v2: true));
      await tester.pump();
      expect(find.byKey(const Key('insights-v2')), findsOneWidget);
      expect(find.byKey(const Key('insight-hero')), findsOneWidget);
      expect(find.byKey(const Key('insight-bars')), findsOneWidget);
      expect(find.byKey(const Key('insight-running')), findsOneWidget);
      expect(find.byKey(const Key('insight-categories')), findsOneWidget);
      expect(find.byKey(const Key('insight-person-m-1')), findsOneWidget);
      expect(find.byKey(const Key('insight-person-m-2')), findsOneWidget);
      expect(find.byKey(const Key('insight-top-0')), findsOneWidget);
      expect(find.byKey(const Key('insight-budget')), findsNothing); // budget flag off
      expect(find.byKey(const Key('insight-donut')), findsNothing);
      expect(find.text('hotel'), findsOneWidget);
    });

    testWidgets('tapping a bar shows that day in the readout', (tester) async {
      tester.view.physicalSize = const Size(430, 2600);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(_host(spend, v2: true));
      await tester.pump();
      String readout() => tester.widget<Text>(find.byKey(const Key('insight-daily-readout'))).data!;
      expect(readout(), startsWith('Biggest'));
      final bars = tester.getRect(find.byKey(const Key('insight-bars')));
      await tester.tapAt(Offset(bars.right - 5, bars.center.dy));
      await tester.pump();
      expect(readout(), '13 Nov');
    });

    testWidgets('flag off keeps the older screen', (tester) async {
      await tester.pumpWidget(_host(spend));
      await tester.pump();
      expect(find.byKey(const Key('insights-v2')), findsNothing);
      expect(find.byKey(const Key('insight-donut')), findsOneWidget);
    });
  });
}
