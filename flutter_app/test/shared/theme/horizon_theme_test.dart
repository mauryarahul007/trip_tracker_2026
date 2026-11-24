import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/shared/theme/app_colors.dart';
import 'package:trip_tracker/shared/theme/app_theme.dart';
import 'package:trip_tracker/shared/theme/app_tokens.dart';

double _ratio(Color a, Color b) {
  final l1 = a.computeLuminance(), l2 = b.computeLuminance();
  return (l1 > l2 ? l1 + 0.05 : l2 + 0.05) / (l1 > l2 ? l2 + 0.05 : l1 + 0.05);
}

void main() {
  group('Horizon tokens (flag enableHorizonUi)', () {
    test('theme picks Horizon only when asked', () {
      expect(AppTheme.light().extension<AppTokens>()!.horizon, isFalse);
      expect(AppTheme.light().colorScheme.primary, AppColors.calmTeal);
      final h = AppTheme.light(horizon: true);
      expect(h.extension<AppTokens>()!.horizon, isTrue);
      expect(h.colorScheme.primary, AppColors.horizonBlue);
      expect(h.scaffoldBackgroundColor, AppColors.horizonGround);
      expect(AppTheme.dark(horizon: true).colorScheme.primary, AppColors.horizonDarkBlue);
      expect(AppTheme.amoled(horizon: true).scaffoldBackgroundColor, const Color(0xFF000000));
      expect(AppTheme.highContrastLight(horizon: true).extension<AppTokens>()!.horizon, isTrue);
    });

    for (final (name, t) in [
      ('light', AppTokens.horizonLight),
      ('dark', AppTokens.horizonDark),
      ('amoled', AppTokens.horizonAmoled),
    ]) {
      test('$name: text, money and the main button pass AA', () {
        expect(_ratio(t.textPrimary, t.bgPage), greaterThanOrEqualTo(4.5));
        expect(_ratio(t.textPrimary, t.bgSurface), greaterThanOrEqualTo(4.5));
        expect(_ratio(t.textMuted, t.bgSurface), greaterThanOrEqualTo(4.5));
        expect(_ratio(t.colorSuccess, t.bgSurface), greaterThanOrEqualTo(4.5));
        expect(_ratio(t.colorDanger, t.bgSurface), greaterThanOrEqualTo(4.5));
        expect(_ratio(t.ctaFg, t.ctaBg), greaterThanOrEqualTo(4.5));
        expect(_ratio(t.primaryAccent, t.bgSurface), greaterThanOrEqualTo(4.5));
      });

      test('$name: every category tint label reads on its tile', () {
        for (final tone in BentoTone.values) {
          final tint = t.tones[tone];
          expect(_ratio(tint.accent, tint.bg), greaterThanOrEqualTo(4.5), reason: tone.name);
        }
      });

      test('$name: hero surfaces stay dark under light text', () {
        expect(_ratio(const Color(0xFFFFFFFF), t.heroMid), greaterThanOrEqualTo(7));
        expect(_ratio(t.accentOnDark, t.heroMid), greaterThanOrEqualTo(4.5));
      });
    }
  });
}
