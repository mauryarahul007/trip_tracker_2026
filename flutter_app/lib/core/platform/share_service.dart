import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

/// Clipboard + system share sheet behind a seam (faked in tests).
abstract class ShareService {
  Future<void> copy(String text);
  Future<void> share(String text, {String? subject});

  /// PNG share. The default sends the caption as text so fakes record it.
  Future<void> sharePng(List<int> bytes, {required String fileName, String? text}) =>
      share(text ?? fileName, subject: fileName);
}

class PlatformShareService implements ShareService {
  @override
  Future<void> copy(String text) => Clipboard.setData(ClipboardData(text: text));

  @override
  Future<void> share(String text, {String? subject}) async {
    await SharePlus.instance.share(ShareParams(text: text, subject: subject));
  }

  @override
  Future<void> sharePng(List<int> bytes, {required String fileName, String? text}) async {
    final dir = await getTemporaryDirectory();
    final file = File(p.join(dir.path, fileName));
    await file.writeAsBytes(bytes, flush: true);
    await SharePlus.instance.share(ShareParams(files: [XFile(file.path)], text: text));
  }
}

final shareServiceProvider = Provider<ShareService>((ref) => PlatformShareService());
