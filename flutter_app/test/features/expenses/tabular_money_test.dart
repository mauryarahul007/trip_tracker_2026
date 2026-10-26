import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/settlement.dart';
import 'package:trip_tracker/features/expenses/presentation/widgets/balance_bars.dart';
import 'package:trip_tracker/l10n/app_localizations.dart';
import 'package:trip_tracker/shared/theme/app_theme.dart';

void main() {
  testWidgets('balance amounts use tabular figures so the column lines up', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: BalanceBars(
            balances: const [
              MemberBalance(memberId: 'a', name: 'Asha', balance: 1111),
              MemberBalance(memberId: 'b', name: 'Ben', balance: -2500),
            ],
            format: (v) => '₹${v.round()}',
          ),
        ),
      ),
    );
    final amount = tester.widget<Text>(find.text('₹1111'));
    expect(amount.style!.fontFeatures, contains(const FontFeature.tabularFigures()));
  });
}
