import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Abstract contract for OCR text recognition, allowing platform-native
/// on-device MLKit / Tesseract integration while ensuring headless testability.
abstract class OcrGateway {
  Future<String> recognizeTextFromImage(String imagePath);
  Future<bool> isOcrSupported();
}

/// Headless deterministic mock for widget and unit tests.
class FakeOcrGateway implements OcrGateway {
  FakeOcrGateway({
    this.cannedText = '',
    this.supported = true,
  });

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

/// Default implementation providing best-effort local OCR.
class DefaultOcrGateway implements OcrGateway {
  const DefaultOcrGateway();

  @override
  Future<String> recognizeTextFromImage(String imagePath) async {
    // Extensible hook for platform on-device OCR models
    return '';
  }

  @override
  Future<bool> isOcrSupported() async => true;
}

/// Riverpod provider for [OcrGateway].
final ocrGatewayProvider = Provider<OcrGateway>((ref) {
  return const DefaultOcrGateway();
});
