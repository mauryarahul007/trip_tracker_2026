import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/platform/haptics.dart';
import '../../../domain/logic/traveler_passport_service.dart';
import '../../../domain/models/trip.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_button.dart';
import '../../trips/application/trips_providers.dart';
import 'passport_stamp.dart';

class TravelerPassportModal extends ConsumerWidget {
  const TravelerPassportModal({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const TravelerPassportModal(),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tokens = context.tokens;
    final trips = ref.watch(tripsProvider).value ?? const <Trip>[];
    final passport = computeTravelerPassport(trips);

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.88,
      ),
      decoration: BoxDecoration(
        color: tokens.bgSurface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: tokens.borderColor,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: tokens.primaryAccent.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    alignment: Alignment.center,
                    child: const Text('🛂', style: TextStyle(fontSize: 18)),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'TRAVELER PASSPORT',
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.8,
                          color: tokens.primaryAccent,
                        ),
                      ),
                      Text(
                        'Lifetime Odyssey',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: tokens.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              IconButton(
                key: const Key('passport-close'),
                icon: const Icon(Icons.close, size: 20),
                onPressed: () {
                  AppHaptics.light();
                  Navigator.of(context).pop();
                },
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Lifetime Stats Grid
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: tokens.bgSurfaceHover,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: tokens.borderColor),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _StatItem(
                  label: 'Trips',
                  value: '${passport.trips}',
                  icon: '✈️',
                ),
                _StatItem(
                  label: 'Destinations',
                  value: '${passport.destinations}',
                  icon: '📍',
                ),
                _StatItem(
                  label: 'Settled',
                  value: '${passport.tripsSettled}',
                  icon: '✓',
                ),
                _StatItem(
                  label: 'Days on Road',
                  value: '${passport.daysOnTheRoad}',
                  icon: '🗓️',
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Stamps Collection Subtitle
          Text(
            'STAMP COLLECTION (${trips.length})',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.6,
              color: tokens.textSecondary,
            ),
          ),
          const SizedBox(height: 12),

          // Stamps Grid / Scrollable List
          Expanded(
            child: trips.isEmpty
                ? Center(
                    child: Text(
                      'No journeys yet. Create your first trip to get your visa stamp!',
                      style: TextStyle(color: tokens.textSecondary, fontSize: 13),
                      textAlign: TextAlign.center,
                    ),
                  )
                : GridView.builder(
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 3,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 0.85,
                    ),
                    itemCount: trips.length,
                    itemBuilder: (context, index) {
                      final t = trips[index];
                      return Container(
                        decoration: BoxDecoration(
                          color: tokens.bgSurfaceHover.withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: tokens.borderColor),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Expanded(
                              child: Center(
                                child: PassportStamp(
                                  destination: t.destination,
                                  tripName: t.name,
                                  date: t.startDate.length >= 7 ? t.startDate.substring(0, 7) : null,
                                  isSettled: t.closed,
                                  size: 64,
                                ),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              t.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: tokens.textPrimary,
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
            key: const Key('passport-done'),
            label: 'Close Passport',
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

class _StatItem extends StatelessWidget {
  const _StatItem({
    required this.label,
    required this.value,
    required this.icon,
  });

  final String label;
  final String value;
  final String icon;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Column(
      children: [
        Text(icon, style: const TextStyle(fontSize: 16)),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w900,
            color: tokens.textPrimary,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            color: tokens.textSecondary,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
