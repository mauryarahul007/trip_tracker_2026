import 'package:flutter/material.dart';

import '../../../../domain/logic/trip_status.dart';
import '../../../../domain/logic/trip_utilities.dart' show formatDateRange;
import '../../../../domain/models/trip.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_icons.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/widgets/bento_tile.dart';

/// Stable pastel per trip, so a trip keeps its colour across sessions.
const _tripTones = [BentoTone.sky, BentoTone.peach, BentoTone.lilac, BentoTone.butter];

BentoTone tripTone(String tripId) => _tripTones[tripId.codeUnits.fold<int>(0, (a, b) => a + b) % _tripTones.length];

/// "Day 3 of 8", "Starts tomorrow", "Ended", or "" when the dates are unknown.
String tripHeadline(BuildContext context, TripStatus s) {
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

/// A trip as a Bento tile: destination eyebrow, big name, dates, a status pill and stat chips.
/// The trip happening today ([featured]) is the mint tile with a flight arc showing how far through it is.
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

  /// Render the in-progress trip as the large mint tile (home screen shows one).
  final bool featured;

  /// Overflow menu (delete…); null hides it (non-owners).
  final VoidCallback? onMenu;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final t = context.tokens;
    final status = tripStatus(trip.startDate, trip.endDate, now);
    final headline = tripHeadline(context, status);
    final dim = trip.archived || status.phase == TripPhase.ended;
    final isHero = featured && status.phase == TripPhase.active;
    final tone = isHero ? BentoTone.mint : tripTone(trip.id);
    final dest = (trip.destination ?? '').trim();
    final dates = trip.startDate.isNotEmpty ? formatDateRange(trip.startDate, trip.endDate) : '';
    final progress = status.totalDays <= 1 ? 0.5 : (status.dayNumber - 1) / (status.totalDays - 1);

    return Semantics(
      button: true,
      label: '${trip.name}. $headline',
      child: Opacity(
        opacity: dim ? 0.78 : 1,
        child: BentoTile(
          tone: tone,
          onTap: onTap,
          padding: EdgeInsets.fromLTRB(20, 18, 8, isHero ? 14 : 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        if (headline.isNotEmpty) TripStatusPill(headline),
                        if (dest.isNotEmpty) BentoTile.eyebrow(context, tone, dest),
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
                    const SizedBox(width: 12),
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
                      style: TextStyle(
                        fontFamily: AppTypography.fontTitle,
                        fontSize: isHero ? 32 : 24,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.8,
                        height: 1.05,
                        color: t.textPrimary,
                      ),
                    ),
                  ),
                ),
              ),
              if (dates.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  dates,
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: t.tones[tone].accent),
                ),
              ],
              if (isHero)
                Padding(
                  padding: const EdgeInsets.only(right: 12, top: 8),
                  child: SizedBox(
                    height: 56,
                    width: double.infinity,
                    child: CustomPaint(painter: _FlightArc(progress.clamp(0.0, 1.0), t.textPrimary, t.tones.mint.bg)),
                  ),
                ),
              Padding(
                padding: EdgeInsets.only(right: 12, top: isHero ? 0 : 12, bottom: isHero ? 0 : 8),
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    TripChip(l10n.tripTravelers(trip.memberIds.length)),
                    TripChip(l10n.tripExpenseCount(trip.expenseCount)),
                    if (trip.archived) TripChip(l10n.tripBadgeArchived),
                    if (trip.closed) TripChip(l10n.tripBadgeClosed),
                    if (trip.frozen) TripChip(l10n.tripBadgeFrozen),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Solid ink pill with the trip's status ("Day 3 of 8", "Starts tomorrow").
class TripStatusPill extends StatelessWidget {
  const TripStatusPill(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      decoration: BoxDecoration(color: t.ctaBg, borderRadius: BorderRadius.circular(99)),
      child: Text(
        text,
        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: t.ctaFg),
      ),
    );
  }
}

class TripChip extends StatelessWidget {
  const TripChip(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(color: t.textPrimary.withValues(alpha: 0.09), borderRadius: BorderRadius.circular(99)),
      child: Text(
        text,
        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: t.textPrimary),
      ),
    );
  }
}

/// Arc from departure to arrival with a dot at the current day, drawn in ink on the mint tile.
class _FlightArc extends CustomPainter {
  _FlightArc(this.progress, this.ink, this.ground);
  final double progress;
  final Color ink;
  final Color ground;

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
        ..color = ink.withValues(alpha: 0.25),
    );
    final metric = path.computeMetrics().first;
    canvas.drawPath(
      metric.extractPath(0, metric.length * progress),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.5
        ..strokeCap = StrokeCap.round
        ..color = ink,
    );
    final pos = metric.getTangentForOffset(metric.length * progress)!.position;
    canvas.drawCircle(pos, 11, Paint()..color = ink.withValues(alpha: 0.18));
    canvas.drawCircle(pos, 6, Paint()..color = ink);
    canvas.drawCircle(pos, 2.5, Paint()..color = ground);
  }

  @override
  bool shouldRepaint(_FlightArc old) => old.progress != progress || old.ink != ink || old.ground != ground;
}
