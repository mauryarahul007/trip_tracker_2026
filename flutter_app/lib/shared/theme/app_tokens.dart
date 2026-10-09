import 'package:flutter/material.dart';

import 'app_colors.dart';

/// The five Bento tile colours.
enum BentoTone { mint, butter, peach, sky, lilac }

/// One tint: its [bg] and the deeper [accent] used for the small label on it (text on it stays ink).
@immutable
class BentoTint {
  const BentoTint(this.bg, this.accent);
  BentoTint.of(List<Color> c) : this(c[0], c[1]);
  final Color bg;
  final Color accent;

  static BentoTint lerp(BentoTint a, BentoTint b, double t) =>
      BentoTint(Color.lerp(a.bg, b.bg, t) ?? a.bg, Color.lerp(a.accent, b.accent, t) ?? a.accent);
}

@immutable
class BentoTones {
  const BentoTones({
    required this.mint,
    required this.butter,
    required this.peach,
    required this.sky,
    required this.lilac,
  });

  final BentoTint mint, butter, peach, sky, lilac;

  BentoTint operator [](BentoTone tone) => switch (tone) {
    BentoTone.mint => mint,
    BentoTone.butter => butter,
    BentoTone.peach => peach,
    BentoTone.sky => sky,
    BentoTone.lilac => lilac,
  };

  static BentoTones lerp(BentoTones a, BentoTones b, double t) => BentoTones(
    mint: BentoTint.lerp(a.mint, b.mint, t),
    butter: BentoTint.lerp(a.butter, b.butter, t),
    peach: BentoTint.lerp(a.peach, b.peach, t),
    sky: BentoTint.lerp(a.sky, b.sky, t),
    lilac: BentoTint.lerp(a.lilac, b.lilac, t),
  );

  static final BentoTones light = BentoTones(
    mint: BentoTint.of(AppColors.tileMint),
    butter: BentoTint.of(AppColors.tileButter),
    peach: BentoTint.of(AppColors.tilePeach),
    sky: BentoTint.of(AppColors.tileSky),
    lilac: BentoTint.of(AppColors.tileLilac),
  );
  static final BentoTones dark = BentoTones(
    mint: BentoTint.of(AppColors.darkTileMint),
    butter: BentoTint.of(AppColors.darkTileButter),
    peach: BentoTint.of(AppColors.darkTilePeach),
    sky: BentoTint.of(AppColors.darkTileSky),
    lilac: BentoTint.of(AppColors.darkTileLilac),
  );
  static final BentoTones amoled = BentoTones(
    mint: BentoTint.of(AppColors.amoledTileMint),
    butter: BentoTint.of(AppColors.amoledTileButter),
    peach: BentoTint.of(AppColors.amoledTilePeach),
    sky: BentoTint.of(AppColors.amoledTileSky),
    lilac: BentoTint.of(AppColors.amoledTileLilac),
  );
}

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

  /// Bento pastel tiles and the solid primary-button colours (ink on light, cream on dark).
  final BentoTones tones;
  final Color ctaBg;
  final Color ctaFg;

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
    required this.tones,
    required this.ctaBg,
    required this.ctaFg,
    this.shadowBase = const Color(0xFF0B0F1A),
    this.headerStart = const Color(0xFF0F6F63),
    this.headerEnd = const Color(0xFF0B5348),
    this.radiusSm = 16.0,
    this.radiusMd = 24.0,
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

  static final AppTokens light = AppTokens(
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
    tones: BentoTones.light,
    ctaBg: AppColors.lightSecondaryAccent,
    ctaFg: const Color(0xFFFFFFFF),
  );

  static final AppTokens dark = AppTokens(
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
    tones: BentoTones.dark,
    ctaBg: AppColors.darkSecondaryAccent,
    ctaFg: AppColors.darkBgPage,
    shadowBase: const Color(0xFF000000),
    headerStart: const Color(0xFF1F6E68),
    headerEnd: const Color(0xFF0D2522),
  );

  static final AppTokens amoled = AppTokens(
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
    tones: BentoTones.amoled,
    ctaBg: AppColors.darkSecondaryAccent,
    ctaFg: AppColors.darkBgPage,
    shadowBase: const Color(0xFF000000),
    headerStart: const Color(0xFF0B2925),
    headerEnd: const Color(0xFF000000),
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
    BentoTones? tones,
    Color? ctaBg,
    Color? ctaFg,
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
      tones: tones ?? this.tones,
      ctaBg: ctaBg ?? this.ctaBg,
      ctaFg: ctaFg ?? this.ctaFg,
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
      tones: BentoTones.lerp(tones, other.tones, t),
      ctaBg: Color.lerp(ctaBg, other.ctaBg, t) ?? ctaBg,
      ctaFg: Color.lerp(ctaFg, other.ctaFg, t) ?? ctaFg,
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
