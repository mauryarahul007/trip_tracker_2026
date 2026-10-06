import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app_tokens.dart';
import 'app_typography.dart';

/// Selected chips use a light tint with the accent as text (like [CategoryChip]); the Material
/// default painted a dark fill under dark text in the light theme (contrast 1.18, found by the
/// Phase 12 accessibility test).
ChipThemeData _chipTheme(AppTokens t) => ChipThemeData(
  backgroundColor: t.bgSurface,
  selectedColor: t.primaryAccent.withValues(alpha: 0.15),
  side: BorderSide(color: t.borderColor),
  labelStyle: TextStyle(color: t.textPrimary, fontSize: 13, fontWeight: FontWeight.w500),
  secondaryLabelStyle: TextStyle(color: t.primaryAccent, fontSize: 13, fontWeight: FontWeight.w600),
  checkmarkColor: t.primaryAccent,
);

class AppTheme {
  static ThemeData light() => lightTheme;
  static ThemeData dark() => darkTheme;
  static ThemeData amoled() => amoledTheme;

  static ThemeData get lightTheme {
    const tokens = AppTokens.light;
    final textTheme = AppTypography.createTextTheme(tokens.textPrimary, tokens.textSecondary, tokens.textMuted);

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: tokens.bgPage,
      colorScheme: ColorScheme.light(
        primary: tokens.primaryAccent,
        secondary: tokens.secondaryAccent,
        // Selected SegmentedButton / indicators: M3 derived a dark fill under dark text here.
        secondaryContainer: Color.alphaBlend(tokens.primaryAccent.withValues(alpha: 0.15), tokens.bgSurface),
        onSecondaryContainer: tokens.primaryAccent,
        surface: tokens.bgSurface,
        error: tokens.colorDanger,
      ),
      textTheme: textTheme,
      extensions: const [tokens],
      appBarTheme: AppBarTheme(
        backgroundColor: tokens.bgSurface,
        foregroundColor: tokens.textPrimary,
        elevation: 0,
        centerTitle: false,
        systemOverlayStyle: SystemUiOverlayStyle.dark,
      ),
      chipTheme: _chipTheme(tokens),
      dividerTheme: DividerThemeData(color: tokens.borderColor, thickness: 1, space: 1),
    );
  }

  static ThemeData get darkTheme {
    const tokens = AppTokens.dark;
    final textTheme = AppTypography.createTextTheme(tokens.textPrimary, tokens.textSecondary, tokens.textMuted);

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: tokens.bgPage,
      colorScheme: ColorScheme.dark(
        primary: tokens.primaryAccent,
        secondary: tokens.secondaryAccent,
        // Selected SegmentedButton / indicators: M3 derived a dark fill under dark text here.
        secondaryContainer: Color.alphaBlend(tokens.primaryAccent.withValues(alpha: 0.15), tokens.bgSurface),
        onSecondaryContainer: tokens.primaryAccent,
        surface: tokens.bgSurface,
        error: tokens.colorDanger,
      ),
      textTheme: textTheme,
      extensions: const [tokens],
      appBarTheme: AppBarTheme(
        backgroundColor: tokens.bgSurface,
        foregroundColor: tokens.textPrimary,
        elevation: 0,
        centerTitle: false,
        systemOverlayStyle: SystemUiOverlayStyle.light,
      ),
      chipTheme: _chipTheme(tokens),
      dividerTheme: DividerThemeData(color: tokens.borderColor, thickness: 1, space: 1),
    );
  }

  static ThemeData get amoledTheme {
    const tokens = AppTokens.amoled;
    final textTheme = AppTypography.createTextTheme(tokens.textPrimary, tokens.textSecondary, tokens.textMuted);

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: tokens.bgPage,
      colorScheme: ColorScheme.dark(
        primary: tokens.primaryAccent,
        secondary: tokens.secondaryAccent,
        // Selected SegmentedButton / indicators: M3 derived a dark fill under dark text here.
        secondaryContainer: Color.alphaBlend(tokens.primaryAccent.withValues(alpha: 0.15), tokens.bgSurface),
        onSecondaryContainer: tokens.primaryAccent,
        surface: tokens.bgSurface,
        error: tokens.colorDanger,
      ),
      textTheme: textTheme,
      extensions: const [tokens],
      appBarTheme: AppBarTheme(
        backgroundColor: tokens.bgSurface,
        foregroundColor: tokens.textPrimary,
        elevation: 0,
        centerTitle: false,
        systemOverlayStyle: SystemUiOverlayStyle.light,
      ),
      chipTheme: _chipTheme(tokens),
      dividerTheme: DividerThemeData(color: tokens.borderColor, thickness: 1, space: 1),
    );
  }
}
