import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:http/http.dart' as http;
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

/// Keeps downloaded photos on disk (the OS-managed cache folder) so covers, receipts and avatars appear at once
/// after a restart and while offline. A miss downloads once; concurrent requests for one URL share the download.
class PhotoCache {
  PhotoCache({Future<Directory?> Function()? directory, this.client}) : _directory = directory ?? _defaultDirectory;

  /// Replaced in tests.
  static PhotoCache instance = PhotoCache();

  final Future<Directory?> Function() _directory;
  final http.Client? client;
  final _inFlight = <String, Future<Uint8List>>{};

  static Future<Directory?> _defaultDirectory() async {
    try {
      return Directory(p.join((await getTemporaryDirectory()).path, 'photo_cache'));
    } catch (_) {
      return null; // no plugin (tests, unsupported platform): fall back to plain downloads
    }
  }

  Future<File?> _file(String url) async {
    final dir = await _directory();
    if (dir == null) return null;
    // Keyed without the query string: a signed receipt URL carries a new token each time but names the same file.
    final stable = Uri.tryParse(url)?.replace(query: '', fragment: '').toString() ?? url;
    return File(p.join(dir.path, sha1.convert(stable.codeUnits).toString()));
  }

  Future<Uint8List> bytes(String url) => _inFlight[url] ??= _load(url).whenComplete(() {
    _inFlight.remove(url); // a block body: returning the removed future would make it wait on itself
  });

  Future<Uint8List> _load(String url) async {
    final file = await _file(url);
    try {
      if (file != null && await file.exists()) {
        final cached = await file.readAsBytes();
        if (cached.isNotEmpty) return cached;
      }
    } catch (_) {
      // An unreadable cache entry is just a miss.
    }
    final client = this.client ?? http.Client();
    try {
      final r = await client.get(Uri.parse(url));
      if (r.statusCode != 200 || r.bodyBytes.isEmpty) throw HttpException('HTTP ${r.statusCode}', uri: Uri.parse(url));
      if (file != null) {
        try {
          await file.parent.create(recursive: true);
          await file.writeAsBytes(r.bodyBytes, flush: true);
        } catch (_) {
          // The photo still shows; it just was not kept.
        }
      }
      return r.bodyBytes;
    } finally {
      if (this.client == null) client.close();
    }
  }
}

/// A cached photo shown about [logicalWidth] px wide: decoded no larger than that (times the screen density)
/// instead of at the file's full size. Keeps aspect ratio. Use for thumbnails, avatars and cover bands, not for
/// full-screen viewers.
ImageProvider cachedPhotoSized(BuildContext context, String url, {required double logicalWidth}) =>
    ResizeImage(CachedPhotoProvider(url), width: (logicalWidth * MediaQuery.devicePixelRatioOf(context)).round());

/// An [ImageProvider] for a photo URL that goes through [PhotoCache]. Use it where `Image.network` was used.
@immutable
class CachedPhotoProvider extends ImageProvider<CachedPhotoProvider> {
  const CachedPhotoProvider(this.url);
  final String url;

  @override
  Future<CachedPhotoProvider> obtainKey(ImageConfiguration configuration) => SynchronousFuture(this);

  @override
  ImageStreamCompleter loadImage(CachedPhotoProvider key, ImageDecoderCallback decode) {
    return MultiFrameImageStreamCompleter(codec: _codec(decode), scale: 1.0, debugLabel: url);
  }

  Future<ui.Codec> _codec(ImageDecoderCallback decode) async {
    final bytes = await PhotoCache.instance.bytes(url);
    return decode(await ui.ImmutableBuffer.fromUint8List(bytes));
  }

  @override
  bool operator ==(Object other) => other is CachedPhotoProvider && other.url == url;

  @override
  int get hashCode => url.hashCode;
}
