import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/travel_status_service.dart';
import 'package:trip_tracker/domain/models/travel_pass.dart';

void main() {
  group('parseFlightDate', () {
    test('parses ISO date YYYY-MM-DD', () {
      final res = parseFlightDate('2026-09-15');
      expect(res, isNotNull);
      expect(res!.year, 2026);
      expect(res.month, 9);
      expect(res.day, 15);
      expect(res.formattedDateString, '15 Sep 2026');
      expect(res.timeString, isNull);
    });

    test('parses ISO datetime with hours and minutes', () {
      final res = parseFlightDate('2026-10-06T14:30:00');
      expect(res, isNotNull);
      expect(res!.year, 2026);
      expect(res.month, 10);
      expect(res.day, 6);
      expect(res.formattedDateString, '6 Oct 2026');
      expect(res.timeString, '2:30 PM');
    });

    test('parses natural text dates', () {
      final res = parseFlightDate('15 Sep 2026 at 08:30 AM');
      expect(res, isNotNull);
      expect(res!.day, 15);
      expect(res.month, 9);
      expect(res.year, 2026);
      expect(res.formattedDateString, '15 Sep 2026');
      expect(res.timeString, '08:30 AM');
    });

    test('returns null on empty or null strings', () {
      expect(parseFlightDate(null), isNull);
      expect(parseFlightDate(''), isNull);
      expect(parseFlightDate('   '), isNull);
    });
  });

  group('parseFlightCode', () {
    test('parses standard leg identifier', () {
      final res = parseFlightCode('6E537_BLR_HYD');
      expect(res, isNotNull);
      expect(res!.carrierCode, '6E');
      expect(res.flightNumber, '537');
      expect(res.airlineName, 'IndiGo');
    });

    test('parses hyphenated flight code', () {
      final res = parseFlightCode('AI-101');
      expect(res, isNotNull);
      expect(res!.carrierCode, 'AI');
      expect(res.flightNumber, '101');
      expect(res.airlineName, 'Air India');
    });

    test('parses space-separated flight code', () {
      final res = parseFlightCode('UK 814');
      expect(res, isNotNull);
      expect(res!.carrierCode, 'UK');
      expect(res.flightNumber, '814');
      expect(res.airlineName, 'Vistara');
    });

    test('parses ICAO 3-letter codes to IATA', () {
      final res = parseFlightCode('IGO537');
      expect(res, isNotNull);
      expect(res!.carrierCode, '6E');
      expect(res.flightNumber, '537');
      expect(res.airlineName, 'IndiGo');
    });

    test('parses provider hint when text has only numbers', () {
      final res = parseFlightCode('Flight 202', 'Air India');
      expect(res, isNotNull);
      expect(res!.carrierCode, 'AI');
      expect(res.flightNumber, '202');
    });
  });

  group('buildFlightUrls', () {
    test('builds correct tracking URLs with date', () {
      final urls = buildFlightUrls('6E', '537', '2026-09-15');
      expect(urls.fullFlightCode, '6E-537');
      expect(urls.icaoCode, 'IGO');
      expect(urls.flightradar24Url, 'https://www.flightradar24.com/data/flights/6e537');
      expect(urls.flightAwareUrl, 'https://www.flightaware.com/live/flight/IGO537');
      expect(urls.googleStatusUrl, contains('6E-537%20flight%20status%2015%20Sep%202026'));
      expect(urls.flightStatsUrl, contains('https://www.flightstats.com/v2/flight-tracker/6E/537'));
    });
  });

  group('extractFlightStatus and extractTrainStatus', () {
    test('extracts flight status from TravelPass', () {
      const pass = TravelPass(
        id: 'p1',
        tripId: 't1',
        type: 'flight',
        title: 'BLR to DEL Flight',
        legIdentifier: '6E-205_BLR_DEL',
        startDateTime: '2026-10-10T10:00:00',
        origin: 'BLR',
        destination: 'DEL',
        createdAt: 0,
        updatedAt: 0,
      );

      final status = getTravelStatusInfo(pass);
      expect(status, isA<FlightStatusInfo>());
      final flight = status as FlightStatusInfo;
      expect(flight.carrierCode, '6E');
      expect(flight.flightNumber, '205');
      expect(flight.airlineName, 'IndiGo');
      expect(flight.origin, 'BLR');
      expect(flight.destination, 'DEL');
    });

    test('extracts train status with 10-digit PNR and 5-digit train number', () {
      const pass = TravelPass(
        id: 'p2',
        tripId: 't1',
        type: 'train',
        title: 'Vande Bharat Express',
        referenceCode: 'PNR 234-567-8901',
        notes: 'Train 20608 Chennai to Mysore',
        origin: 'MAS',
        destination: 'MYS',
        createdAt: 0,
        updatedAt: 0,
      );

      final status = getTravelStatusInfo(pass);
      expect(status, isA<TrainStatusInfo>());
      final train = status as TrainStatusInfo;
      expect(train.pnr, '2345678901');
      expect(train.trainNumber, '20608');
      expect(train.confirmTktUrl, 'https://www.confirmtkt.com/pnr-status/2345678901');
      expect(train.railYatriUrl, 'https://www.railyatri.in/pnr-status/2345678901');
      expect(train.googleLiveTrainUrl, contains('20608%20live%20train%20status'));
    });

    test('returns null for non-transit passes without flight or train details', () {
      const stayPass = TravelPass(
        id: 'p3',
        tripId: 't1',
        type: 'stay',
        title: 'Grand Hotel',
        createdAt: 0,
        updatedAt: 0,
      );
      expect(getTravelStatusInfo(stayPass), isNull);
    });
  });
}
