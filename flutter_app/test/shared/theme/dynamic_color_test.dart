import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/shared/theme/app_theme.dart';
import 'package:trip_tracker/shared/theme/app_tokens.dart';

void main() {
  group('tintTokens (Material You)', () {
    test('a null accent leaves the Calm teal alone', () {
      expect(identical(tintTokens(AppTokens.light, null, Brightness.light), AppTokens.light), isTrue);
    });

    test('an accent recolours only the accent tokens', () {
      const wallpaper = Color(0xFFB3261E);
      final tinted = tintTokens(AppTokens.light, wallpaper, Brightness.light);
      expect(tinted.primaryAccent, isNot(AppTokens.light.primaryAccent));
      expect(tinted.primaryAccentLight, isNot(AppTokens.light.primaryAccentLight));
      expect(tinted.bgPage, AppTokens.light.bgPage);
      expect(tinted.textPrimary, AppTokens.light.textPrimary);
      expect(tinted.borderColor, AppTokens.light.borderColor);
    });

    test('light and dark themes take different tones from the same wallpaper colour', () {
      const wallpaper = Color(0xFF6750A4);
      expect(
        tintTokens(AppTokens.light, wallpaper, Brightness.light).primaryAccent,
        isNot(tintTokens(AppTokens.dark, wallpaper, Brightness.dark).primaryAccent),
      );
    });

    test('AppTheme builds with and without an accent', () {
      expect(AppTheme.light(accent: const Color(0xFF00695C)).brightness, Brightness.light);
      expect(AppTheme.dark(accent: const Color(0xFF00695C)).brightness, Brightness.dark);
      expect(AppTheme.amoled().brightness, Brightness.dark);
    });
  });
}
