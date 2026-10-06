import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/shared/theme/app_icons.dart';
import 'package:trip_tracker/shared/theme/app_theme.dart';
import 'package:trip_tracker/shared/widgets/animated_number.dart';
import 'package:trip_tracker/shared/widgets/app_avatar.dart';
import 'package:trip_tracker/shared/widgets/app_button.dart';
import 'package:trip_tracker/shared/widgets/app_switch.dart';
import 'package:trip_tracker/shared/widgets/app_text_field.dart';
import 'package:trip_tracker/shared/widgets/category_chip.dart';
import 'package:trip_tracker/shared/widgets/empty_state.dart';
import 'package:trip_tracker/shared/widgets/skeleton_loader.dart';
import 'package:trip_tracker/shared/widgets/slide_to_unlock.dart';

Widget _buildThemedApp(Widget child, {bool isDark = false}) {
  return MaterialApp(
    theme: isDark ? AppTheme.dark() : AppTheme.light(),
    home: Scaffold(body: Center(child: child)),
  );
}

void main() {
  group('Design System Base Components', () {
    testWidgets('AppButton renders label and handles tap', (tester) async {
      bool tapped = false;
      await tester.pumpWidget(
        _buildThemedApp(
          AppButton(label: 'Test Button', onPressed: () => tapped = true),
        ),
      );

      expect(find.text('Test Button'), findsOneWidget);
      await tester.tap(find.text('Test Button'));
      expect(tapped, isTrue);
    });

    testWidgets('AppButton renders loading spinner when isLoading is true', (
      tester,
    ) async {
      await tester.pumpWidget(
        _buildThemedApp(
          AppButton(label: 'Loading Button', isLoading: true, onPressed: () {}),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('AppTextField renders label and hint', (tester) async {
      final controller = TextEditingController();
      await tester.pumpWidget(
        _buildThemedApp(
          AppTextField(
            controller: controller,
            label: 'Trip Destination',
            hint: 'e.g. Kyoto, Japan',
          ),
        ),
      );

      expect(find.text('Trip Destination'), findsOneWidget);
      expect(find.text('e.g. Kyoto, Japan'), findsOneWidget);

      await tester.enterText(find.byType(TextField), 'Kyoto');
      expect(controller.text, equals('Kyoto'));
    });

    testWidgets('AppSwitch toggles correctly and triggers callback', (
      tester,
    ) async {
      bool switchVal = false;
      await tester.pumpWidget(
        StatefulBuilder(
          builder: (context, setState) {
            return _buildThemedApp(
              AppSwitch(
                value: switchVal,
                title: 'Enable Live Radar',
                onChanged: (val) {
                  setState(() => switchVal = val);
                },
              ),
            );
          },
        ),
      );

      expect(find.text('Enable Live Radar'), findsOneWidget);
      await tester.tap(find.byType(AppSwitch));
      await tester.pumpAndSettle();
      expect(switchVal, isTrue);
    });

    testWidgets('CategoryChip displays icon and label with selection state', (
      tester,
    ) async {
      bool chipSelected = false;
      await tester.pumpWidget(
        StatefulBuilder(
          builder: (context, setState) {
            return _buildThemedApp(
              CategoryChip(
                label: 'Food & Dining',
                icon: '🍜',
                isSelected: chipSelected,
                onTap: () => setState(() => chipSelected = !chipSelected),
              ),
            );
          },
        ),
      );

      expect(find.text('Food & Dining'), findsOneWidget);
      expect(find.text('🍜'), findsOneWidget);

      await tester.tap(find.byType(CategoryChip));
      await tester.pumpAndSettle();
      expect(chipSelected, isTrue);
    });

    testWidgets('AppAvatar generates deterministic initials and colors', (
      tester,
    ) async {
      await tester.pumpWidget(
        _buildThemedApp(const AppAvatar(name: 'Rahul Maurya', size: 44)),
      );

      expect(find.text('RM'), findsOneWidget);
    });

    testWidgets('EmptyState displays title, subtitle, and action', (
      tester,
    ) async {
      await tester.pumpWidget(
        _buildThemedApp(
          EmptyState(
            icon: AppIcons.expenses,
            title: 'No Expenses Recorded',
            subtitle: 'Add your first receipt to get started.',
            action: ElevatedButton(
              onPressed: () {},
              child: const Text('Add Expense'),
            ),
          ),
        ),
      );

      expect(find.text('No Expenses Recorded'), findsOneWidget);
      expect(
        find.text('Add your first receipt to get started.'),
        findsOneWidget,
      );
      expect(find.text('Add Expense'), findsOneWidget);
    });

    testWidgets('SkeletonLoader renders placeholder boxes and circles', (
      tester,
    ) async {
      await tester.pumpWidget(
        _buildThemedApp(
          const SkeletonLoader(
            child: Column(
              children: [
                SkeletonBox(width: 120, height: 20),
                SkeletonCircle(size: 40),
              ],
            ),
          ),
        ),
      );

      expect(find.byType(SkeletonBox), findsOneWidget);
      expect(find.byType(SkeletonCircle), findsOneWidget);
    });

    testWidgets('AnimatedNumber renders formatted numeric value', (
      tester,
    ) async {
      await tester.pumpWidget(
        _buildThemedApp(
          const AnimatedNumber(value: 250.75, prefix: '\$ ', decimalPlaces: 2),
        ),
      );

      await tester.pumpAndSettle();
      expect(find.text('\$ 250.75'), findsOneWidget);
    });

    testWidgets('SlideToUnlock displays track and drag thumb', (tester) async {
      await tester.pumpWidget(
        _buildThemedApp(
          SlideToUnlock(label: 'Slide to Settle Balance', onConfirmed: () {}),
        ),
      );

      expect(find.text('Slide to Settle Balance'), findsOneWidget);
      expect(find.byIcon(AppIcons.chevronRight), findsOneWidget);
    });
  });
}
