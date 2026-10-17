import 'package:flutter/material.dart';

import '../../../../domain/logic/trip_status.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_tokens.dart';

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
