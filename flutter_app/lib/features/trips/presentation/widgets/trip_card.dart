import 'package:flutter/material.dart';

import '../../../../domain/logic/trip_status.dart';
import '../../../../domain/logic/trip_utilities.dart' show formatDateRange;
import '../../../../domain/models/trip.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_icons.dart';
import '../../../../shared/theme/app_tokens.dart';

class TripCard extends StatelessWidget {
  const TripCard({required this.trip, required this.now, required this.onTap, this.onMenu, super.key});

  final Trip trip;
  final DateTime now;
  final VoidCallback onTap;

  /// Overflow menu (delete…); null hides it (non-owners).
  final VoidCallback? onMenu;

  String _headline(BuildContext context, TripStatus s) {
    final l10n = context.l10n;
    switch (s.phase) {
      case TripPhase.upcoming:
        return s.daysUntilStart == 1 ? l10n.tripStartsTomorrow : l10n.tripStartsIn(s.daysUntilStart);
      case TripPhase.active:
        return l10n.tripDayOf(s.dayNumber, s.totalDays);
      case TripPhase.ended:
        return l10n.tripEnded;
      case TripPhase.unknown:
        return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    final status = tripStatus(trip.startDate, trip.endDate, now);
    final headline = _headline(context, status);
    final dim = trip.archived || status.phase == TripPhase.ended;

    return Semantics(
      button: true,
      label: '${trip.name}. $headline',
      child: Material(
        color: tokens.bgSurface,
        borderRadius: BorderRadius.circular(tokens.radiusMd),
        child: InkWell(
          borderRadius: BorderRadius.circular(tokens.radiusMd),
          onTap: onTap,
          child: Container(
            constraints: const BoxConstraints(minHeight: 88),
            padding: const EdgeInsets.fromLTRB(16, 14, 8, 14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(tokens.radiusMd),
              border: Border.all(color: tokens.borderColor),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Opacity(
                    opacity: dim ? 0.7 : 1,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Hero(
                          tag: 'trip-title-${trip.id}',
                          child: Material(
                            type: MaterialType.transparency,
                            child: Text(
                              trip.name,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: tokens.textPrimary),
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          [
                            if ((trip.destination ?? '').isNotEmpty) trip.destination!,
                            if (trip.startDate.isNotEmpty) formatDateRange(trip.startDate, trip.endDate),
                          ].join(' · '),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 13, color: tokens.textSecondary),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 4,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            if (headline.isNotEmpty)
                              Text(
                                headline,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: tokens.primaryAccent,
                                ),
                              ),
                            Text(
                              l10n.tripTravelers(trip.memberIds.length),
                              style: TextStyle(fontSize: 12, color: tokens.textMuted),
                            ),
                            Text(
                              l10n.tripExpenseCount(trip.expenseCount),
                              style: TextStyle(fontSize: 12, color: tokens.textMuted),
                            ),
                            if (trip.archived) _Badge(l10n.tripBadgeArchived, tokens.textMuted),
                            if (trip.closed) _Badge(l10n.tripBadgeClosed, tokens.successColor),
                            if (trip.frozen) _Badge(l10n.tripBadgeFrozen, tokens.primaryAccent),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                if (onMenu != null)
                  IconButton(
                    tooltip: l10n.tripDelete,
                    constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
                    icon: const Icon(AppIcons.more),
                    onPressed: onMenu,
                  )
                else
                  Icon(AppIcons.chevronRight, color: tokens.textMuted),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge(this.label, this.color);
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
    decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
    child: Text(
      label,
      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color),
    ),
  );
}
