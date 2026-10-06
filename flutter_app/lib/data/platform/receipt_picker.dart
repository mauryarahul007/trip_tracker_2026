import 'dart:io';

import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

enum ReceiptSource { camera, gallery }

/// Picks a receipt photo and shrinks it (the receipts bucket caps files at 5 MB).
/// Returns a temp file path, or null if the user cancelled. Faked in tests.
abstract class ReceiptPicker {
  Future<String?> pick(ReceiptSource source);
}

class PlatformReceiptPicker implements ReceiptPicker {
  final _picker = ImagePicker();

  @override
  Future<String?> pick(ReceiptSource source) async {
    final x = await _picker.pickImage(
      source: source == ReceiptSource.camera ? ImageSource.camera : ImageSource.gallery,
      maxWidth: 2000,
      maxHeight: 2000,
      imageQuality: 85,
    );
    if (x == null) return null;
    final tmp = await getTemporaryDirectory();
    final out = p.join(tmp.path, 'receipt_${DateTime.now().microsecondsSinceEpoch}.jpg');
    // JPEG at ~1600 px keeps receipts legible at a fraction of the size (also converts HEIC).
    final compressed = await FlutterImageCompress.compressAndGetFile(x.path, out, minWidth: 1600, minHeight: 1600, quality: 80);
    return compressed?.path ?? (File(x.path).existsSync() ? x.path : null);
  }
}

final receiptPickerProvider = Provider<ReceiptPicker>((ref) => PlatformReceiptPicker());
