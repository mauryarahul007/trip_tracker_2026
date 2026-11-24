import 'dart:ui' show lerpDouble;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/flags/compass_flags.dart';
import '../../../../core/platform/motion.dart';
import '../../../../data/providers.dart';
import '../../../../domain/logic/expense_list_logic.dart' show isActualExpense;
import '../../../../domain/logic/trip_status.dart';
import '../../../../domain/logic/trip_utilities.dart' show formatDateRange;
import '../../../../domain/models/expense.dart';
import '../../../../domain/models/trip.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../../shared/theme/app_icons.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/widgets/app_avatar.dart';
import '../../../expenses/application/expenses_providers.dart' show tripExpensesProvider, visibleMembersProvider;
import '../../../expenses/application/money_providers.dart' show allTripsProvider;

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
          TripPhase.active => context.tokens.primaryAccent,
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

        final crew = ref.watch(visibleMembersProvider(trip?.id ?? ''));
        final counts = (
          ref.watch(visibleMembersProvider(trip?.id ?? '')).length,
          [
            for (final e in ref.watch(tripExpensesProvider(trip?.id ?? '')).value ?? const <Expense>[])
              if (isActualExpense(e) && e.deletedAt == null) e,
          ].length,
        );

        final meta = [
          if (dateText.isNotEmpty) dateText,
          '${counts.$1} member${counts.$1 == 1 ? '' : 's'}',
          '${counts.$2} expense${counts.$2 == 1 ? '' : 's'}',
        ].join('  ·  ');

        // Horizon (enableHorizonUi): "Day 4 of 7 · Goa" under the trip name.
        final horizonSub = [
          if (status.phase == TripPhase.active && status.totalDays > 0)
            'Day ${status.dayNumber} of ${status.totalDays}'
          else if (dateText.isNotEmpty)
            dateText,
          if ((trip?.destination ?? '').trim().isNotEmpty) trip!.destination!.trim(),
        ].join(' · ');

        final actionsOn = ref.watch(flagProvider(('enableTripHeaderActions', trip?.id))).value ?? true;
        final switchOn = ref.watch(flagProvider(('enableTripSwitcher', trip?.id))).value ?? true;
        final allTrips = ref.watch(allTripsProvider).value ?? const <Trip>[];
        final others = switchOn
            ? [
                for (final x in allTrips)
                  if (!x.archived) x,
              ]
            : const <Trip>[];
        final canSwitch = others.length > 1 && others.any((x) => x.id == trip?.id);

        final calm = ref.watch(compassFlagProvider((calmPassportFlag, trip?.id ?? '')));
        final compass = !calm && ref.watch(compassFlagProvider((compassNavFlag, trip?.id ?? '')));
        final showArrow = compass ? canSwitch : (actionsOn || canSwitch);

        final Key? titleActionKey = actionsOn
            ? const Key('trip-title-actions')
            : canSwitch
            ? const Key('trip-switcher')
            : null;

        return Container(
          decoration: BoxDecoration(
            color: t.bgPage.withValues(alpha: bgOpacity),
            border: Border(
              bottom: BorderSide(
                color: isSqueezed ? t.textSecondary.withValues(alpha: 0.15) : Colors.transparent,
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
                height: 52,
                child: AppBar(
                  // The header already pads for the status bar; AppBar adding it again pushed the title row under the sheet.
                  primary: false,
                  backgroundColor: Colors.transparent,
                  elevation: 0,
                  scrolledUnderElevation: 0,
                  toolbarHeight: 52,
                  automaticallyImplyLeading: false,
                  leading: IconButton(
                    tooltip: backTooltip,
                    icon: Icon(AppIcons.back, size: 20, color: iconColor),
                    onPressed: onBack,
                  ),
                  titleSpacing: 0,
                  title: KeyedSubtree(
                    key: const Key('trip-title'),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(minHeight: 48),
                      child: titleActionKey != null
                          ? InkWell(
                              key: titleActionKey,
                              onTap: onTitleTap,
                              borderRadius: BorderRadius.circular(8),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Flexible(
                                      child: t.horizon
                                          ? _HorizonTitle(
                                              name: trip?.name ?? '',
                                              subtitle: horizonSub,
                                              color: titleColor,
                                            )
                                          : AppMotion.hero(
                                              context: context,
                                              tag: 'trip-title-${trip?.id ?? ""}',
                                              child: Material(
                                                type: MaterialType.transparency,
                                                child: Text(
                                                  trip?.name ?? '',
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                  style:
                                                      AppTypography.tripTitle(
                                                        color: titleColor,
                                                        fontSize: titleFontSize,
                                                      ).copyWith(
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
                                            ),
                                    ),
                                    if (showArrow && !t.horizon) ...[
                                      const SizedBox(width: 4),
                                      Icon(
                                        Icons.expand_more_rounded,
                                        size: 20,
                                        color: iconColor.withValues(alpha: 0.8),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            )
                          : Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Flexible(
                                    child: AppMotion.hero(
                                      context: context,
                                      tag: 'trip-title-${trip?.id ?? ""}',
                                      child: Material(
                                        type: MaterialType.transparency,
                                        child: Text(
                                          trip?.name ?? '',
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: AppTypography.tripTitle(color: titleColor, fontSize: titleFontSize),
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                    ),
                  ),
                  actions: [
                    // Horizon: the crew sits in the header as a small avatar stack (left out on very narrow phones,
                    // where the title needs the room).
                    if (t.horizon && crew.length > 1 && MediaQuery.sizeOf(context).width >= 360)
                      Padding(
                        padding: const EdgeInsets.only(right: 4),
                        child: _AvatarStack(names: [for (final m in crew) m.name]),
                      ),
                    Theme(
                      data: Theme.of(context).copyWith(iconTheme: IconThemeData(color: iconColor, size: 20)),
                      child: Row(mainAxisSize: MainAxisSize.min, children: actions),
                    ),
                  ],
                ),
              ),

              // Bottom Row (Squeezable Metadata): Dates + Counts + Status Badge
              if (actionsOn)
                ClipRect(
                  child: SizedBox(
                    height: subRowHeight,
                    child: OverflowBox(
                      minHeight: 0,
                      maxHeight: 26,
                      alignment: Alignment.centerLeft,
                      child: Opacity(
                        opacity: subRowOpacity,
                        child: Padding(
                          padding: const EdgeInsets.only(left: 48, right: 16),
                          child: Row(
                            children: [
                              Container(
                                key: const Key('trip-status-dot'),
                                width: 7,
                                height: 7,
                                decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle),
                              ),
                              const SizedBox(width: 6),
                              Flexible(
                                child: Text(
                                  meta,
                                  key: const Key('trip-meta'),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: clampedProgress < 0.5 ? Colors.white70 : t.textSecondary,
                                  ),
                                ),
                              ),
                              if (!isSqueezed && statusLabel.isNotEmpty) ...[
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: statusColor.withValues(alpha: 0.22),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    statusLabel,
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      color: clampedProgress < 0.5 ? Colors.white : statusColor,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
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

/// Up to three overlapping member avatars, then a "+N" chip (Horizon trip header).
/// Horizon trip title: the name with a small "Day 4 of 7 · Goa" line under it.
class _HorizonTitle extends StatelessWidget {
  const _HorizonTitle({required this.name, required this.subtitle, required this.color});
  final String name;
  final String subtitle;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Column(
      key: const Key('trip-title-horizon'),
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: AppTypography.tripTitle(color: color, fontSize: 18),
        ),
        if (subtitle.isNotEmpty)
          Text(
            subtitle,
            key: const Key('trip-title-subtitle'),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontFamily: AppTypography.fontBody,
              fontSize: 12,
              fontWeight: FontWeight.w500,
              letterSpacing: 0,
              color: Color.lerp(color, t.textSecondary, 0.6),
            ),
          ),
      ],
    );
  }
}

class _AvatarStack extends StatelessWidget {
  const _AvatarStack({required this.names});
  final List<String> names;

  @override
  Widget build(BuildContext context) {
    const size = 26.0, step = 18.0;
    final shown = names.take(3).toList();
    final extra = names.length - shown.length;
    final count = shown.length + (extra > 0 ? 1 : 0);
    final t = context.tokens;
    return Semantics(
      label: '${names.length} people',
      excludeSemantics: true,
      child: SizedBox(
        key: const Key('trip-header-avatars'),
        width: size + step * (count - 1),
        height: size,
        child: Stack(
          children: [
            for (final (i, n) in shown.indexed)
              Positioned(
                left: step * i,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: t.bgPage, width: 1.5),
                  ),
                  child: AppAvatar(name: n, size: size - 3),
                ),
              ),
            if (extra > 0)
              Positioned(
                left: step * shown.length,
                child: Container(
                  width: size,
                  height: size,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: t.bgSurfaceHover,
                    border: Border.all(color: t.bgPage, width: 1.5),
                  ),
                  child: Text(
                    '+$extra',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: t.textPrimary),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
