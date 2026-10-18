import 'dart:math' as math;
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/accent_color.dart';

Uint8List solid(int r, int g, int b, {int n = 64, int a = 255}) => Uint8List.fromList([
  for (var i = 0; i < n; i++) ...[r, g, b, a],
]);

double luminance(int argb) {
  double c(int v) {
    final s = v / 255;
    return s <= 0.03928 ? s / 12.92 : math.pow((s + 0.055) / 1.055, 2.4).toDouble();
  }

  return 0.2126 * c((argb >> 16) & 0xFF) + 0.7152 * c((argb >> 8) & 0xFF) + 0.0722 * c(argb & 0xFF);
}

void main() {
  test('a blue photo gives a dark blue accent that white text can sit on', () {
    final a = accentFromRgba(solid(40, 120, 220))!;
    expect(a >> 24, 0xFF);
    final r = (a >> 16) & 0xFF, b = a & 0xFF;
    expect(b, greaterThan(r)); // still blue
    expect(luminance(a), lessThan(0.18)); // white text on it has a contrast of at least about 4.5:1
  });

  test('a red photo stays red, a green one stays green', () {
    final red = accentFromRgba(solid(220, 40, 40))!;
    expect((red >> 16) & 0xFF, greaterThan(red & 0xFF));
    final green = accentFromRgba(solid(40, 200, 80))!;
    expect((green >> 8) & 0xFF, greaterThan((green >> 16) & 0xFF));
  });

  test('white, black, grey and transparent photos have no accent', () {
    expect(accentFromRgba(solid(255, 255, 255)), isNull);
    expect(accentFromRgba(solid(0, 0, 0)), isNull);
    expect(accentFromRgba(solid(128, 128, 128)), isNull);
    expect(accentFromRgba(solid(200, 40, 40, a: 0)), isNull);
    expect(accentFromRgba(Uint8List(0)), isNull);
  });

  test('a mostly white sky does not hide the colour of the rest', () {
    final px = <int>[
      for (var i = 0; i < 48; i++) ...[255, 255, 255, 255],
      for (var i = 0; i < 16; i++) ...[200, 60, 30, 255],
    ];
    final a = accentFromRgba(Uint8List.fromList(px))!;
    expect((a >> 16) & 0xFF, greaterThan(a & 0xFF)); // warm, not grey
  });
}
