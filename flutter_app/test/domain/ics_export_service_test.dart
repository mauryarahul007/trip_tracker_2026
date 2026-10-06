import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/core/platform/share_service.dart';
import 'package:trip_tracker/domain/logic/ics_export_service.dart';
import 'package:trip_tracker/domain/models/travel_pass.dart';
import 'package:trip_tracker/domain/models/trip.dart';

class _FakeShareService extends ShareService {
  String? sharedText;
  String? sharedSubject;
  List<int>? sharedFileBytes;
  String? sharedFileName;
  String? sharedMimeType;

  @override
  Future<void> copy(String text) async {}

  @override
  Future<void> share(String text, {String? subject}) async {
    sharedText = text;
    sharedSubject = subject;
  }

  @override
  Future<void> shareFile(
    List<int> bytes, {
    required String fileName,
    String? mimeType,
    String? subject,
    String? text,
  }) async {
    sharedFileBytes = bytes;
    sharedFileName = fileName;
    sharedMimeType = mimeType;
    sharedSubject = subject;
    sharedText = text;
  }
}

TravelPass _makePass({
  required String id,
  required String title,
  String type = 'flight',
  String? origin,
  String? destination,
  String? provider,
  String? referenceCode,
  String? seatOrRoom,
  String? startDateTime,
  String? endDateTime,
  String? address,
}) {
  return TravelPass(
    id: id,
    tripId: 't1',
    type: type,
    title: title,
    origin: origin,
    destination: destination,
    provider: provider,
    referenceCode: referenceCode,
    seatOrRoom: seatOrRoom,
    startDateTime: startDateTime,
    endDateTime: endDateTime,
    address: address,
    createdAt: 1000,
    updatedAt: 1000,
  );
}

Trip _makeTrip({List<TravelPass>? passes}) {
  return Trip(
    id: 't1',
    name: 'Goa Trip',
    startDate: '2026-01-01',
    endDate: '2026-01-05',
    baseCurrency: 'INR',
    memberIds: const ['u1'],
    groupIds: const [],
    ownerId: 'u1',
    joinCode: 'ABC123',
    createdAt: 0,
    updatedAt: 0,
    passes: passes ?? const [],
  );
}

void main() {
  group('ics_export_service', () {
    test('produces valid VCALENDAR wrapper with no events for a trip without passes', () {
      final trip = _makeTrip();
      final ics = generateTripIcs(trip);

      expect(ics, contains('BEGIN:VCALENDAR'));
      expect(ics, contains('VERSION:2.0'));
      expect(ics, contains('PRODID:-//Trip Tracker//Trip Passes//EN'));
      expect(ics, contains('CALSCALE:GREGORIAN'));
      expect(ics, contains('END:VCALENDAR'));
      expect(ics, isNot(contains('BEGIN:VEVENT')));
    });

    test('emits one VEVENT per pass with a startDateTime', () {
      final now = DateTime.utc(2026, 1, 1, 0, 0, 0);
      final trip = _makeTrip(
        passes: [
          _makePass(
            id: 'p1',
            type: 'flight',
            title: 'Flight to Goa',
            origin: 'DEL',
            destination: 'GOI',
            provider: 'IndiGo',
            referenceCode: '6E-204',
            seatOrRoom: '12F',
            startDateTime: '2026-01-01T08:00:00Z',
            endDateTime: '2026-01-01T10:30:00Z',
          ),
          _makePass(
            id: 'p2',
            type: 'stay',
            title: 'Hotel check-in',
          ),
        ],
      );

      final ics = generateTripIcs(trip, now: now);
      final eventCount = 'BEGIN:VEVENT'.allMatches(ics).length;
      expect(eventCount, 1);
      expect(ics, contains('UID:p1@trip-tracker'));
      expect(ics, contains('SUMMARY:Flight to Goa'));
      expect(ics, contains('LOCATION:DEL → GOI'));
      expect(ics, contains('DTSTART:20260101T080000Z'));
      expect(ics, contains('DTEND:20260101T103000Z'));
      expect(ics, contains('DESCRIPTION:Provider: IndiGo | Reference: 6E-204 | Seat/Room: 12F'));
      expect(ics, contains('END:VEVENT'));
    });

    test('skips passes without a startDateTime or with invalid date string', () {
      final trip = _makeTrip(
        passes: [
          _makePass(id: 'p1', type: 'activity', title: 'Tour'),
          _makePass(id: 'p2', type: 'bus', title: 'Bus', startDateTime: 'invalid-date'),
        ],
      );

      final ics = generateTripIcs(trip);
      expect(ics, isNot(contains('BEGIN:VEVENT')));
    });

    test('escapes special characters correctly in summary and notes', () {
      final pass = _makePass(
        id: 'p3',
        type: 'flight',
        title: 'Flight, Stop; Transfer\\Night\nArrive',
        startDateTime: '2026-01-02T12:00:00Z',
      );
      final event = buildEventForPass(pass, now: DateTime.utc(2026, 1, 1));
      expect(event, isNotNull);
      expect(event, contains(r'SUMMARY:Flight\, Stop\; Transfer\\Night\nArrive'));
    });

    test('shareTripIcs formats filename and hands off to shareService.shareFile', () async {
      final fakeShare = _FakeShareService();
      final trip = _makeTrip(
        passes: [
          _makePass(
            id: 'p1',
            type: 'flight',
            title: 'Flight',
            startDateTime: '2026-01-01T08:00:00Z',
          ),
        ],
      );

      await shareTripIcs(trip: trip, shareService: fakeShare);

      expect(fakeShare.sharedFileName, 'Goa-Trip-itinerary.ics');
      expect(fakeShare.sharedMimeType, 'text/calendar');
      expect(fakeShare.sharedSubject, 'Goa Trip Itinerary');
      expect(fakeShare.sharedFileBytes, isNotNull);

      final content = utf8.decode(fakeShare.sharedFileBytes!);
      expect(content, contains('BEGIN:VCALENDAR'));
      expect(content, contains('SUMMARY:Flight'));
    });
  });
}
