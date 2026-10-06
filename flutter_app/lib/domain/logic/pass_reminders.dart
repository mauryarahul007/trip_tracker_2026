import '../models/travel_pass.dart';

/// Local reminders for travel passes (port of `passReminders.ts`): flights and trains get
/// 24 h and 3 h before departure, everything else 24 h. Ids are stable per (pass, slot) so a
/// reschedule replaces rather than duplicates.
class PlannedReminder {
  const PlannedReminder({
    required this.id,
    required this.fireAt,
    required this.title,
    required this.body,
    required this.tripId,
    required this.passId,
  });

  final int id;
  final DateTime fireAt;
  final String title;
  final String body;
  final String tripId;
  final String passId;
}

const _day = Duration(hours: 24);
const _threeHours = Duration(hours: 3);

/// Positive 31-bit id from a string (the platform APIs want ints).
int reminderId(String seed) {
  var h = 0;
  for (final c in seed.codeUnits) {
    h = (h * 31 + c).toSigned(32);
  }
  return (h.abs() % 2000000000) + 1;
}

String _label(Duration offset) => offset >= _day ? 'in 24 hours' : (offset >= _threeHours ? 'in 3 hours' : 'soon');

/// Quiet hours move a reminder to the end of the window, unless that would be after departure.
DateTime applyQuietHours(
  DateTime fireAt,
  DateTime departure, {
  required bool enabled,
  required String start,
  required String end,
}) {
  if (!enabled) return fireAt;
  int mins(String hhmm) {
    final p = hhmm.split(':');
    return (int.tryParse(p[0]) ?? 0) * 60 + (int.tryParse(p.length > 1 ? p[1] : '0') ?? 0);
  }

  final s = mins(start), e = mins(end), m = fireAt.hour * 60 + fireAt.minute;
  final inWindow = s == e ? false : (s < e ? (m >= s && m < e) : (m >= s || m < e));
  if (!inWindow) return fireAt;
  var moved = DateTime(fireAt.year, fireAt.month, fireAt.day, e ~/ 60, e % 60);
  if (!moved.isAfter(fireAt)) moved = moved.add(const Duration(days: 1));
  return moved.isBefore(departure) ? moved : fireAt;
}

List<PlannedReminder> planPassReminders(
  TravelPass pass,
  String tripName,
  DateTime now, {
  bool quietEnabled = false,
  String quietStart = '22:00',
  String quietEnd = '07:00',
}) {
  final startIso = pass.startDateTime;
  final start = startIso == null ? null : DateTime.tryParse(startIso);
  if (start == null) return const [];
  final offsets = pass.type == 'flight' || pass.type == 'train' ? [_day, _threeHours] : [_day];
  final title = pass.title.isEmpty ? 'Travel pass' : pass.title;
  final out = <PlannedReminder>[];
  for (var i = 0; i < offsets.length; i++) {
    var fireAt = start.subtract(offsets[i]);
    fireAt = applyQuietHours(fireAt, start, enabled: quietEnabled, start: quietStart, end: quietEnd);
    if (!fireAt.isAfter(now.add(const Duration(seconds: 30)))) continue; // past or imminent
    out.add(
      PlannedReminder(
        id: reminderId('${pass.id}-$i'),
        fireAt: fireAt,
        title: 'Pass reminder',
        body: '$tripName: $title departs ${_label(offsets[i])}',
        tripId: pass.tripId,
        passId: pass.id,
      ),
    );
  }
  return out;
}
