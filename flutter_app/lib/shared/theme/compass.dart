import 'package:flutter/material.dart';

import 'app_tokens.dart';

/// Compass additions to [AppTokens]. Kept as an extension so no existing token or theme value changes:
/// screens behind a Compass flag opt in, every other screen renders exactly as before.
extension CompassTokens on AppTokens {
  bool get _isDark => bgPage.computeLuminance() < 0.5;

  /// The one orange action colour (Add expense, Pay). White text on [sun] is 5.2:1 in light, ink in dark.
  Color get sun => _isDark ? const Color(0xFFFF8A57) : const Color(0xFFC2410C);
  Color get onSun => _isDark ? const Color(0xFF2A0E02) : Colors.white;
  Color get sunSoft => _isDark ? const Color(0xFF3A2014) : const Color(0xFFFDE6DA);

  /// Soft teal wash for selected chips and info rows.
  Color get primarySoft => _isDark ? const Color(0xFF123A35) : const Color(0xFFD8EFE9);

  /// Category colours for icons and charts (same hue in both themes, tint differs).
  Color categoryColor(String category) => switch (category.toLowerCase()) {
    'food' || 'food & drink' || 'dining' => const Color(0xFFF08A3C),
    'stay' || 'accommodation' || 'hotel' => const Color(0xFF5B8DEF),
    'transport' || 'travel' || 'move' => const Color(0xFF34B27B),
    'activities' || 'fun' || 'entertainment' => const Color(0xFFA66BE8),
    'shopping' || 'shop' => const Color(0xFFE4578A),
    _ => const Color(0xFF8A9A94),
  };
}
