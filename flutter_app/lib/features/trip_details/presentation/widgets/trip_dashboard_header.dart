import 'dart:ui' show lerpDouble;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../domain/logic/trip_status.dart';
import '../../../../domain/logic/trip_utilities.dart' show formatDateRange;
import '../../../../domain/models/trip.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../../shared/theme/app_colors.dart';
import '../../../../shared/theme/app_icons.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';

/// Floating squeezable header for the active trip dashboard.
/// Parity with web `.trip-dashboard-header` in `src/App.tsx` and `src/index.css`.
///
/// When the content sheet is peeked (showing the photo/map gap), the header expands
/// with high-contrast text, dates, and status pill over the backdrop.
/// When the sheet is swiped up to full screen, the header smoothly squeezes into a
/// compact sticky glass bar, without removing ANY action button or menu item.
class TripDashboardHeader extends ConsumerWidget {
  final Trip? trip;
  final ValueNotifier<double> progressNotifier;
  final VoidCallback onBack;
  final List<Widget> actions;
  final String tab;
  final VoidCallback? onTitleTap;

  const TripDashboardHeader({
    super.key,
    required this.trip,
    required this.progressNotifier,
    required this.onBack,
    required this.actions,
    required this.tab,
    this.onTitleTap,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.tokens;
    final backTooltip = AppLocalizations.of(context)?.actionBack ?? 'Back';
    final safeTop = MediaQuery.paddingOf(context).top;

    return ValueListenableBuilder<double>(
      valueListenable: progressNotifier,
      builder: (context, progress, _) {
        // progress: 0.0 = peeked (map visible), 1.0 = full screen
        final clampedProgress = progress.clamp(0.0, 1.0);
        final isSqueezed = clampedProgress > 0.85;

        // Background color & gradient interpolation
        final bgOpacity = clampedProgress;
        final subRowHeight = lerpDouble(26.0, 0.0, clampedProgress)!;
        final subRowOpacity = (1.0 - clampedProgress * 1.8).clamp(0.0, 1.0);

        final titleFontSize = lerpDouble(20.0, 16.5, clampedProgress)!;
        final titleColor = Color.lerp(Colors.white, t.textPrimary, clampedProgress)!;
        final iconColor = Color.lerp(Colors.white, t.textPrimary, clampedProgress)!;

        // Trip status
        final now = DateTime.now();
        final status = trip != null
            ? tripStatus(trip!.startDate, trip!.endDate, now)
            : const TripStatus(TripPhase.active);

        final statusColor = switch (status.phase) {
          TripPhase.active => AppColors.calmTeal,
          TripPhase.upcoming => const Color(0xFFF0AE5C),
          TripPhase.ended => Colors.white70,
          TripPhase.unknown => Colors.white70,
        };

        final statusLabel = switch (status.phase) {
          TripPhase.active => 'Active',
          TripPhase.upcoming => 'Upcoming',
          TripPhase.ended => 'Completed',
          TripPhase.unknown => '',
        };

        final dateText = (trip != null && trip!.startDate.isNotEmpty)
            ? formatDateRange(trip!.startDate, trip!.endDate)
            : '';

        return Container(
          decoration: BoxDecoration(
            color: t.bgPage.withValues(alpha: bgOpacity),
            border: Border(
              bottom: BorderSide(
                color: isSqueezed
                    ? t.textSecondary.withValues(alpha: 0.15)
                    : Colors.transparent,
                width: 1.0,
              ),
            ),
            gradient: clampedProgress < 0.9
                ? LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withValues(alpha: 0.65 * (1.0 - clampedProgress)),
                      Colors.black.withValues(alpha: 0.25 * (1.0 - clampedProgress)),
                      Colors.transparent,
                    ],
                  )
                : null,
          ),
          padding: EdgeInsets.fromLTRB(8, safeTop + 4, 8, 4),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Top Row (Always visible): Back Button + Title + Actions
              SizedBox(
                height: 48,
                child: Row(
                  children: [
                    // Back button (Leading)
                    IconButton(
                      tooltip: backTooltip,
                      icon: Icon(AppIcons.back, size: 20, color: iconColor),
                      onPressed: onBack,
                    ),

                    // Trip Title with dropdown chevron
                    Expanded(
                      child: InkWell(
                        onTap: onTitleTap,
                        borderRadius: BorderRadius.circular(8),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Flexible(
                                child: Text(
                                  trip?.name ?? '',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontFamily: AppTypography.fontTitle,
                                    fontWeight: FontWeight.w800,
                                    fontSize: titleFontSize,
                                    letterSpacing: -0.3,
                                    color: titleColor,
                                    shadows: clampedProgress < 0.5
                                        ? [
                                            Shadow(
                                              color: Colors.black.withValues(alpha: 0.6),
                                              blurRadius: 4,
                                              offset: const Offset(0, 1),
                                            ),
                                          ]
                                        : null,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 4),
                              Icon(
                                Icons.keyboard_arrow_down_rounded,
                                size: 18,
                                color: iconColor.withValues(alpha: 0.8),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),

                    // Trailing actions (Sync, Notifications, More Menu, Bug tracker)
                    // Never removed, fully accessible in both expanded and squeezed states!
                    Theme(
                      data: Theme.of(context).copyWith(
                        iconTheme: IconThemeData(color: iconColor, size: 20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: actions,
                      ),
                    ),
                  ],
                ),
              ),

              // Bottom Row (Squeezable Metadata): Dates + Status Badge
              if (subRowHeight > 1.0)
                ClipRect(
                  child: SizedBox(
                    height: subRowHeight,
                    child: Opacity(
                      opacity: subRowOpacity,
                      child: Padding(
                        padding: const EdgeInsets.only(left: 48, right: 16),
                        child: Row(
                          children: [
                            if (dateText.isNotEmpty) ...[
                              Icon(
                                Icons.calendar_today_outlined,
                                size: 12,
                                color: clampedProgress < 0.5 ? Colors.white70 : t.textSecondary,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                dateText,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: clampedProgress < 0.5 ? Colors.white70 : t.textSecondary,
                                ),
                              ),
                              const SizedBox(width: 8),
                            ],
                            if (statusLabel.isNotEmpty)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: statusColor.withValues(alpha: 0.22),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Container(
                                      width: 6,
                                      height: 6,
                                      decoration: BoxDecoration(
                                        color: statusColor,
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      statusLabel,
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                        color: clampedProgress < 0.5 ? Colors.white : statusColor,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}
