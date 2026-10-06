import 'dart:convert';

import '../../core/platform/share_service.dart';
import '../models/travel_pass.dart';
import '../models/trip.dart';

const int defaultEventDurationMs = 60 * 60 * 1000; // 1 hour default duration

/// Formats a [DateTime] into UTC iCalendar timestamp: yyyyMMddTHHmmssZ
String toIcsDateUtc(DateTime date) {
  final utc = date.toUtc();
  final y = utc.year.toString().padLeft(4, '0');
  final m = utc.month.toString().padLeft(2, '0');
  final d = utc.day.toString().padLeft(2, '0');
  final h = utc.hour.toString().padLeft(2, '0');
  final min = utc.minute.toString().padLeft(2, '0');
  final s = utc.second.toString().padLeft(2, '0');
  return '$y$m${d}T$h$min${s}Z';
}

/// Escapes special characters for RFC 5545 iCalendar values.
String escapeIcsText(String text) {
  return text
      .replaceAll(r'\', r'\\')
      .replaceAll(';', r'\;')
      .replaceAll(',', r'\,')
      .replaceAll('\n', r'\n');
}

/// Builds an individual VEVENT for a [TravelPass].
/// Returns null if [pass.startDateTime] is missing or unparseable.
String? buildEventForPass(TravelPass pass, {DateTime? now}) {
  final startStr = pass.startDateTime;
  if (startStr == null || startStr.trim().isEmpty) return null;

  final start = DateTime.tryParse(startStr);
  if (start == null) return null;

  DateTime end;
  if (pass.endDateTime != null && pass.endDateTime!.trim().isNotEmpty) {
    final parsedEnd = DateTime.tryParse(pass.endDateTime!);
    end = parsedEnd ?? start.add(const Duration(milliseconds: defaultEventDurationMs));
  } else {
    end = start.add(const Duration(milliseconds: defaultEventDurationMs));
  }

  final stamp = now ?? DateTime.now();

  final locationParts = [
    if (pass.origin != null && pass.origin!.trim().isNotEmpty) pass.origin!.trim(),
    if (pass.destination != null && pass.destination!.trim().isNotEmpty) pass.destination!.trim(),
  ];

  final location = locationParts.isNotEmpty
      ? locationParts.join(' → ')
      : (pass.address != null && pass.address!.trim().isNotEmpty ? pass.address!.trim() : '');

  final descriptionParts = [
    if (pass.provider != null && pass.provider!.trim().isNotEmpty) 'Provider: ${pass.provider!.trim()}',
    if (pass.referenceCode != null && pass.referenceCode!.trim().isNotEmpty) 'Reference: ${pass.referenceCode!.trim()}',
    if (pass.seatOrRoom != null && pass.seatOrRoom!.trim().isNotEmpty) 'Seat/Room: ${pass.seatOrRoom!.trim()}',
  ];

  final lines = [
    'BEGIN:VEVENT',
    'UID:${pass.id}@trip-tracker',
    'DTSTAMP:${toIcsDateUtc(stamp)}',
    'DTSTART:${toIcsDateUtc(start)}',
    'DTEND:${toIcsDateUtc(end)}',
    'SUMMARY:${escapeIcsText(pass.title)}',
    if (location.isNotEmpty) 'LOCATION:${escapeIcsText(location)}',
    if (descriptionParts.isNotEmpty) 'DESCRIPTION:${escapeIcsText(descriptionParts.join(' | '))}',
    'END:VEVENT',
  ];

  return lines.join('\r\n');
}

/// Builds an RFC 5545 .ics calendar string from a trip and its travel passes.
String generateTripIcs(Trip trip, {List<TravelPass>? passes, DateTime? now}) {
  final actualPasses = passes ?? trip.passes;
  final events = <String>[];

  for (final pass in actualPasses) {
    final event = buildEventForPass(pass, now: now);
    if (event != null && event.isNotEmpty) {
      events.add(event);
    }
  }

  final lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Trip Tracker//Trip Passes//EN',
    'CALSCALE:GREGORIAN',
    ...events,
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

/// Shares the generated trip itinerary as an `.ics` calendar file via [ShareService].
Future<void> shareTripIcs({
  required Trip trip,
  required ShareService shareService,
  List<TravelPass>? passes,
  DateTime? now,
}) async {
  final ics = generateTripIcs(trip, passes: passes, now: now);
  final cleanName = trip.name.replaceAll(RegExp(r'[^a-zA-Z0-9]+'), '-').replaceAll(RegExp(r'^-|-$'), '');
  final fileName = '${cleanName.isNotEmpty ? cleanName : 'trip'}-itinerary.ics';

  final bytes = utf8.encode(ics);
  await shareService.shareFile(
    bytes,
    fileName: fileName,
    mimeType: 'text/calendar',
    subject: '${trip.name} Itinerary',
    text: 'Calendar itinerary for ${trip.name}',
  );
}
