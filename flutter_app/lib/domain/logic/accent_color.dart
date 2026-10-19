import 'dart:math' as math;
import 'dart:typed_data';

/// A readable accent for a photo, from its pixels ([rgba], four bytes per pixel, e.g. a 24 x 24 thumbnail).
///
/// Pixels are averaged with a weight that favours saturated, mid-light ones (so a white sky or a black frame does
/// not decide the colour), then pulled into a dark, fairly saturated range so white text stays readable on it.
/// Returns an ARGB int, or null when the photo has no usable colour (grey, empty).
int? accentFromRgba(Uint8List rgba) {
  var r = 0.0, g = 0.0, b = 0.0, total = 0.0;
  for (var i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue; // transparent
    final pr = rgba[i] / 255, pg = rgba[i + 1] / 255, pb = rgba[i + 2] / 255;
    final mx = math.max(pr, math.max(pg, pb)), mn = math.min(pr, math.min(pg, pb));
    final light = (mx + mn) / 2;
    final sat = mx == mn ? 0.0 : (mx - mn) / (1 - (2 * light - 1).abs());
    // Weight: colourful and not near-white or near-black.
    final w = sat * (1 - (2 * light - 1).abs());
    if (w <= 0.01) continue;
    r += pr * w;
    g += pg * w;
    b += pb * w;
    total += w;
  }
  if (total < 0.5) return null;
  final ar = r / total, ag = g / total, ab = b / total;

  // To HSL, clamp lightness and saturation, back to RGB.
  final mx = math.max(ar, math.max(ag, ab)), mn = math.min(ar, math.min(ag, ab));
  final d = mx - mn;
  if (d < 0.02) return null;
  var h = 0.0;
  if (mx == ar) {
    h = ((ag - ab) / d) % 6;
  } else if (mx == ag) {
    h = (ab - ar) / d + 2;
  } else {
    h = (ar - ag) / d + 4;
  }
  h = (h * 60) % 360;
  const l = 0.34;
  const s = 0.55;
  final c = (1 - (2 * l - 1).abs()) * s;
  final x = c * (1 - ((h / 60) % 2 - 1).abs());
  final m = l - c / 2;
  final (rr, gg, bb) = switch (h ~/ 60) {
    0 => (c, x, 0.0),
    1 => (x, c, 0.0),
    2 => (0.0, c, x),
    3 => (0.0, x, c),
    4 => (x, 0.0, c),
    _ => (c, 0.0, x),
  };
  int ch(double v) => ((v + m) * 255).round().clamp(0, 255);
  return 0xFF000000 | (ch(rr) << 16) | (ch(gg) << 8) | ch(bb);
}
