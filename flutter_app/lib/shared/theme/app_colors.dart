import 'package:flutter/material.dart';

/// Calm Passport palette, the one app theme: paper ground, white surfaces, one teal action, ink text, a night hero,
/// a runway-orange accent and five pastel tiles (see BentoTones in app_tokens.dart).
/// Night Sky (travel hero), Ember (money), Slate (insights) and Dusk (Wrapped) stay for the dark hero surfaces.
class AppColors {
  static const Color accentOrange = Color(0xFFFF7A00); // warm / warning accent
  static const Color accentCyan = Color(0xFF2DD4E0);
  static const Color accentViolet = Color(0xFF8B3CF7);

  // Hero surfaces that are dark in every theme (trip headers, cover washes, wrapped).
  static const Color heroNavy = calmNight;
  static const Color heroNavyDeep = calmNightDeep;
  static const Color heroTeal = calmTeal;
  // Budget "getting close" amber: the same in every theme, between success and danger.
  static const Color budgetWarn = Color(0xFFE8890C);

  static const Color darkWarning = Color(0xFFFBBF24);

  // AMOLED Pure Black
  static const Color amoledBgPage = Color(0xFF000000);
  static const Color amoledBgApp = Color(0xFF000000);
  static const Color amoledBgSurface = Color(0xFF0A0F0D);
  static const Color amoledBgSurfaceHover = Color(0xFF121916);
  static const Color amoledBorder = Color(0xFF1B2420);

  // Context-surface gradients (top -> bottom stops)
  static const List<Color> nightSky = [Color(0xFF22332D), Color(0xFF14201C), Color(0xFF0B1411)];
  static const List<Color> ember = [Color(0xFF7E4529), Color(0xFF2C1810), Color(0xFF0C0706)];
  static const List<Color> slate = [Color(0xFF2D4759), Color(0xFF0F161B), Color(0xFF05080A)];
  static const List<Color> dusk = [Color(0xFF4B50AA), Color(0xFF8A68B6), Color(0xFF2B3080), Color(0xFF0F1446)];

  // Bento tiles: [background, label accent]. Accents are >= 4.5:1 on their own tile (checked by the a11y test).
  static const List<Color> amoledTileMint = [Color(0xFF0F211C), Color(0xFF7FD6BC)];
  static const List<Color> amoledTileButter = [Color(0xFF262010), Color(0xFFE8C65A)];
  static const List<Color> amoledTilePeach = [Color(0xFF281810), Color(0xFFFFA877)];
  static const List<Color> amoledTileSky = [Color(0xFF0F1E29), Color(0xFF8EC4F0)];
  static const List<Color> amoledTileLilac = [Color(0xFF1B1629), Color(0xFFB9A2F5)];

  // Calm Passport (flag `enableCalmPassportUi`): paper ground, one teal action, night hero, runway accent.
  // Owe / owed always travel with a sign and an arrow, never colour alone.
  static const Color calmPaper = Color(0xFFF4F3EE);
  static const Color calmPaperHover = Color(0xFFEDEDE5);
  static const Color calmLine = Color(0xFFE3E3DA);
  static const Color calmInk = Color(0xFF14201C);
  static const Color calmInk2 = Color(0xFF3F4D48);
  static const Color calmMute = Color(0xFF5E6B66);
  static const Color calmTeal = Color(0xFF0E6B5E);
  static const Color calmTealLight = Color(0xFF3FA396);
  static const Color calmNight = Color(0xFF0F1F1B);
  static const Color calmNightDeep = Color(0xFF0A1512);
  static const Color calmRunway = Color(0xFFF26B2A);
  static const Color calmRunwayDeep = Color(0xFFC2410C); // runway as a button fill under white text (5.2:1)
  static const Color calmRunwayDark = Color(0xFFFF8A57); // runway on dark grounds
  static const Color calmOwe = Color(0xFFB23A24);
  static const Color calmOwed = Color(0xFF11733F);
  static const Color calmWarn = Color(0xFFAC5F05);

  static const Color calmDarkGround = Color(0xFF0D1311);
  static const Color calmDarkSurface = Color(0xFF17201D);
  static const Color calmDarkHover = Color(0xFF1F2A26);
  static const Color calmDarkLine = Color(0xFF26322E);
  static const Color calmDarkInk = Color(0xFFECF3EF);
  static const Color calmDarkMute = Color(0xFFA9BAB3);
  static const Color calmDarkTeal = Color(0xFF4FD1C1);
  static const Color calmDarkTealLight = Color(0xFF7DDDD1);
  static const Color calmDarkOwe = Color(0xFFFF8A75);
  static const Color calmDarkOwed = Color(0xFF4ADE9A);

