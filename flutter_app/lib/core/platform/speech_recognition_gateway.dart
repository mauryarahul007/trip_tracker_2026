import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Contract representing a running speech recognition session.
abstract class SpeechRecognitionSession {
  void stop();
  void cancel();
}

/// Platform gateway interface for microphone speech recognition.
/// Parity with web `src/utils/speechRecognition.ts`.
abstract class SpeechRecognitionGateway {
  Future<bool> isSupported();
  Future<bool> requestPermission();
  SpeechRecognitionSession startListening({
    required void Function(String transcript, bool isFinal) onResult,
    required void Function(String error) onError,
    required void Function() onEnd,
    String? locale,
  });
}

class _SimpleSession implements SpeechRecognitionSession {
  final void Function() onStop;
  final void Function() onCancel;

  _SimpleSession({required this.onStop, required this.onCancel});

  @override
  void stop() => onStop();

  @override
  void cancel() => onCancel();
}

/// Deterministic in-memory fake gateway for test suites and simulator environments.
class FakeSpeechRecognitionGateway implements SpeechRecognitionGateway {
  bool isSupportedResult = true;
  bool permissionResult = true;
  String? simulatedTranscript;
  String? simulatedError;
  int startListeningCallCount = 0;
  int stopCallCount = 0;
  int cancelCallCount = 0;

  FakeSpeechRecognitionGateway({
    this.isSupportedResult = true,
    this.permissionResult = true,
    this.simulatedTranscript,
    this.simulatedError,
  });

  @override
  Future<bool> isSupported() async => isSupportedResult;

  @override
  Future<bool> requestPermission() async => permissionResult;

  @override
  SpeechRecognitionSession startListening({
    required void Function(String transcript, bool isFinal) onResult,
    required void Function(String error) onError,
    required void Function() onEnd,
    String? locale,
  }) {
    startListeningCallCount++;

    if (simulatedError != null) {
      Timer.run(() {
        onError(simulatedError!);
        onEnd();
      });
    } else if (simulatedTranscript != null) {
      Timer.run(() {
        onResult(simulatedTranscript!, true);
        onEnd();
      });
    }

    return _SimpleSession(
      onStop: () {
        stopCallCount++;
        onEnd();
      },
      onCancel: () {
        cancelCallCount++;
      },
    );
  }
}

/// Default platform speech recognition gateway.
class DefaultSpeechRecognitionGateway implements SpeechRecognitionGateway {
  @override
  Future<bool> isSupported() async => false;

  @override
  Future<bool> requestPermission() async => false;

  @override
  SpeechRecognitionSession startListening({
    required void Function(String transcript, bool isFinal) onResult,
    required void Function(String error) onError,
    required void Function() onEnd,
    String? locale,
  }) {
    Timer.run(() {
      onError('Speech recognition not available on this platform.');
      onEnd();
    });
    return _SimpleSession(onStop: () {}, onCancel: () {});
  }
}

final speechRecognitionGatewayProvider = Provider<SpeechRecognitionGateway>((ref) {
  return DefaultSpeechRecognitionGateway();
});
