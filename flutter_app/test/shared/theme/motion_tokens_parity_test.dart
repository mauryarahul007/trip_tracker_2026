import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/core/platform/motion.dart';

/// The web CSS and the Flutter app share one motion scale; this fails if either side drifts.
void main() {
  final css = File('../src/index.css').readAsStringSync();
  int ms(String name) {
    final m = RegExp('--$name:\\s*(\\d+)ms').firstMatch(css);
    if (m == null) fail('--$name missing from src/index.css');
    return int.parse(m.group(1)!);
  }

  test('AppMotion durations equal the web --dur scale', () {
    expect(AppMotion.fast.inMilliseconds, ms('dur-2'));
    expect(AppMotion.base.inMilliseconds, ms('dur-3'));
    expect(AppMotion.slow.inMilliseconds, ms('dur-4'));
  });
}