  static const List<Color> calmTileMint = [Color(0xFFD6F0E6), Color(0xFF1F5E4E)];
  static const List<Color> calmTileButter = [Color(0xFFFFEDB3), Color(0xFF6E5200)];
  static const List<Color> calmTilePeach = [Color(0xFFFFDCC8), Color(0xFF8A3F1C)];
  static const List<Color> calmTileSky = [Color(0xFFD6E8F6), Color(0xFF285A80)];
  static const List<Color> calmTileLilac = [Color(0xFFE7DEF8), Color(0xFF553A9E)];
  static const List<Color> calmDarkTileMint = [Color(0xFF17332C), Color(0xFF7FD6BC)];
  static const List<Color> calmDarkTileButter = [Color(0xFF3A3214), Color(0xFFF2D27A)];
  static const List<Color> calmDarkTilePeach = [Color(0xFF3D2418), Color(0xFFF5A882)];
  static const List<Color> calmDarkTileSky = [Color(0xFF1A2C3D), Color(0xFF9CC8EC)];
  static const List<Color> calmDarkTileLilac = [Color(0xFF2A2340), Color(0xFFC3AEF5)];

  // Horizon (flag `enableHorizonUi`): cool grey ground, one Horizon blue action, sunset accent, night-navy hero.
  // Owe / owed keep a sign and an arrow, never colour alone.
  static const Color horizonGround = Color(0xFFF5F6FA);
  static const Color horizonSurface2 = Color(0xFFEDF0F7);
  static const Color horizonLine = Color(0xFFE1E5EE);
  static const Color horizonInk = Color(0xFF131A2E);
  static const Color horizonInk2 = Color(0xFF3D4663);
  static const Color horizonMute = Color(0xFF687089);
  static const Color horizonBlue = Color(0xFF2950E8); // white text 6.2:1
  static const Color horizonBlueTint = Color(0xFFE8EEFF);
  static const Color horizonBlueInk = Color(0xFF1F3FBF);
  static const Color horizonSunset = Color(0xFFFF7A45); // fills and badges only, never small text
  static const Color horizonSunsetTint = Color(0xFFFFEDE4);
  static const Color horizonSunsetInk = Color(0xFFA3400F);
  static const Color horizonHero = Color(0xFF14204A);
  static const Color horizonHero2 = Color(0xFF1E2F6E);
  static const Color horizonOwed = Color(0xFF0E7A43);
  static const Color horizonOwe = Color(0xFFC62F2A);
  static const Color horizonWarn = Color(0xFF9A5300);

  static const Color horizonDarkGround = Color(0xFF0A0E1A);
  static const Color horizonDarkSurface = Color(0xFF131A2B);
  static const Color horizonDarkSurface2 = Color(0xFF1B2338);
  static const Color horizonDarkLine = Color(0xFF26304A);
  static const Color horizonDarkInk = Color(0xFFEEF1FA);
  static const Color horizonDarkInk2 = Color(0xFFC3CADC);
  static const Color horizonDarkMute = Color(0xFF8C96B0);
  static const Color horizonDarkBlue = Color(0xFF7D9BFF); // dark ink text on it 7.3:1
  static const Color horizonDarkBlueTint = Color(0xFF1E2A55);
  static const Color horizonDarkBlueInk = Color(0xFFA9BCFF);
  static const Color horizonDarkSunset = Color(0xFFFF9466);
  static const Color horizonDarkHero = Color(0xFF0F1736);
  static const Color horizonDarkOwed = Color(0xFF3FD68C);
  static const Color horizonDarkOwe = Color(0xFFFF7B73);
  static const Color horizonDarkWarn = Color(0xFFF5B544);

  // Horizon category tints [tile, icon]: mint = transport, butter = shopping, peach = food, sky = stay, lilac = fun.
  static const List<Color> horizonTileMint = [Color(0xFFD9F3EE), Color(0xFF11685A)];
  static const List<Color> horizonTileButter = [Color(0xFFFFF2C2), Color(0xFF7A5800)];
  static const List<Color> horizonTilePeach = [Color(0xFFFFE7D6), Color(0xFF9A3E12)];
  static const List<Color> horizonTileSky = [Color(0xFFE3E9FF), Color(0xFF2D45A8)];
  static const List<Color> horizonTileLilac = [Color(0xFFF1E4FF), Color(0xFF6B3AA8)];
  static const List<Color> horizonDarkTileMint = [Color(0xFF0F302B), Color(0xFF6FDCC6)];
  static const List<Color> horizonDarkTileButter = [Color(0xFF352B0E), Color(0xFFF2CF62)];
  static const List<Color> horizonDarkTilePeach = [Color(0xFF3A2416), Color(0xFFFFB48F)];
  static const List<Color> horizonDarkTileSky = [Color(0xFF1E2A55), Color(0xFFA9BCFF)];
  static const List<Color> horizonDarkTileLilac = [Color(0xFF2C1F45), Color(0xFFCDB0FF)];
}
