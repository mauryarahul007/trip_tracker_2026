import 'package:flutter/material.dart';

/// "Horizon" palette (design/new-app-ui/kit.css). Cobalt-blue actions; Night Sky (travel),
/// Ember (money), Slate (insights) and Dusk (dark / Wrapped) context surfaces.
class AppColors {
  // Light Palette
  static const Color lightBgPage = Color(0xFFF1F2F5);
  static const Color lightBgApp = Color(0xFFF6F7F9);
  static const Color lightBgSurface = Color(0xFFFFFFFF);
  static const Color lightBgSurfaceHover = Color(0xFFF6F7F9);
  static const Color lightBorder = Color(0xFFE6E8EE);
  static const Color lightBorderFocus = Color(0x592559E6);

  static const Color lightPrimaryAccent = Color(0xFF2559E6);
  static const Color lightPrimaryAccentLight = Color(0xFF6A7CFF);
  static const Color lightSecondaryAccent = Color(0xFF0B0F1A);
  static const Color lightSecondaryAccentLight = Color(0xFF3A4152);
  static const Color accentOrange = Color(0xFFE8890C); // warm / warning accent
  static const Color accentCyan = Color(0xFF2DD4E0);
  static const Color accentViolet = Color(0xFF8B3CF7);

  static const Color lightSuccess = Color(0xFF16A34A);
  static const Color lightDanger = Color(0xFFCF2F35);
  static const Color lightWarning = Color(0xFFE8890C);
  static const Color lightSuccessText = Color(0xFF12843C);
  static const Color lightWarningText = Color(0xFFAC5F05);

  static const Color lightTextPrimary = Color(0xFF0B0F1A);
  static const Color lightTextSecondary = Color(0xFF5A6173);
  static const Color lightTextMuted = Color(0xFF626A7C); // AA on bgPage (design ink3 #9AA1AF is decorative only)

  // Dark Palette
  static const Color darkBgPage = Color(0xFF080B12);
  static const Color darkBgApp = Color(0xFF0C101A);
  static const Color darkBgSurface = Color(0xFF121826);
  static const Color darkBgSurfaceHover = Color(0xFF1A2132);
  static const Color darkBorder = Color(0xFF232B3C);
  static const Color darkBorderFocus = Color(0x665C8DFF);

  static const Color darkPrimaryAccent = Color(0xFF5C8DFF);
  static const Color darkPrimaryAccentLight = Color(0xFF8FB0FF);
  static const Color darkSecondaryAccent = Color(0xFFF3F5FA);
  static const Color darkSecondaryAccentLight = Color(0xFFFFFFFF);

  static const Color darkSuccess = Color(0xFF4ADE80);
  static const Color darkDanger = Color(0xFFFF7276);
  static const Color darkWarning = Color(0xFFFBBF24);

  static const Color darkTextPrimary = Color(0xFFF3F5FA);
  static const Color darkTextSecondary = Color(0xFFA3ABBC);
  static const Color darkTextMuted = Color(0xFF8790A3);

  // AMOLED Pure Black
  static const Color amoledBgPage = Color(0xFF000000);
  static const Color amoledBgApp = Color(0xFF000000);
  static const Color amoledBgSurface = Color(0xFF080A0F);
  static const Color amoledBgSurfaceHover = Color(0xFF12151C);
  static const Color amoledBorder = Color(0xFF1C2029);

  // Context-surface gradients (top -> bottom stops)
  static const List<Color> nightSky = [Color(0xFF17354F), Color(0xFF0A121C), Color(0xFF010203)];
  static const List<Color> ember = [Color(0xFF7E4529), Color(0xFF2C1810), Color(0xFF0C0706)];
  static const List<Color> slate = [Color(0xFF2D4759), Color(0xFF0F161B), Color(0xFF05080A)];
  static const List<Color> dusk = [Color(0xFF4B50AA), Color(0xFF8A68B6), Color(0xFF2B3080), Color(0xFF0F1446)];
}
