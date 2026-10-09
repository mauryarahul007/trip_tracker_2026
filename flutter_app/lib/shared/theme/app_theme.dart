import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app_tokens.dart';
import 'app_typography.dart';

/// Bento chips: white pills; the selected chip flips to ink with a contrasting label (found by the Phase 12
/// accessibility test that Material's default painted dark text on a dark fill).
ChipThemeData _chipTheme(AppTokens t) {
  // Bento chips: white pills; a selected chip takes the lilac tone (same as the nav's selected pill) and the label
  // stays ink in every state, so contrast never depends on which style Material picks (ChoiceChip reads
  // secondaryLabelStyle, the others labelStyle).
  final label = TextStyle(color: t.textPrimary, fontSize: 14, fontWeight: FontWeight.w700);
  return ChipThemeData(
    backgroundColor: t.bgSurface,
    selectedColor: t.tones.lilac.bg,
    side: BorderSide.none,
    shape: const StadiumBorder(),
    labelStyle: label,
    secondaryLabelStyle: label,
    checkmarkColor: t.textPrimary,
  );
}

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
      backgroundColor: t.bgPage,
      foregroundColor: t.textPrimary,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        fontFamily: AppTypography.fontTitle,
        fontSize: 26,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.6,
        color: t.textPrimary,
      ),
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
    // Ink FAB: the single primary action per screen.
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: t.ctaBg,
      foregroundColor: t.ctaFg,
      elevation: 4,
      // A pill, not a circle: the extended "Add expense" button carries a label and must grow with it.
      shape: const StadiumBorder(),
      extendedPadding: const EdgeInsets.symmetric(horizontal: 20),
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
