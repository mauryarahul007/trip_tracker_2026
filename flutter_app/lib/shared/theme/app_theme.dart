import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app_tokens.dart';
import 'app_typography.dart';

/// Selected chips use a light tint with the accent as text (like [CategoryChip]); the Material
/// default painted a dark fill under dark text in the light theme (contrast 1.18, found by the
/// Phase 12 accessibility test).
ChipThemeData _chipTheme(AppTokens t) => ChipThemeData(
  backgroundColor: t.bgSurface,
  selectedColor: t.primaryAccent.withValues(alpha: 0.1),
  side: BorderSide(color: t.borderColor),
  shape: const StadiumBorder(),
  labelStyle: TextStyle(color: t.textPrimary, fontSize: 13, fontWeight: FontWeight.w500),
  secondaryLabelStyle: TextStyle(color: t.primaryAccent, fontSize: 13, fontWeight: FontWeight.w600),
  checkmarkColor: t.primaryAccent,
);

OutlineInputBorder _inputBorder(AppTokens t, Color color, [double width = 1]) => OutlineInputBorder(
  borderRadius: BorderRadius.circular(t.radiusSm + 4), // 18, Horizon field radius
  borderSide: BorderSide(color: color, width: width),
);

/// Single builder for light / dark / AMOLED so the web-app look (index.css) stays in one place.
ThemeData _build(AppTokens t, Brightness brightness) {
  final textTheme = AppTypography.createTextTheme(t.textPrimary, t.textSecondary, t.textMuted);
  final isDark = brightness == Brightness.dark;
  final base = isDark ? const ColorScheme.dark() : const ColorScheme.light();

  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    scaffoldBackgroundColor: t.bgPage,
    fontFamily: AppTypography.fontBody,
    colorScheme: base.copyWith(
      primary: t.primaryAccent,
      secondary: t.secondaryAccent,
      // Selected SegmentedButton / indicators: M3 derived a dark fill under dark text here.
      secondaryContainer: Color.alphaBlend(t.primaryAccent.withValues(alpha: 0.15), t.bgSurface),
      onSecondaryContainer: t.primaryAccent,
      surface: t.bgSurface,
      error: t.colorDanger,
    ),
    textTheme: textTheme,
    extensions: [t],
    // Web header is a teal gradient with light text; AppBar stays transparent over [AppGradientHeader].
    appBarTheme: AppBarTheme(
      backgroundColor: t.bgSurface,
      foregroundColor: t.textPrimary,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: textTheme.titleLarge,
      systemOverlayStyle: isDark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark,
    ),
    cardTheme: CardThemeData(
      color: t.bgSurface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shadowColor: t.shadowBase.withValues(alpha: 0.12),
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(t.radiusMd),
        side: BorderSide(color: t.borderColor.withValues(alpha: 0.6)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: t.bgSurface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      hintStyle: TextStyle(color: t.textMuted, fontSize: 16),
      border: _inputBorder(t, t.borderColor),
      enabledBorder: _inputBorder(t, t.borderColor),
      focusedBorder: _inputBorder(t, t.primaryAccent, 1.5),
      errorBorder: _inputBorder(t, t.colorDanger),
      focusedErrorBorder: _inputBorder(t, t.colorDanger, 1.5),
    ),
    // Secondary / text buttons: pill, 1px border, ink text (.secondary-btn).
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: t.textPrimary,
        side: BorderSide(color: t.borderColor),
        shape: const StadiumBorder(),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        textStyle: const TextStyle(fontWeight: FontWeight.w600),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: t.primaryAccent,
        shape: const StadiumBorder(),
        textStyle: const TextStyle(fontWeight: FontWeight.w600),
      ),
    ),
    // Cobalt FAB: the single primary action per screen.
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: AppTokens.ctaGradient.colors.last,
      foregroundColor: Colors.white,
      elevation: 4,
      shape: const CircleBorder(),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: t.bgSurface.withValues(alpha: 0.96),
      surfaceTintColor: Colors.transparent,
      shadowColor: t.shadowBase,
      indicatorColor: t.primaryAccent.withValues(alpha: 0.12),
      indicatorShape: const StadiumBorder(),
      labelTextStyle: WidgetStateProperty.resolveWith(
        (s) => TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: s.contains(WidgetState.selected) ? t.primaryAccent : t.textMuted,
        ),
      ),
      iconTheme: WidgetStateProperty.resolveWith(
        (s) => IconThemeData(color: s.contains(WidgetState.selected) ? t.primaryAccent : t.textMuted),
      ),
    ),
    navigationRailTheme: NavigationRailThemeData(
      backgroundColor: t.bgSurface,
      indicatorColor: t.primaryAccent.withValues(alpha: 0.12),
      indicatorShape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      selectedIconTheme: IconThemeData(color: t.primaryAccent),
      unselectedIconTheme: IconThemeData(color: t.textMuted),
      selectedLabelTextStyle: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: t.primaryAccent),
      unselectedLabelTextStyle: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: t.textMuted),
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: t.bgSurface,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(t.radiusLg))),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: t.bgSurface,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(t.radiusLg)),
    ),
    chipTheme: _chipTheme(t),
    dividerTheme: DividerThemeData(color: t.borderColor, thickness: 1, space: 1),
  );
}

class AppTheme {
  static ThemeData light() => lightTheme;
  static ThemeData dark() => darkTheme;
  static ThemeData amoled() => amoledTheme;

  static ThemeData get lightTheme => _build(AppTokens.light, Brightness.light);
  static ThemeData get darkTheme => _build(AppTokens.dark, Brightness.dark);
  static ThemeData get amoledTheme => _build(AppTokens.amoled, Brightness.dark);
}
