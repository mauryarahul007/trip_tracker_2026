import 'package:flutter/material.dart';

import 'app_colors.dart';

@immutable
class AppTokens extends ThemeExtension<AppTokens> {
  final Color bgPage;
  final Color bgApp;
  final Color bgSurface;
  final Color bgSurfaceHover;
  final Color borderColor;
  final Color borderFocus;

  final Color primaryAccent;
  final Color primaryAccentLight;
  final Color secondaryAccent;
  final Color accentOrange;

  final Color colorSuccess;
  final Color colorDanger;
  final Color colorWarning;

  final Color textPrimary;
  final Color textSecondary;
  final Color textMuted;

  // Elevation base + header gradient (index.css --glass-shadow / --header-gradient-solid)
  final Color shadowBase;
  final Color headerStart;
  final Color headerEnd;

  // Radii
  final double radiusSm;
  final double radiusMd;
  final double radiusLg;
  final double radiusFull;

  // Durations
  final Duration dur1;
  final Duration dur2;
  final Duration dur3;

  // Curves
  final Curve easeSpring;
  final Curve easeDecel;
  final Curve easeBounce;

  const AppTokens({
    required this.bgPage,
    required this.bgApp,
    required this.bgSurface,
    required this.bgSurfaceHover,
    required this.borderColor,
    required this.borderFocus,
    required this.primaryAccent,
    required this.primaryAccentLight,
    required this.secondaryAccent,
    required this.accentOrange,
    required this.colorSuccess,
    required this.colorDanger,
    required this.colorWarning,
    required this.textPrimary,
    required this.textSecondary,
    required this.textMuted,
    this.shadowBase = const Color(0xFF0B0F1A),
    this.headerStart = const Color(0xFF17354F),
    this.headerEnd = const Color(0xFF05080F),
    this.radiusSm = 14.0,
    this.radiusMd = 20.0,
    this.radiusLg = 28.0,
    this.radiusFull = 999.0,
    this.dur1 = const Duration(milliseconds: 120),
    this.dur2 = const Duration(milliseconds: 200),
    this.dur3 = const Duration(milliseconds: 320),
    this.easeSpring = const Cubic(0.32, 0.72, 0.0, 1.0),
    this.easeDecel = const Cubic(0.16, 1.0, 0.3, 1.0),
    this.easeBounce = const Cubic(0.34, 1.4, 0.64, 1.0),
  });

