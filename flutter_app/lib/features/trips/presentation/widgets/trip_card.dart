import 'package:flutter/material.dart';

import '../../../../domain/logic/trip_status.dart';
import '../../../../domain/logic/trip_utilities.dart' show formatDateRange;
import '../../../../domain/models/trip.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_icons.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/widgets/app_surface.dart';
import '../../../travel/presentation/passport_stamp.dart';

class TripCard extends StatelessWidget {
  const TripCard({
    required this.trip,
    required this.now,
    required this.onTap,
    this.onMenu,
    this.featured = false,
    super.key,
  });

  final Trip trip;
  final DateTime now;
  final VoidCallback onTap;

  /// Render the in-progress trip as a Night Sky hero (home screen shows one).
  final bool featured;

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

    final dest = (trip.destination ?? '').trim();
    final dates = trip.startDate.isNotEmpty ? formatDateRange(trip.startDate, trip.endDate) : '';

    if (featured && status.phase == TripPhase.active) {
      return _TripHero(trip: trip, status: status, headline: headline, onTap: onTap, onMenu: onMenu);
    }

    // Passport card (DESIGN.md signature component): stamp top-right, mono destination
    // eyebrow, title-font name, dashed ticket-stub rule above the footer.
    return Semantics(
      button: true,
      label: '${trip.name}. $headline',
      child: Opacity(
        opacity: dim ? 0.7 : 1,
        child: DecoratedBox(
          decoration: tokens.cardDecoration(),
          child: Material(
            type: MaterialType.transparency,
            child: InkWell(
              borderRadius: BorderRadius.circular(tokens.radiusMd),
              onTap: onTap,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(18, 16, 8, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (dest.isNotEmpty)
                                Text(
                                  dest.toUpperCase(),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontFamily: AppTypography.fontMono,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    letterSpacing: 0.88,
                                    color: tokens.primaryAccent,
                                  ),
                                ),
                              const SizedBox(height: 4),
                              Hero(
                                tag: 'trip-title-${trip.id}',
                                child: Material(
                                  type: MaterialType.transparency,
                                  child: Text(
                                    trip.name,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontFamily: AppTypography.fontTitle,
                                      fontSize: 19,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: -0.4,
                                      color: tokens.textPrimary,
                                    ),
                                  ),
                                ),
                              ),
                              if (dates.isNotEmpty) ...[
                                const SizedBox(height: 4),
                                Text(dates, style: TextStyle(fontSize: 13, color: tokens.textSecondary)),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        ExcludeSemantics(
                          child: Padding(
                            padding: const EdgeInsets.only(right: 10),
                            child: PassportStamp(
                              destination: trip.destination,
                              tripName: trip.name,
                              isSettled: trip.closed,
                              size: 52,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    CustomPaint(
                      painter: _DashedRule(tokens.borderColor),
                      child: const SizedBox(height: 1.5, width: double.infinity),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: Wrap(
                            spacing: 10,
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
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// 1.5px dashed ticket-stub perforation (.pp-foot).
class _DashedRule extends CustomPainter {
  _DashedRule(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.5;
    for (double x = 0; x < size.width; x += 9) {
      canvas.drawLine(Offset(x, 0), Offset(x + 5, 0), paint);
    }
  }

  @override
  bool shouldRepaint(_DashedRule old) => old.color != color;
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

/// Night Sky hero for the trip that is happening now: destination eyebrow, big name, flight arc
/// with a plane at today's position, and a stats strip.
class _TripHero extends StatelessWidget {
  const _TripHero({
    required this.trip,
    required this.status,
    required this.headline,
    required this.onTap,
    required this.onMenu,
  });

  final Trip trip;
  final TripStatus status;
  final String headline;
  final VoidCallback onTap;
  final VoidCallback? onMenu;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final t = context.tokens;
    final dest = (trip.destination ?? '').trim();
    final dates = trip.startDate.isNotEmpty ? formatDateRange(trip.startDate, trip.endDate) : '';
    final progress = status.totalDays <= 1 ? 0.5 : (status.dayNumber - 1) / (status.totalDays - 1);

    return Semantics(
      button: true,
      label: '${trip.name}. $headline',
      child: HeroSurface(
        kind: SurfaceKind.night,
        padding: EdgeInsets.zero,
        child: Material(
          type: MaterialType.transparency,
          child: InkWell(
            borderRadius: BorderRadius.circular(t.radiusLg),
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 8, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Wrap(
                          spacing: 8,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            _Pill(headline),
                            if (dest.isNotEmpty) Eyebrow(dest, color: Colors.white.withValues(alpha: 0.6)),
                          ],
                        ),
                      ),
                      if (onMenu != null)
                        IconButton(
                          tooltip: l10n.tripDelete,
                          constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
                          icon: const Icon(AppIcons.more),
                          onPressed: onMenu,
                        ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Padding(
                    padding: const EdgeInsets.only(right: 12),
                    child: Hero(
                      tag: 'trip-title-${trip.id}',
                      child: Material(
                        type: MaterialType.transparency,
                        child: Text(
                          trip.name,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontFamily: AppTypography.fontTitle,
                            fontSize: 30,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.9,
                            height: 1.05,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ),
                  if (dates.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(dates, style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.7))),
                  ],
                  Padding(
                    padding: const EdgeInsets.only(right: 12, top: 8),
                    child: SizedBox(
                      height: 56,
                      width: double.infinity,
                      child: CustomPaint(painter: _FlightArc(progress.clamp(0.0, 1.0), t.primaryAccentLight)),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(right: 12),
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _Stat(l10n.tripTravelers(trip.memberIds.length)),
                        _Stat(l10n.tripExpenseCount(trip.expenseCount)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(99)),
    child: Text(
      text,
      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white),
    ),
  );
}

class _Stat extends StatelessWidget {
  const _Stat(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: 0.08),
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
    ),
    child: Text(
      text,
      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white),
    ),
  );
}

/// Arc from departure to arrival with a glowing dot at the current day.
class _FlightArc extends CustomPainter {
  _FlightArc(this.progress, this.accent);
  final double progress;
  final Color accent;

  @override
  void paint(Canvas canvas, Size size) {
    final start = Offset(0, size.height - 4);
    final end = Offset(size.width, size.height - 4);
    final ctrl = Offset(size.width / 2, -size.height * 0.5);
    final path = Path()
      ..moveTo(start.dx, start.dy)
      ..quadraticBezierTo(ctrl.dx, ctrl.dy, end.dx, end.dy);
    canvas.drawPath(
      path,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5
        ..color = Colors.white.withValues(alpha: 0.25),
    );
    final metric = path.computeMetrics().first;
    canvas.drawPath(
      metric.extractPath(0, metric.length * progress),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.5
        ..strokeCap = StrokeCap.round
        ..color = Colors.white,
    );
    final pos = metric.getTangentForOffset(metric.length * progress)!.position;
    canvas.drawCircle(pos, 11, Paint()..color = accent.withValues(alpha: 0.35));
    canvas.drawCircle(pos, 5, Paint()..color = Colors.white);
  }

  @override
  bool shouldRepaint(_FlightArc old) => old.progress != progress || old.accent != accent;
}
