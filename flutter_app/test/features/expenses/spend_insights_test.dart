import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/models/expense.dart';
import 'package:trip_tracker/features/expenses/application/expenses_providers.dart';
import 'package:trip_tracker/features/expenses/presentation/spend_insights_screen.dart';
import 'package:trip_tracker/features/trip_details/application/trip_nav.dart';
import 'package:trip_tracker/l10n/app_localizations.dart';
import 'package:trip_tracker/shared/theme/app_theme.dart';

Expense _e(String id, double amount, String cat, String date) => Expense(
  id: id,
  tripId: 't-1',
  title: id,
  amount: amount,
  currency: 'INR',
  category: cat,
  date: date,
  paidBy: 'm-1',
  splitMode: 'equal',
  splitMemberIds: const ['m-1'],
  resolvedShares: {'m-1': amount},
  createdAt: 1,
  updatedAt: 1,
);

Widget _host(List<Expense> expenses) => ProviderScope(
  overrides: [
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
}
