import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

/// Clipboard + system share sheet behind a seam (faked in tests).
abstract class ShareService {
  Future<void> copy(String text);
  Future<void> share(String text, {String? subject});
}

class PlatformShareService implements ShareService {
  @override
  Future<void> copy(String text) => Clipboard.setData(ClipboardData(text: text));

  @override
  Future<void> share(String text, {String? subject}) async {
    await SharePlus.instance.share(ShareParams(text: text, subject: subject));
  }
}

final shareServiceProvider = Provider<ShareService>((ref) => PlatformShareService());
