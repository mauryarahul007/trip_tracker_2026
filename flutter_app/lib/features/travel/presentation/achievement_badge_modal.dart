import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/platform/haptics.dart';
import '../../../domain/logic/achievements_service.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_button.dart';
import '../../expenses/application/expenses_providers.dart';
import '../../trip_details/application/trip_nav.dart';

class AchievementBadgeModal extends ConsumerWidget {
  const AchievementBadgeModal({required this.tripId, super.key});
  final String tripId;

  static Future<void> show(BuildContext context, {required String tripId}) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AchievementBadgeModal(tripId: tripId),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tokens = context.tokens;
    final trip = ref.watch(tripProvider(tripId)).value;
    final expenses = ref.watch(tripExpensesProvider(tripId)).value ?? const [];
    final members = ref.watch(tripMembersProvider(tripId)).value ?? const [];
    final categories = ref.watch(tripCategoriesProvider(tripId));

    if (trip == null) {
      return const SizedBox.shrink();
    }

    final isFullySettled = trip.closed;
    final badges = calculateTripAchievements(trip, expenses, members, categories, isFullySettled);
    final unlockedCount = badges.where((b) => b.unlocked).length;

    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.85),
      decoration: BoxDecoration(
        color: tokens.bgSurface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(color: tokens.borderColor, borderRadius: BorderRadius.circular(2)),
            ),
          ),
          const SizedBox(height: 16),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'SQUAD MILESTONES',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.8,
                      color: tokens.primaryAccent,
                    ),
                  ),
                  Row(
                    children: [
                      const Text('🏆 ', style: TextStyle(fontSize: 18)),
                      Text(
                        'Trip Achievements',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: tokens.textPrimary),
                      ),
                    ],
                  ),
                  Text(
                    '$unlockedCount of ${badges.length} Enamel Pins Unlocked',
                    style: TextStyle(fontSize: 12, color: tokens.textSecondary),
                  ),
                ],
              ),
              IconButton(
                tooltip: MaterialLocalizations.of(context).closeButtonTooltip,
                key: const Key('achievements-close'),
                icon: const Icon(Icons.close, size: 20),
                onPressed: () {
                  AppHaptics.light();
                  Navigator.of(context).pop();
                },
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Overall progress (board 06 #6)
          DecoratedBox(
            decoration: BoxDecoration(
              color: tokens.bgSurface,
              borderRadius: BorderRadius.circular(tokens.radiusMd),
              boxShadow: tokens.shadowSm,
            ),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '$unlockedCount of ${badges.length} unlocked',
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      Text(
                        '${badges.isEmpty ? 0 : (unlockedCount * 100 / badges.length).round()}%',
                        style: TextStyle(fontWeight: FontWeight.w700, color: tokens.primaryAccent),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(99),
                    child: LinearProgressIndicator(
                      value: badges.isEmpty ? 0 : unlockedCount / badges.length,
                      minHeight: 8,
                      backgroundColor: tokens.borderColor,
                      color: tokens.primaryAccent,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Badges List
          Expanded(
            child: ListView.separated(
              itemCount: badges.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final b = badges[index];
                return Container(
                  key: Key('badge-${b.id}'),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: b.unlocked ? tokens.bgSurfaceHover : tokens.bgSurfaceHover.withValues(alpha: 0.4),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: b.unlocked ? tokens.primaryAccent.withValues(alpha: 0.4) : tokens.borderColor,
                      width: b.unlocked ? 1.5 : 1.0,
                    ),
                  ),
                  child: Row(
                    children: [
                      // Enamel Pin Avatar
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          // Glossy 3D orb when unlocked, flat grey when locked.
                          gradient: b.unlocked
                              ? RadialGradient(
                                  center: const Alignment(-0.4, -0.5),
                                  colors: [tokens.primaryAccentLight, tokens.primaryAccent],
                                )
                              : null,
                          color: b.unlocked ? null : tokens.borderColor.withValues(alpha: 0.6),
                          boxShadow: b.unlocked
                              ? [
                                  BoxShadow(
                                    color: tokens.primaryAccent.withValues(alpha: 0.35),
                                    blurRadius: 12,
                                    offset: const Offset(0, 5),
                                  ),
                                ]
                              : null,
                        ),
                        alignment: Alignment.center,
                        child: Opacity(
                          opacity: b.unlocked ? 1 : 0.4,
                          child: Text(b.icon, style: const TextStyle(fontSize: 22)),
                        ),
                      ),
                      const SizedBox(width: 14),

                      // Badge info
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    b.title,
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                      color: tokens.textPrimary,
                                    ),
                                  ),
                                ),
                                if (b.unlocked)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: tokens.colorSuccess.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      '✓ Unlocked',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: tokens.colorSuccess,
                                      ),
                                    ),
                                  )
                                else
                                  Text(
                                    b.progressText,
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontFamily: 'monospace',
                                      color: tokens.textSecondary,
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              b.subtitle,
                              style: TextStyle(fontSize: 11.5, color: tokens.textSecondary, height: 1.3),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 16),

          AppButton(
            key: const Key('achievements-done'),
            label: 'Done',
            onPressed: () {
              AppHaptics.light();
              Navigator.of(context).pop();
            },
          ),
        ],
      ),
    );
  }
}
