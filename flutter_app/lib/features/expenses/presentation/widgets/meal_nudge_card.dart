import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/clock.dart';
import '../../../../core/storage/prefs.dart';
import '../../../../data/providers.dart';
import '../../../../domain/logic/predictive_expenses.dart';
import '../../../../domain/logic/trip_status.dart';
import '../../../../domain/models/category.dart';
import '../../../../domain/models/expense.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../trip_details/application/trip_nav.dart' show tripProvider;
import '../../application/expenses_providers.dart' show tripCategoriesProvider, tripExpensesProvider;

/// Prefs key for "Not today" on one meal of one trip day.
String mealNudgeKey(String tripId, DateTime now, MealSlot slot) =>
    'meal.nudge.$tripId.${now.year}-${now.month}-${now.day}.${slot.name}';

bool _isFood(String categoryId, List<Category> categories) {
  if (categoryId == 'cat-food') return true;
  final name = categories.where((c) => c.id == categoryId).firstOrNull?.name.toLowerCase() ?? '';
  return ['food', 'dining', 'meal', 'restaurant', 'drink'].any(name.contains);
}

/// Spend tab card (flag `enableMealNudges`): during a trip happening now, asks "Added breakfast?" from 10 AM,
/// lunch from 3 PM and dinner from 8 PM, only while nothing like that meal is logged today. Add opens a new
/// expense titled with the meal; Not today hides that meal for the day on this device.
class MealNudgeCard extends ConsumerStatefulWidget {
  const MealNudgeCard({required this.tripId, super.key});

  final String tripId;

  @override
  ConsumerState<MealNudgeCard> createState() => _MealNudgeCardState();
}

class _MealNudgeCardState extends ConsumerState<MealNudgeCard> {
  final _dismissed = <String>{};

  @override
  Widget build(BuildContext context) {
    final id = widget.tripId;
    if (!(ref.watch(flagProvider(('enableMealNudges', id))).value ?? false)) return const SizedBox.shrink();
    final trip = ref.watch(tripProvider(id)).value;
    if (trip == null || trip.archived) return const SizedBox.shrink();
    final now = ref.watch(nowProvider)();
    if (tripStatus(trip.startDate, trip.endDate, now).phase != TripPhase.active) return const SizedBox.shrink();
    final slot = mealSlotAt(now);
    if (slot == null) return const SizedBox.shrink();
    final prefs = ref.watch(sharedPreferencesProvider);
    final key = mealNudgeKey(id, now, slot);
    if (_dismissed.contains(key) || (prefs.getBool(key) ?? false)) return const SizedBox.shrink();
    final categories = ref.watch(tripCategoriesProvider(id));
    final expenses = ref.watch(tripExpensesProvider(id)).value ?? const <Expense>[];
    if (mealLogged(slot, expenses, now, (c) => _isFood(c, categories))) return const SizedBox.shrink();

    final l10n = context.l10n;
    final t = context.tokens;
    final tone = t.tones[BentoTone.butter];
    final icon = switch (slot) {
      MealSlot.breakfast => Icons.free_breakfast_outlined,
      MealSlot.lunch => Icons.lunch_dining_outlined,
      MealSlot.dinner => Icons.dinner_dining_outlined,
    };
    return Padding(
      key: const Key('meal-nudge'),
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Material(
        color: tone.bg,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 10, 6, 10),
          child: Row(
            children: [
              Icon(icon, color: tone.accent),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.mealNudgeQuestion(slot.name),
                      style: TextStyle(fontWeight: FontWeight.w700, color: t.textPrimary),
                    ),
                    Text(l10n.mealNudgeBody, style: TextStyle(fontSize: 12, color: t.textSecondary)),
                  ],
                ),
              ),
              TextButton(
                key: const Key('meal-nudge-dismiss'),
                style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
                onPressed: () {
                  setState(() => _dismissed.add(key));
                  prefs.setBool(key, true);
                },
                child: Text(l10n.mealNudgeNotToday),
              ),
              FilledButton(
                key: const Key('meal-nudge-add'),
                style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
                onPressed: () => context.push(
                  Uri(
                    path: '/trip/$id/expenses/new',
                    queryParameters: {'meal': l10n.mealNudgeTitle(slot.name)},
                  ).toString(),
                ),
                child: Text(l10n.mealNudgeAdd),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
