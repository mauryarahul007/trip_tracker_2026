import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:trip_tracker/shared/widgets/cached_photo.dart';

void main() {
  late Directory dir;
  setUp(() => dir = Directory.systemTemp.createTempSync('photo_cache_test'));
  tearDown(() => dir.deleteSync(recursive: true));

  test('a photo is downloaded once, then served from disk (also with no network)', () async {
    var calls = 0;
    final client = MockClient((r) async {
      calls++;
      return http.Response.bytes([1, 2, 3, 4], 200);
    });
    final cache = PhotoCache(directory: () async => dir, client: client);
    expect(await cache.bytes('https://img.test/a.jpg'), [1, 2, 3, 4]);
    expect(calls, 1);

    // A new cache object (an app restart) with a client that always fails still has the photo.
    final offline = PhotoCache(
      directory: () async => dir,
      client: MockClient((r) async => throw const SocketException('offline')),
    );
    expect(await offline.bytes('https://img.test/a.jpg'), [1, 2, 3, 4]);
  });

  test('concurrent requests for one URL share a single download', () async {
    var calls = 0;
    final client = MockClient((r) async {
      calls++;
      await Future<void>.delayed(const Duration(milliseconds: 20));
      return http.Response.bytes([9], 200);
    });
    final cache = PhotoCache(directory: () async => dir, client: client);
    await Future.wait([cache.bytes('https://img.test/b.jpg'), cache.bytes('https://img.test/b.jpg')]);
    expect(calls, 1);
  });

  test('errors are not cached; a failed download throws and a later one works', () async {
    var ok = false;
    final client = MockClient((r) async => ok ? http.Response.bytes([7], 200) : http.Response('nope', 404));
    final cache = PhotoCache(directory: () async => dir, client: client);
    await expectLater(cache.bytes('https://img.test/c.jpg'), throwsA(isA<HttpException>()));
    ok = true;
    expect(await cache.bytes('https://img.test/c.jpg'), [7]);
  });

  test('without a cache folder (no plugin) photos still download', () async {
    final cache = PhotoCache(
      directory: () async => null,
      client: MockClient((r) async => http.Response.bytes([5], 200)),
    );
    expect(await cache.bytes('https://img.test/d.jpg'), [5]);
  });

  test('a signed URL with a new token still hits the cached file', () async {
    var calls = 0;
    final client = MockClient((r) async {
      calls++;
      return http.Response.bytes([4, 2], 200);
    });
    final cache = PhotoCache(directory: () async => dir, client: client);
    await cache.bytes('https://x.test/storage/v1/object/sign/receipts/a.jpg?token=one');
    expect(await cache.bytes('https://x.test/storage/v1/object/sign/receipts/a.jpg?token=two'), [4, 2]);
    expect(calls, 1);
  });
}
