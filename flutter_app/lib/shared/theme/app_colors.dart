import 'package:flutter/material.dart';

/// Bento palette (design direction C): a soft green-grey ground, white surfaces, teal actions, ink text and five
/// pastel tiles (see BentoTones in app_tokens.dart). Dark and AMOLED keep the same logic with deep tinted tiles.
/// Night Sky (travel hero), Ember (money), Slate (insights) and Dusk (Wrapped) stay for the dark hero surfaces.
class AppColors {
  // Light Palette
  static const Color lightBgPage = Color(0xFFF2F4EF);
  static const Color lightBgApp = Color(0xFFF2F4EF);
  static const Color lightBgSurface = Color(0xFFFFFFFF);
  static const Color lightBgSurfaceHover = Color(0xFFE8ECE4);
  static const Color lightBorder = Color(0xFFDFE5DB);
  static const Color lightBorderFocus = Color(0x590F6F63);

  static const Color lightPrimaryAccent = Color(0xFF0F6F63);
  static const Color lightPrimaryAccentLight = Color(0xFF3FA396);
  static const Color lightSecondaryAccent = Color(0xFF14201C);
  static const Color lightSecondaryAccentLight = Color(0xFF3A3D44);
  static const Color accentOrange = Color(0xFFFF7A00); // warm / warning accent
  static const Color accentCyan = Color(0xFF2DD4E0);
  static const Color accentViolet = Color(0xFF8B3CF7);

  static const Color lightSuccess = Color(0xFF16A34A);
  static const Color lightDanger = Color(0xFFDC2626);
  static const Color lightWarning = Color(0xFFD97706);
  static const Color lightSuccessText = Color(0xFF12843C);
  static const Color lightWarningText = Color(0xFFAC5F05);

  static const Color lightTextPrimary = Color(0xFF14201C);
  static const Color lightTextSecondary = Color(0xFF4A5A54);
  static const Color lightTextMuted = Color(0xFF5A6A64); // AA on bgPage (design ink3 #9AA1AF is decorative only)

  // Dark Palette
  static const Color darkBgPage = Color(0xFF0E1412);
  static const Color darkBgApp = Color(0xFF101714);
  static const Color darkBgSurface = Color(0xFF1A2320);
  static const Color darkBgSurfaceHover = Color(0xFF222D29);
  static const Color darkBorder = Color(0xFF2A3732);
  static const Color darkBorderFocus = Color(0x663FCBBD);

  static const Color darkPrimaryAccent = Color(0xFF3FCBBD);
  static const Color darkPrimaryAccentLight = Color(0xFF63D8CC);
  static const Color darkSecondaryAccent = Color(0xFFEAF2EE);
  static const Color darkSecondaryAccentLight = Color(0xFFFFFFFF);

  static const Color darkSuccess = Color(0xFF34D399);
  static const Color darkDanger = Color(0xFFF87171);
  static const Color darkWarning = Color(0xFFFBBF24);

  static const Color darkTextPrimary = Color(0xFFEAF2EE);
  static const Color darkTextSecondary = Color(0xFFA7B8B1);
  static const Color darkTextMuted = Color(0xFF8FA39B);

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
  static const List<Color> tileMint = [Color(0xFFCFEFE3), Color(0xFF2B6B5A)];
  static const List<Color> tileButter = [Color(0xFFFFE9A8), Color(0xFF7A5B00)];
  static const List<Color> tilePeach = [Color(0xFFFFD3BA), Color(0xFF9A4A22)];
  static const List<Color> tileSky = [Color(0xFFCFE6F7), Color(0xFF2F5F86)];
  static const List<Color> tileLilac = [Color(0xFFE3D9F8), Color(0xFF5B3FA8)];
  static const List<Color> darkTileMint = [Color(0xFF17332C), Color(0xFF7FD6BC)];
  static const List<Color> darkTileButter = [Color(0xFF3A3216), Color(0xFFE8C65A)];
  static const List<Color> darkTilePeach = [Color(0xFF3C2418), Color(0xFFFFA877)];
  static const List<Color> darkTileSky = [Color(0xFF172E3E), Color(0xFF8EC4F0)];
  static const List<Color> darkTileLilac = [Color(0xFF2A2340), Color(0xFFB9A2F5)];
  static const List<Color> amoledTileMint = [Color(0xFF0F211C), Color(0xFF7FD6BC)];
  static const List<Color> amoledTileButter = [Color(0xFF262010), Color(0xFFE8C65A)];
  static const List<Color> amoledTilePeach = [Color(0xFF281810), Color(0xFFFFA877)];
  static const List<Color> amoledTileSky = [Color(0xFF0F1E29), Color(0xFF8EC4F0)];
  static const List<Color> amoledTileLilac = [Color(0xFF1B1629), Color(0xFFB9A2F5)];
}
