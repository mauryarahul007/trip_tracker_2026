import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;

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

/// Plain-words reason for a speech engine error code, with what to do next.
String speechErrorText(String code) {
  final c = code.toLowerCase();
  if (c.contains('no_match') || c.contains('speech_timeout')) return "Didn't catch that. Tap the mic and try again.";
  if (c.contains('permission')) return 'Microphone permission is off. Allow it in the phone settings for this app.';
  if (c.contains('network')) return 'Speech needs an internet connection on this phone. Check it and try again.';
  if (c.contains('language')) return 'This phone has no speech model for that language. Install it in Google settings.';
  if (c.contains('busy')) return 'The speech service is busy. Wait a moment and try again.';
  if (c.contains('audio')) return 'Could not use the microphone. Close other apps using it and try again.';
  return 'Voice input failed ($code). Tap the mic to try again, or type the expense.';
}

/// Real microphone gateway over the device speech service (Android Google speech, iOS SFSpeech).
class DefaultSpeechRecognitionGateway implements SpeechRecognitionGateway {
  final _stt = stt.SpeechToText();
  var _ready = false;
  String? _locale;
  void Function(String)? _onError;
  void Function()? _onEnd;

  /// Initialising asks for the microphone / speech permission, so support and permission share one call.
  /// The intent lookup picks the Google recognizer even when the phone's default service is a text-to-speech stub.
  Future<bool> _init() async {
    if (_ready) return true;
    try {
      _ready = await _stt.initialize(
        options: [stt.SpeechToText.androidIntentLookup],
        onError: (e) => _onError?.call(e.errorMsg),
        onStatus: (st) {
          if (st == 'done' || st == 'notListening') _onEnd?.call();
        },
      );
      if (_ready) _locale = await _pickLocale();
    } on Object {
      _ready = false;
    }
    return _ready;
  }

  /// English (India) when the engine has it, else any English, else the phone's own language.
  Future<String?> _pickLocale() async {
    final all = await _stt.locales();
    String? find(bool Function(String id) test) {
      for (final l in all) {
        if (test(l.localeId.replaceAll('-', '_').toLowerCase())) return l.localeId;
      }
      return null;
    }

    return find((id) => id == 'en_in') ?? find((id) => id.startsWith('en_')) ?? (await _stt.systemLocale())?.localeId;
  }

  @override
  Future<bool> isSupported() => _init();

  @override
  Future<bool> requestPermission() => _init();

  @override
  SpeechRecognitionSession startListening({
    required void Function(String transcript, bool isFinal) onResult,
    required void Function(String error) onError,
    required void Function() onEnd,
    String? locale,
  }) {
    _onError = onError;
    _onEnd = onEnd;
    unawaited(
      _stt.listen(
        onResult: (r) => onResult(r.recognizedWords, r.finalResult),
        listenOptions: stt.SpeechListenOptions(
          partialResults: true,
          cancelOnError: true,
          localeId: locale ?? _locale,
          listenFor: const Duration(seconds: 30),
          pauseFor: const Duration(seconds: 3),
        ),
      ),
    );
    return _SimpleSession(onStop: () => unawaited(_stt.stop()), onCancel: () => unawaited(_stt.cancel()));
  }
}

final speechRecognitionGatewayProvider = Provider<SpeechRecognitionGateway>((ref) {
  return DefaultSpeechRecognitionGateway();
});
