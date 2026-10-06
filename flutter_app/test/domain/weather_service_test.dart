import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/features/travel/places/weather_service.dart';

void main() {
  group('WeatherService Domain Logic', () {
    test('extractPlaceCandidates normalizes accents and removes trip filler words', () {
      final candidates1 = extractPlaceCandidates('Weekend in München -> Goa with Friends');
      expect(candidates1, contains('Goa'));
      expect(candidates1, contains('Munchen'));

      final candidates2 = extractPlaceCandidates('Roadtrip to North Goa 2026');
      expect(candidates2, contains('North Goa'));
      expect(candidates2, contains('Goa'));

      final candidates3 = extractPlaceCandidates(['Paris / London Holiday', 'Tokyo Vacation']);
      expect(candidates3, contains('Tokyo'));
      expect(candidates3, contains('London'));
      expect(candidates3, contains('Paris'));
    });

    test('cleanPlaceQuery returns the most specific destination candidate', () {
      final query = cleanPlaceQuery('Trip to Manali with family');
      expect(query, equals('Manali'));
    });

    test('getWeatherConditionFromCode maps codes correctly', () {
      final clearDay = getWeatherConditionFromCode(0, isDay: true);
      expect(clearDay.emoji, equals('☀️'));
      expect(clearDay.text, equals('Clear Sky'));

      final clearNight = getWeatherConditionFromCode(0, isDay: false);
      expect(clearNight.emoji, equals('🌙'));
      expect(clearNight.text, equals('Clear Sky'));

      final rain = getWeatherConditionFromCode(63, isDay: true);
      expect(rain.emoji, equals('🌧️'));
      expect(rain.text, equals('Rain'));

      final storm = getWeatherConditionFromCode(95, isDay: true);
      expect(storm.emoji, equals('⛈️'));
      expect(storm.text, equals('Thunderstorm'));

      final unknown = getWeatherConditionFromCode(999, isDay: true);
      expect(unknown.emoji, equals('☀️'));
      expect(unknown.text, equals('Fair'));
    });

    test('WeatherData serializes and deserializes to JSON correctly', () {
      const original = WeatherData(
        tempC: 24,
        tempF: 75,
        apparentTempC: 25,
        weatherCode: 1,
        weatherEmoji: '⛅',
        condition: 'Partly Cloudy',
        isDay: true,
        city: 'Goa',
        updatedAt: 1700000000000,
      );

      final json = original.toJson();
      final revived = WeatherData.fromJson(json);

      expect(revived.tempC, equals(24));
      expect(revived.tempF, equals(75));
      expect(revived.apparentTempC, equals(25));
      expect(revived.weatherCode, equals(1));
      expect(revived.weatherEmoji, equals('⛅'));
      expect(revived.condition, equals('Partly Cloudy'));
      expect(revived.isDay, isTrue);
      expect(revived.city, equals('Goa'));
      expect(revived.updatedAt, equals(1700000000000));
    });

    test('FakeWeatherService returns simulated data and tracks calls', () async {
      const sample = WeatherData(
        tempC: 18,
        tempF: 64,
        weatherCode: 3,
        weatherEmoji: '☁️',
        condition: 'Overcast',
        isDay: false,
        city: 'London',
        updatedAt: 1700000000000,
      );
      final fake = FakeWeatherService(simulatedData: sample);

      WeatherData? liveCallbackData;
      final result = await fake.getDestinationWeather(
        'London Tour',
        onLiveUpdate: (fresh) => liveCallbackData = fresh,
      );

      expect(result, isNotNull);
      expect(result!.tempC, equals(18));
      expect(result.city, equals('London'));
      expect(liveCallbackData?.condition, equals('Overcast'));
      expect(fake.fetchCount, equals(1));
    });
  });
}