  LinearGradient get headerGradient =>
      LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [headerStart, headerEnd]);

  /// Horizon primary-CTA gradient: cobalt #2F66F8 -> #2250E6 (white label >= 5:1).
  static const LinearGradient ctaGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF2F66F8), Color(0xFF2250E6)],
  );

  static LinearGradient _vertical(List<Color> c, [List<double>? stops]) =>
      LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: c, stops: stops);

  /// Context surfaces (see design/new-app-ui/01-foundations.html).
  /// Night Sky = travel / trip hero, Ember = money, Slate = insights, Dusk = dark mode / Wrapped.
  static const LinearGradient nightSkyGradient = LinearGradient(
    begin: Alignment(-0.3, -1),
    end: Alignment(0.3, 1),
    colors: AppColors.nightSky,
    stops: [0, 0.52, 1],
  );
  static final LinearGradient emberGradient = _vertical(AppColors.ember, const [0, 0.55, 1]);
  static final LinearGradient slateGradient = _vertical(AppColors.slate, const [0, 0.7, 1]);
  static final LinearGradient duskGradient = _vertical(AppColors.dusk, const [0, 0.42, 0.82, 1]);

  bool get _isDark => shadowBase == const Color(0xFF000000);
  double get _a => _isDark ? 1.6 : 1.0;

  /// --shadow-sm: default resting card lift.
  List<BoxShadow> get shadowSm => [
    BoxShadow(
      color: shadowBase.withValues(alpha: 0.04 * _a),
      blurRadius: 2,
      offset: const Offset(0, 1),
    ),
    BoxShadow(
      color: shadowBase.withValues(alpha: 0.08 * _a),
      blurRadius: 12,
      spreadRadius: -4,
      offset: const Offset(0, 4),
    ),
  ];

  /// --shadow-md: raised / hover.
  List<BoxShadow> get shadowMd => [
    BoxShadow(
      color: shadowBase.withValues(alpha: 0.08 * _a),
      blurRadius: 12,
      offset: const Offset(0, 4),
    ),
    BoxShadow(
      color: shadowBase.withValues(alpha: 0.14 * _a),
      blurRadius: 32,
      spreadRadius: -8,
      offset: const Offset(0, 12),
    ),
  ];

  /// --shadow-lg: modals, sheets.
  List<BoxShadow> get shadowLg => [
    BoxShadow(
      color: shadowBase.withValues(alpha: 0.12 * _a),
      blurRadius: 24,
      offset: const Offset(0, 8),
    ),
    BoxShadow(
      color: shadowBase.withValues(alpha: 0.2 * _a),
      blurRadius: 48,
      spreadRadius: -12,
      offset: const Offset(0, 20),
    ),
  ];

  /// --glass-shadow: card / popup default (.glass-card).
  List<BoxShadow> get shadowGlass => [
    BoxShadow(
      color: shadowBase.withValues(alpha: 0.06 * _a),
      blurRadius: 3,
      offset: const Offset(0, 1),
    ),
    BoxShadow(
      color: shadowBase.withValues(alpha: 0.12 * _a),
      blurRadius: 20,
      spreadRadius: -6,
      offset: const Offset(0, 6),
    ),
  ];

  /// Standard `.glass-card` decoration: surface, 1px border, md radius, glass shadow.
  BoxDecoration cardDecoration({Color? color}) => BoxDecoration(
    color: color ?? bgSurface,
    borderRadius: BorderRadius.circular(radiusMd),
    border: Border.all(color: borderColor.withValues(alpha: 0.5)),
    boxShadow: shadowSm,
  );

  Color get successColor => colorSuccess;
  Color get dangerColor => colorDanger;
  Color get warningColor => colorWarning;

  Duration get durationFast => dur1;
  Duration get durationNormal => dur2;
  Duration get durationSlow => dur3;

  static const AppTokens light = AppTokens(
    bgPage: AppColors.lightBgPage,
    bgApp: AppColors.lightBgApp,
    bgSurface: AppColors.lightBgSurface,
    bgSurfaceHover: AppColors.lightBgSurfaceHover,
    borderColor: AppColors.lightBorder,
    borderFocus: AppColors.lightBorderFocus,
    primaryAccent: AppColors.lightPrimaryAccent,
    primaryAccentLight: AppColors.lightPrimaryAccentLight,
    secondaryAccent: AppColors.lightSecondaryAccent,
    accentOrange: AppColors.accentOrange,
    colorSuccess: AppColors.lightSuccess,
    colorDanger: AppColors.lightDanger,
    colorWarning: AppColors.lightWarning,
    textPrimary: AppColors.lightTextPrimary,
    textSecondary: AppColors.lightTextSecondary,
    textMuted: AppColors.lightTextMuted,
  );

  static const AppTokens dark = AppTokens(
    bgPage: AppColors.darkBgPage,
    bgApp: AppColors.darkBgApp,
    bgSurface: AppColors.darkBgSurface,
    bgSurfaceHover: AppColors.darkBgSurfaceHover,
    borderColor: AppColors.darkBorder,
    borderFocus: AppColors.darkBorderFocus,
    primaryAccent: AppColors.darkPrimaryAccent,
    primaryAccentLight: AppColors.darkPrimaryAccentLight,
    secondaryAccent: AppColors.darkSecondaryAccent,
    accentOrange: AppColors.accentOrange,
    colorSuccess: AppColors.darkSuccess,
    colorDanger: AppColors.darkDanger,
    colorWarning: AppColors.darkWarning,
    textPrimary: AppColors.darkTextPrimary,
    textSecondary: AppColors.darkTextSecondary,
    textMuted: AppColors.darkTextMuted,
    shadowBase: Color(0xFF000000),
    headerStart: Color(0xFF17354F),
    headerEnd: Color(0xFF010203),
  );

  static const AppTokens amoled = AppTokens(
    bgPage: AppColors.amoledBgPage,
    bgApp: AppColors.amoledBgApp,
    bgSurface: AppColors.amoledBgSurface,
    bgSurfaceHover: AppColors.amoledBgSurfaceHover,
    borderColor: AppColors.amoledBorder,
    borderFocus: AppColors.darkBorderFocus,
    primaryAccent: AppColors.darkPrimaryAccent,
    primaryAccentLight: AppColors.darkPrimaryAccentLight,
    secondaryAccent: AppColors.darkSecondaryAccent,
    accentOrange: AppColors.accentOrange,
    colorSuccess: AppColors.darkSuccess,
    colorDanger: AppColors.darkDanger,
    colorWarning: AppColors.darkWarning,
    textPrimary: AppColors.darkTextPrimary,
    textSecondary: AppColors.darkTextSecondary,
    textMuted: AppColors.darkTextMuted,
    shadowBase: Color(0xFF000000),
    headerStart: Color(0xFF17354F),
    headerEnd: Color(0xFF010203),
  );

  @override
  AppTokens copyWith({
    Color? bgPage,
    Color? bgApp,
    Color? bgSurface,
    Color? bgSurfaceHover,
    Color? borderColor,
    Color? borderFocus,
    Color? primaryAccent,
    Color? primaryAccentLight,
    Color? secondaryAccent,
    Color? accentOrange,
    Color? colorSuccess,
    Color? colorDanger,
    Color? colorWarning,
    Color? textPrimary,
    Color? textSecondary,
    Color? textMuted,
    Color? shadowBase,
    Color? headerStart,
    Color? headerEnd,
    double? radiusSm,
    double? radiusMd,
    double? radiusLg,
    double? radiusFull,
    Duration? dur1,
    Duration? dur2,
    Duration? dur3,
    Curve? easeSpring,
    Curve? easeDecel,
    Curve? easeBounce,
  }) {
    return AppTokens(
      bgPage: bgPage ?? this.bgPage,
      bgApp: bgApp ?? this.bgApp,
      bgSurface: bgSurface ?? this.bgSurface,
      bgSurfaceHover: bgSurfaceHover ?? this.bgSurfaceHover,
      borderColor: borderColor ?? this.borderColor,
      borderFocus: borderFocus ?? this.borderFocus,
      primaryAccent: primaryAccent ?? this.primaryAccent,
      primaryAccentLight: primaryAccentLight ?? this.primaryAccentLight,
      secondaryAccent: secondaryAccent ?? this.secondaryAccent,
      accentOrange: accentOrange ?? this.accentOrange,
      colorSuccess: colorSuccess ?? this.colorSuccess,
      colorDanger: colorDanger ?? this.colorDanger,
      colorWarning: colorWarning ?? this.colorWarning,
      textPrimary: textPrimary ?? this.textPrimary,
      textSecondary: textSecondary ?? this.textSecondary,
      textMuted: textMuted ?? this.textMuted,
      shadowBase: shadowBase ?? this.shadowBase,
      headerStart: headerStart ?? this.headerStart,
      headerEnd: headerEnd ?? this.headerEnd,
      radiusSm: radiusSm ?? this.radiusSm,
      radiusMd: radiusMd ?? this.radiusMd,
      radiusLg: radiusLg ?? this.radiusLg,
      radiusFull: radiusFull ?? this.radiusFull,
      dur1: dur1 ?? this.dur1,
      dur2: dur2 ?? this.dur2,
      dur3: dur3 ?? this.dur3,
      easeSpring: easeSpring ?? this.easeSpring,
      easeDecel: easeDecel ?? this.easeDecel,
      easeBounce: easeBounce ?? this.easeBounce,
    );
  }

  @override
  AppTokens lerp(ThemeExtension<AppTokens>? other, double t) {
    if (other is! AppTokens) return this;
    return AppTokens(
      bgPage: Color.lerp(bgPage, other.bgPage, t) ?? bgPage,
      bgApp: Color.lerp(bgApp, other.bgApp, t) ?? bgApp,
      bgSurface: Color.lerp(bgSurface, other.bgSurface, t) ?? bgSurface,
      bgSurfaceHover: Color.lerp(bgSurfaceHover, other.bgSurfaceHover, t) ?? bgSurfaceHover,
      borderColor: Color.lerp(borderColor, other.borderColor, t) ?? borderColor,
      borderFocus: Color.lerp(borderFocus, other.borderFocus, t) ?? borderFocus,
      primaryAccent: Color.lerp(primaryAccent, other.primaryAccent, t) ?? primaryAccent,
      primaryAccentLight: Color.lerp(primaryAccentLight, other.primaryAccentLight, t) ?? primaryAccentLight,
      secondaryAccent: Color.lerp(secondaryAccent, other.secondaryAccent, t) ?? secondaryAccent,
      accentOrange: Color.lerp(accentOrange, other.accentOrange, t) ?? accentOrange,
      colorSuccess: Color.lerp(colorSuccess, other.colorSuccess, t) ?? colorSuccess,
      colorDanger: Color.lerp(colorDanger, other.colorDanger, t) ?? colorDanger,
      colorWarning: Color.lerp(colorWarning, other.colorWarning, t) ?? colorWarning,
      textPrimary: Color.lerp(textPrimary, other.textPrimary, t) ?? textPrimary,
      textSecondary: Color.lerp(textSecondary, other.textSecondary, t) ?? textSecondary,
      textMuted: Color.lerp(textMuted, other.textMuted, t) ?? textMuted,
      shadowBase: Color.lerp(shadowBase, other.shadowBase, t) ?? shadowBase,
      headerStart: Color.lerp(headerStart, other.headerStart, t) ?? headerStart,
      headerEnd: Color.lerp(headerEnd, other.headerEnd, t) ?? headerEnd,
      radiusSm: radiusSm,
      radiusMd: radiusMd,
      radiusLg: radiusLg,
      radiusFull: radiusFull,
      dur1: dur1,
      dur2: dur2,
      dur3: dur3,
      easeSpring: easeSpring,
      easeDecel: easeDecel,
      easeBounce: easeBounce,
    );
  }
}

extension AppTokensContext on BuildContext {
  AppTokens get tokens => Theme.of(this).extension<AppTokens>() ?? AppTokens.light;
}
