import 'package:flutter/material.dart';

/// Web-app palette (src/index.css on main): teal actions + orange accent on light, teal-on-charcoal in dark.
/// Night Sky (travel hero) is the web header teal; Ember (money), Slate (insights), Dusk (Wrapped) unchanged.
class AppColors {
  // Light Palette
  static const Color lightBgPage = Color(0xFFF4F5F7);
  static const Color lightBgApp = Color(0xFFFAFBFC);
  static const Color lightBgSurface = Color(0xFFFFFFFF);
  static const Color lightBgSurfaceHover = Color(0xFFF1F2F4);
  static const Color lightBorder = Color(0xFFE4E7EC);
  static const Color lightBorderFocus = Color(0x590F6F63);

  static const Color lightPrimaryAccent = Color(0xFF0F6F63);
  static const Color lightPrimaryAccentLight = Color(0xFF3FA396);
  static const Color lightSecondaryAccent = Color(0xFF16181D);
  static const Color lightSecondaryAccentLight = Color(0xFF3A3D44);
  static const Color accentOrange = Color(0xFFFF7A00); // warm / warning accent
  static const Color accentCyan = Color(0xFF2DD4E0);
  static const Color accentViolet = Color(0xFF8B3CF7);

  static const Color lightSuccess = Color(0xFF16A34A);
  static const Color lightDanger = Color(0xFFDC2626);
  static const Color lightWarning = Color(0xFFD97706);
  static const Color lightSuccessText = Color(0xFF12843C);
  static const Color lightWarningText = Color(0xFFAC5F05);

  static const Color lightTextPrimary = Color(0xFF16181D);
  static const Color lightTextSecondary = Color(0xFF55585E);
  static const Color lightTextMuted = Color(0xFF6B6E76); // AA on bgPage (design ink3 #9AA1AF is decorative only)

  // Dark Palette
  static const Color darkBgPage = Color(0xFF0D0E10);
  static const Color darkBgApp = Color(0xFF131417);
  static const Color darkBgSurface = Color(0xFF1A1C20);
  static const Color darkBgSurfaceHover = Color(0xFF22252A);
  static const Color darkBorder = Color(0xFF2A2D33);
  static const Color darkBorderFocus = Color(0x663FCBBD);

  static const Color darkPrimaryAccent = Color(0xFF3FCBBD);
  static const Color darkPrimaryAccentLight = Color(0xFF63D8CC);
  static const Color darkSecondaryAccent = Color(0xFFEDEEF0);
  static const Color darkSecondaryAccentLight = Color(0xFFFFFFFF);

  static const Color darkSuccess = Color(0xFF34D399);
  static const Color darkDanger = Color(0xFFF87171);
  static const Color darkWarning = Color(0xFFFBBF24);

  static const Color darkTextPrimary = Color(0xFFEDEEF0);
  static const Color darkTextSecondary = Color(0xFFA3A6AD);
  static const Color darkTextMuted = Color(0xFF8B8E96);

  // AMOLED Pure Black
  static const Color amoledBgPage = Color(0xFF000000);
  static const Color amoledBgApp = Color(0xFF000000);
  static const Color amoledBgSurface = Color(0xFF0A0C0E);
  static const Color amoledBgSurfaceHover = Color(0xFF12151A);
  static const Color amoledBorder = Color(0xFF1A1F26);

  // Context-surface gradients (top -> bottom stops)
  static const List<Color> nightSky = [Color(0xFF1F6E68), Color(0xFF0D2522), Color(0xFF041210)];
  static const List<Color> ember = [Color(0xFF7E4529), Color(0xFF2C1810), Color(0xFF0C0706)];
  static const List<Color> slate = [Color(0xFF2D4759), Color(0xFF0F161B), Color(0xFF05080A)];
  static const List<Color> dusk = [Color(0xFF4B50AA), Color(0xFF8A68B6), Color(0xFF2B3080), Color(0xFF0F1446)];
}
