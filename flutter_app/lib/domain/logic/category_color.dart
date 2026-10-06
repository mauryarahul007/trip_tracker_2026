import 'dart:math' as math;

/// Port of src/utils/categoryColor.ts: fixed colours for built-ins, a stable
/// hash-based hue for everything else (so a custom category keeps its colour
/// without storing one).
const _builtIn = <String, String>{
  'cat-food': '#6366f1',
  'cat-stay': '#3b82f6',
  'cat-travel': '#db2777',
  'cat-activities': '#10b981',
  'cat-shopping': '#f59e0b',
  'cat-misc': '#8b5cf6',
};

int _toInt32(int v) => ((v & 0xFFFFFFFF) ^ 0x80000000) - 0x80000000;

/// The web's CSS string: `#rrggbb` or `hsl(h, 65%, 55%)`.
String categoryColorCss(String id) {
  final fixed = _builtIn[id];
  if (fixed != null) return fixed;
  var hash = 0;
  for (final unit in id.codeUnits) {
    // JS: hash = code + ((hash << 5) - hash); `<<` truncates to int32, the rest is double math.
    hash = unit + (_toInt32(hash << 5) - hash);
  }
  return 'hsl(${hash.abs() % 360}, 65%, 55%)';
}

/// Same colour as 0xAARRGGBB for the UI layer.
int categoryColorArgb(String id) {
  final css = categoryColorCss(id);
  if (css.startsWith('#')) return 0xFF000000 | int.parse(css.substring(1), radix: 16);
  final h = int.parse(RegExp(r'hsl\((\d+)').firstMatch(css)!.group(1)!) / 360.0;
  const s = 0.65, l = 0.55;
  const q = l + s - l * s; // l >= 0.5
  const p = 2 * l - q;
  double channel(double t) {
    var x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  }

  int to8(double c) => math.min(255, math.max(0, (c * 255).round()));
  return 0xFF000000 | (to8(channel(h + 1 / 3)) << 16) | (to8(channel(h)) << 8) | to8(channel(h - 1 / 3));
}
