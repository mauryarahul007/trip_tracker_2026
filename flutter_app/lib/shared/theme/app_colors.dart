import 'package:flutter/material.dart';

/// App color palettes strictly mirrored from `src/index.css`.
class AppColors {
  // Light Palette
  static const Color lightBgPage = Color(0xFFF4F5F7);
  static const Color lightBgApp = Color(0xFFFAFBFC);
  static const Color lightBgSurface = Color(0xFFFFFFFF);
  static const Color lightBgSurfaceHover = Color(0xFFF1F2F4);
  static const Color lightBorder = Color(0xFFE4E7EC);
  static const Color lightBorderFocus = Color(
    0x590F6F63,
  ); // rgba(15, 111, 99, 0.35)

  static const Color lightPrimaryAccent = Color(0xFF0F6F63);
  static const Color lightPrimaryAccentLight = Color(0xFF3FA396);
  static const Color lightSecondaryAccent = Color(0xFF16181D);
  static const Color lightSecondaryAccentLight = Color(0xFF3A3D44);
  static const Color accentOrange = Color(0xFFFF7A00);

  static const Color lightSuccess = Color(0xFF16A34A);
  static const Color lightDanger = Color(0xFFDC2626);
  static const Color lightWarning = Color(0xFFD97706);
  static const Color lightSuccessText = Color(0xFF12843C);
  static const Color lightWarningText = Color(0xFFAC5F05);

  static const Color lightTextPrimary = Color(0xFF16181D);
  static const Color lightTextSecondary = Color(0xFF55585E);
  static const Color lightTextMuted = Color(0xFF6B6E76);

  // Dark Palette ("Night flight")
  static const Color darkBgPage = Color(0xFF0D0E10);
  static const Color darkBgApp = Color(0xFF131417);
  static const Color darkBgSurface = Color(0xFF1A1C20);
  static const Color darkBgSurfaceHover = Color(0xFF22252A);
  static const Color darkBorder = Color(0xFF2A2D33);
  static const Color darkBorderFocus = Color(
    0x663FCBBD,
  ); // rgba(63, 203, 189, 0.4)

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
  static const Color amoledBgSurface = Color(0xFF080809);
  static const Color amoledBgSurfaceHover = Color(0xFF121214);
  static const Color amoledBorder = Color(0xFF1C1C1F);
}
