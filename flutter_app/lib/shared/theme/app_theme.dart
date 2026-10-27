import 'package:flutter/cupertino.dart' show CupertinoPageTransitionsBuilder;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/platform/motion.dart';
import 'app_tokens.dart';
import 'app_typography.dart';

/// Calm chips: outlined surface pills; the selected chip fills with ink and its label flips to the ground.
ChipThemeData _chipTheme(AppTokens t) {
  final calmLabel = TextStyle(
    color: WidgetStateColor.resolveWith((s) => s.contains(WidgetState.selected) ? t.bgPage : t.textPrimary),
    fontSize: 14,
    fontWeight: FontWeight.w600,
  );
  return ChipThemeData(
    backgroundColor: t.bgSurface,
    selectedColor: t.textPrimary,
    side: WidgetStateBorderSide.resolveWith(
      (s) => s.contains(WidgetState.selected) ? BorderSide(color: t.textPrimary) : BorderSide(color: t.borderColor),
    ),
    shape: const StadiumBorder(),
    labelStyle: calmLabel,
    secondaryLabelStyle: calmLabel,
    checkmarkColor: t.bgPage,
  );
}

OutlineInputBorder _inputBorder(AppTokens t, Color color, [double width = 1]) => OutlineInputBorder(
  borderRadius: BorderRadius.circular(t.radiusSm + 4), // 18, Horizon field radius
  borderSide: BorderSide(color: color, width: width),
);

/// The platform's own page transition, except that with Reduce motion on (the app setting or the phone's "remove
/// animations") a page fades in instead of zooming or sliding. iOS keeps the Cupertino slide: it carries the
/// swipe-back gesture, and iOS itself already softens it under Reduce Motion.
class ReduceMotionPageTransitionsBuilder extends PageTransitionsBuilder {
  const ReduceMotionPageTransitionsBuilder([this.inner = const ZoomPageTransitionsBuilder()]);

  final PageTransitionsBuilder inner;

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    if (AppMotion.reduce || MediaQuery.disableAnimationsOf(context)) {
      return FadeTransition(opacity: animation, child: child);
    }
    return inner.buildTransitions<T>(route, context, animation, secondaryAnimation, child);
  }
}

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
    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {
        // Android 14+ predictive back: the back swipe peeks at the screen underneath before committing.
        TargetPlatform.android: ReduceMotionPageTransitionsBuilder(PredictiveBackPageTransitionsBuilder()),
        TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        TargetPlatform.macOS: CupertinoPageTransitionsBuilder(),
        TargetPlatform.linux: ReduceMotionPageTransitionsBuilder(),
        TargetPlatform.windows: ReduceMotionPageTransitionsBuilder(),
        TargetPlatform.fuchsia: ReduceMotionPageTransitionsBuilder(),
      },
    ),
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
      // A soft square (20px) like the mockup's ink "+" key.
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
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
  /// All looks share the Calm Passport colours. [calm] only picks the layout: false keeps the pre-Calm dock and
  /// tab bar (Ops Deck flag `enableCalmPassportUi` OFF).
  static ThemeData light({bool calm = true}) => _build(AppTokens.light.copyWith(calm: calm), Brightness.light);
  static ThemeData dark({bool calm = true}) => _build(AppTokens.dark.copyWith(calm: calm), Brightness.dark);
  static ThemeData amoled({bool calm = true}) => _build(AppTokens.amoled.copyWith(calm: calm), Brightness.dark);

  /// Darker text and stronger borders on the same surfaces (Settings > Appearance > High contrast).
  static ThemeData highContrastLight({bool calm = true}) => _build(
    AppTokens.light.copyWith(
      calm: calm,
      textPrimary: const Color(0xFF000000),
      textSecondary: const Color(0xFF1F2933),
      textMuted: const Color(0xFF3A4450),
      borderColor: const Color(0xFF5A6370),
    ),
    Brightness.light,
  );
  static ThemeData highContrastDark({bool calm = true}) => _build(
    AppTokens.dark.copyWith(
      calm: calm,
      textPrimary: const Color(0xFFFFFFFF),
      textSecondary: const Color(0xFFE5E7EB),
      textMuted: const Color(0xFFC9CED6),
      borderColor: const Color(0xFF9AA3AF),
    ),
    Brightness.dark,
  );

  static ThemeData get lightTheme => _build(AppTokens.light, Brightness.light);
  static ThemeData get darkTheme => _build(AppTokens.dark, Brightness.dark);
  static ThemeData get amoledTheme => _build(AppTokens.amoled, Brightness.dark);
}
