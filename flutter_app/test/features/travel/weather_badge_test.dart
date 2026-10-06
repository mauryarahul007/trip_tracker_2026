import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/features/travel/places/weather_service.dart';
import 'package:trip_tracker/features/travel/presentation/weather_badge.dart';

void main() {
  group('WeatherBadge Widget', () {
    testWidgets('renders weather telemetry when data is available', (tester) async {
      const sample = WeatherData(
        tempC: 28,
        tempF: 82,
        weatherCode: 0,
        weatherEmoji: '☀️',
        condition: 'Clear Sky',
        isDay: true,
        city: 'Goa',
        updatedAt: 1700000000000,
      );

      final fakeService = FakeWeatherService(simulatedData: sample);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [weatherServiceProvider.overrideWithValue(fakeService)],
          child: const MaterialApp(
            home: Scaffold(body: WeatherBadge(destination: 'Goa')),
          ),
        ),
      );

      await tester.pump();

      expect(find.byKey(const Key('weather_badge_card')), findsOneWidget);
      expect(find.text('☀️'), findsOneWidget);
      expect(find.text('28°C · Clear Sky'), findsOneWidget);
      expect(find.text('Goa'), findsOneWidget);
    });

    testWidgets('triggers refresh on refresh button tap', (tester) async {
      const sample = WeatherData(
        tempC: 15,
        tempF: 59,
        weatherCode: 61,
        weatherEmoji: '🌧️',
        condition: 'Rain',
        isDay: true,
        city: 'Manali',
        updatedAt: 1700000000000,
      );

      final fakeService = FakeWeatherService(simulatedData: sample);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [weatherServiceProvider.overrideWithValue(fakeService)],
          child: const MaterialApp(
            home: Scaffold(body: WeatherBadge(destination: 'Manali')),
          ),
        ),
      );

      await tester.pump();
      expect(fakeService.fetchCount, equals(1));

      final refreshBtn = find.byKey(const Key('btn_refresh_weather'));
      expect(refreshBtn, findsOneWidget);

      await tester.tap(refreshBtn);
      await tester.pump();

      expect(fakeService.fetchCount, equals(2));
    });

    testWidgets('renders compact layout when compact flag is set', (tester) async {
      const sample = WeatherData(
        tempC: 22,
        tempF: 72,
        weatherCode: 1,
        weatherEmoji: '⛅',
        condition: 'Partly Cloudy',
        isDay: true,
        city: 'Shimla',
        updatedAt: 1700000000000,
      );

      final fakeService = FakeWeatherService(simulatedData: sample);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [weatherServiceProvider.overrideWithValue(fakeService)],
          child: const MaterialApp(
            home: Scaffold(body: WeatherBadge(destination: 'Shimla', compact: true)),
          ),
        ),
      );

      await tester.pump();

      expect(find.text('⛅'), findsOneWidget);
      expect(find.text('22°C'), findsOneWidget);
      // In compact mode, the full card and city label are not rendered
      expect(find.byKey(const Key('weather_badge_card')), findsNothing);
    });
  });
}
