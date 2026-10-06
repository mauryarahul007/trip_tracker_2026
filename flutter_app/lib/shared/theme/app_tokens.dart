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
    this.radiusSm = 10.0,
    this.radiusMd = 14.0,
    this.radiusLg = 20.0,
    this.radiusFull = 999.0,
    this.dur1 = const Duration(milliseconds: 120),
    this.dur2 = const Duration(milliseconds: 200),
    this.dur3 = const Duration(milliseconds: 320),
    this.easeSpring = const Cubic(0.32, 0.72, 0.0, 1.0),
    this.easeDecel = const Cubic(0.16, 1.0, 0.3, 1.0),
    this.easeBounce = const Cubic(0.34, 1.4, 0.64, 1.0),
  });

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
      bgSurfaceHover:
          Color.lerp(bgSurfaceHover, other.bgSurfaceHover, t) ?? bgSurfaceHover,
      borderColor: Color.lerp(borderColor, other.borderColor, t) ?? borderColor,
      borderFocus: Color.lerp(borderFocus, other.borderFocus, t) ?? borderFocus,
      primaryAccent:
          Color.lerp(primaryAccent, other.primaryAccent, t) ?? primaryAccent,
      primaryAccentLight:
          Color.lerp(primaryAccentLight, other.primaryAccentLight, t) ??
          primaryAccentLight,
      secondaryAccent:
          Color.lerp(secondaryAccent, other.secondaryAccent, t) ??
          secondaryAccent,
      accentOrange:
          Color.lerp(accentOrange, other.accentOrange, t) ?? accentOrange,
      colorSuccess:
          Color.lerp(colorSuccess, other.colorSuccess, t) ?? colorSuccess,
      colorDanger: Color.lerp(colorDanger, other.colorDanger, t) ?? colorDanger,
      colorWarning:
          Color.lerp(colorWarning, other.colorWarning, t) ?? colorWarning,
      textPrimary: Color.lerp(textPrimary, other.textPrimary, t) ?? textPrimary,
      textSecondary:
          Color.lerp(textSecondary, other.textSecondary, t) ?? textSecondary,
      textMuted: Color.lerp(textMuted, other.textMuted, t) ?? textMuted,
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
  AppTokens get tokens =>
      Theme.of(this).extension<AppTokens>() ?? AppTokens.light;
}
