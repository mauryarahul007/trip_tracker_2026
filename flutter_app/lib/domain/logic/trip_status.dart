/// Where a trip is relative to today, for the card headline.
enum TripPhase { upcoming, active, ended, unknown }

class TripStatus {
  const TripStatus(this.phase, {this.daysUntilStart = 0, this.dayNumber = 0, this.totalDays = 0});
  final TripPhase phase;

  /// upcoming: whole days until the first day (1 = tomorrow).
  final int daysUntilStart;

  /// active: 1-based day of the trip.
  final int dayNumber;
  final int totalDays;
}

DateTime? _day(String iso) {
  final d = DateTime.tryParse(iso);
  return d == null ? null : DateTime(d.year, d.month, d.day);
}

/// Calendar-day comparison (no time-of-day drift across zones/DST).
TripStatus tripStatus(String startDate, String endDate, DateTime now) {
  final start = _day(startDate);
  final end = _day(endDate);
  if (start == null || end == null || end.isBefore(start)) return const TripStatus(TripPhase.unknown);
  final today = DateTime(now.year, now.month, now.day);
  // Differences via UTC so DST never yields 23/25h days.
  int days(DateTime a, DateTime b) =>
      DateTime.utc(b.year, b.month, b.day).difference(DateTime.utc(a.year, a.month, a.day)).inDays;
  final total = days(start, end) + 1;
  if (today.isBefore(start)) {
    return TripStatus(TripPhase.upcoming, daysUntilStart: days(today, start), totalDays: total);
  }
  if (today.isAfter(end)) return TripStatus(TripPhase.ended, totalDays: total);
  return TripStatus(TripPhase.active, dayNumber: days(start, today) + 1, totalDays: total);
}
