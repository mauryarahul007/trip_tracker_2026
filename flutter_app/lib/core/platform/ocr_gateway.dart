import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

/// Abstract contract for OCR text recognition, allowing platform-native
/// on-device MLKit / Tesseract integration while ensuring headless testability.
abstract class OcrGateway {
  Future<String> recognizeTextFromImage(String imagePath);
  Future<bool> isOcrSupported();
}

/// Headless deterministic mock for widget and unit tests.
class FakeOcrGateway implements OcrGateway {
  FakeOcrGateway({this.cannedText = '', this.supported = true});

  String cannedText;
  bool supported;
  int recognizeCallCount = 0;

  @override
  Future<String> recognizeTextFromImage(String imagePath) async {
    recognizeCallCount++;
    if (!supported) {
      throw Exception('OCR engine not supported on this device');
    }
    return cannedText;
  }

  @override
  Future<bool> isOcrSupported() async => supported;
}

/// On-device text recognition (Google ML Kit, Latin script) on Android and iOS. The photo never leaves the phone.
/// Other platforms (web, desktop) report "not supported" and the modal falls back to pasted text.
class DefaultOcrGateway implements OcrGateway {
  const DefaultOcrGateway();

  static bool get _native =>
      !kIsWeb && (defaultTargetPlatform == TargetPlatform.android || defaultTargetPlatform == TargetPlatform.iOS);

  @override
  Future<String> recognizeTextFromImage(String imagePath) async {
    if (!_native) return '';
    final recognizer = TextRecognizer();
    try {
      final result = await recognizer.processImage(InputImage.fromFilePath(imagePath));
      return result.text;
    } finally {
      await recognizer.close();
    }
  }

  @override
  Future<bool> isOcrSupported() async => _native;
}

/// Riverpod provider for [OcrGateway].
final ocrGatewayProvider = Provider<OcrGateway>((ref) {
  return const DefaultOcrGateway();
});
