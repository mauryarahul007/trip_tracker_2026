import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/trip_status.dart';

void main() {
  final today = DateTime(2026, 10, 6, 15, 30);

  test('upcoming counts whole calendar days, ignoring time of day', () {
    final s = tripStatus('2026-10-07', '2026-10-10', today);
    expect(s.phase, TripPhase.upcoming);
    expect(s.daysUntilStart, 1);
    expect(s.totalDays, 4);
    expect(tripStatus('2026-10-20', '2026-10-21', today).daysUntilStart, 14);
  });

  test('active: day numbering is inclusive on both ends', () {
    expect(tripStatus('2026-10-06', '2026-10-08', today).dayNumber, 1);
    expect(tripStatus('2026-10-04', '2026-10-08', today).dayNumber, 3);
    final last = tripStatus('2026-10-04', '2026-10-06', today);
    expect(last.phase, TripPhase.active);
    expect(last.dayNumber, 3);
    expect(last.totalDays, 3);
  });

  test('ended after the last day', () {
    expect(tripStatus('2026-10-01', '2026-10-05', today).phase, TripPhase.ended);
  });

  test('single-day trip today is Day 1 of 1', () {
    final s = tripStatus('2026-10-06', '2026-10-06', today);
    expect((s.phase, s.dayNumber, s.totalDays), (TripPhase.active, 1, 1));
  });

  test('bad or inverted dates are unknown, never a crash', () {
    expect(tripStatus('', '', today).phase, TripPhase.unknown);
    expect(tripStatus('x', '2026-10-06', today).phase, TripPhase.unknown);
    expect(tripStatus('2026-10-09', '2026-10-06', today).phase, TripPhase.unknown);
  });

  test('DST boundary does not skew day counts', () {
    // US DST ends 2026-11-01; 23/25h days must still count as one day.
    final s = tripStatus('2026-11-03', '2026-11-04', DateTime(2026, 10, 30, 23, 59));
    expect(s.daysUntilStart, 4);
  });
}
