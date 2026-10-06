import 'package:flutter/material.dart';

class AppTypography {
  static const String fontTitle = 'Plus Jakarta Sans';
  static const String fontBody = 'IBM Plex Sans';
  static const String fontMono = 'IBM Plex Mono';

  static TextTheme createTextTheme(Color textPrimary, Color textSecondary, Color textMuted) {
    return TextTheme(
      displayLarge: TextStyle(
        fontFamily: fontTitle,
        fontSize: 32,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.6,
        color: textPrimary,
      ),
      headlineMedium: TextStyle(
        fontFamily: fontTitle,
        fontSize: 24,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.4,
        color: textPrimary,
      ),
      titleLarge: TextStyle(
        fontFamily: fontTitle,
        fontSize: 20,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.2,
        color: textPrimary,
      ),
      titleMedium: TextStyle(fontFamily: fontBody, fontSize: 16, fontWeight: FontWeight.w600, color: textPrimary),
      bodyLarge: TextStyle(fontFamily: fontBody, fontSize: 16, fontWeight: FontWeight.normal, color: textPrimary),
      bodyMedium: TextStyle(fontFamily: fontBody, fontSize: 14, fontWeight: FontWeight.normal, color: textSecondary),
      labelLarge: TextStyle(fontFamily: fontBody, fontSize: 14, fontWeight: FontWeight.w600, color: textPrimary),
      labelMedium: TextStyle(fontFamily: fontBody, fontSize: 12, fontWeight: FontWeight.w500, color: textMuted),
      labelSmall: TextStyle(
        fontFamily: fontBody,
        fontSize: 11,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.5,
        color: textMuted,
      ),
    );
  }

  static TextStyle monoNumber({double fontSize = 16, FontWeight fontWeight = FontWeight.w500, Color? color}) {
    return TextStyle(
      fontFamily: fontMono,
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      fontFeatures: tabularFigures,
    );
  }

  static const List<FontFeature> tabularFigures = [FontFeature.tabularFigures()];
}
