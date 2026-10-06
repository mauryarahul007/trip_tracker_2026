import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/core/platform/speech_recognition_gateway.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/domain/models/trip.dart';
import 'package:trip_tracker/features/expenses/application/expenses_providers.dart';
import 'package:trip_tracker/features/expenses/presentation/quick_add_sheet.dart';
import 'package:trip_tracker/features/trip_details/application/trip_nav.dart';
import 'package:trip_tracker/l10n/app_localizations.dart';

void main() {
  group('Voice Quick Add & SpeechRecognitionGateway', () {
    const trip = Trip(
      id: 't-voice',
      ownerId: 'u-1',
      name: 'Goa Trip',
      startDate: '2026-11-01',
      endDate: '2026-11-05',
      baseCurrency: 'INR',
      joinCode: 'GOA2026',
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    );

    test('FakeSpeechRecognitionGateway tracks sessions and emits transcripts', () async {
      final fakeGateway = FakeSpeechRecognitionGateway(
        simulatedTranscript: 'Dinner 600',
      );

      expect(await fakeGateway.isSupported(), isTrue);
      expect(await fakeGateway.requestPermission(), isTrue);

      String? resultTranscript;
      bool isEnded = false;

      final session = fakeGateway.startListening(
        onResult: (transcript, isFinal) => resultTranscript = transcript,
        onError: (_) {},
        onEnd: () => isEnded = true,
      );

      await Future<void>.delayed(Duration.zero);

      expect(fakeGateway.startListeningCallCount, equals(1));
      expect(resultTranscript, equals('Dinner 600'));
      expect(isEnded, isTrue);

      session.stop();
      expect(fakeGateway.stopCallCount, equals(1));
    });

    testWidgets('QuickAddSheet mic button populates speech transcript into input', (tester) async {
      final fakeGateway = FakeSpeechRecognitionGateway(
        simulatedTranscript: 'Burger 350',
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            speechRecognitionGatewayProvider.overrideWithValue(fakeGateway),
            tripProvider('t-voice').overrideWith((ref) => Stream.value(trip)),
            tripExpensesProvider('t-voice').overrideWith((ref) => Stream.value(const [])),
            tripMembersProvider('t-voice').overrideWith((ref) => Stream.value(const [])),
            tripCategoriesProvider('t-voice').overrideWithValue(const []),
            flagProvider(('enableVoiceInput', 't-voice')).overrideWith((ref) => Stream.value(true)),
          ],
          child: const MaterialApp(
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: Scaffold(
              body: QuickAddSheet(tripId: 't-voice'),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      final micBtn = find.byKey(const Key('quick-add-mic'));
      expect(micBtn, findsOneWidget);

      await tester.tap(micBtn);
      await tester.pumpAndSettle();

      expect(fakeGateway.startListeningCallCount, equals(1));

      // Text input now contains Burger 350
      final textInput = find.byKey(const Key('quick-add-text'));
      expect(find.descendant(of: textInput, matching: find.text('Burger 350')), findsOneWidget);

      // Parsed preview shows Burger · 350.0
      final previewFinder = find.byKey(const Key('quick-add-preview'));
      expect(previewFinder, findsOneWidget);
      final previewText = tester.widget<Text>(previewFinder);
      expect(previewText.data, contains('Burger'));
      expect(previewText.data, contains('350'));

      await tester.pump(const Duration(milliseconds: 200));
    });
  });
}
