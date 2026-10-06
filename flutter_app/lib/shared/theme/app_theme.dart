import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app_tokens.dart';
import 'app_typography.dart';

class AppTheme {
  static ThemeData light() => lightTheme;
  static ThemeData dark() => darkTheme;
  static ThemeData amoled() => amoledTheme;

  static ThemeData get lightTheme {
    const tokens = AppTokens.light;
    final textTheme = AppTypography.createTextTheme(
      tokens.textPrimary,
      tokens.textSecondary,
      tokens.textMuted,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: tokens.bgPage,
      colorScheme: ColorScheme.light(
        primary: tokens.primaryAccent,
        secondary: tokens.secondaryAccent,
        surface: tokens.bgSurface,
        error: tokens.colorDanger,
      ),
      textTheme: textTheme,
      extensions: const [tokens],
      appBarTheme: AppBarTheme(
        backgroundColor: tokens.bgSurface,
        foregroundColor: tokens.textPrimary,
        elevation: 0,
        centerTitle: false,
        systemOverlayStyle: SystemUiOverlayStyle.dark,
      ),
      dividerTheme: DividerThemeData(
        color: tokens.borderColor,
        thickness: 1,
        space: 1,
      ),
    );
  }

  static ThemeData get darkTheme {
    const tokens = AppTokens.dark;
    final textTheme = AppTypography.createTextTheme(
      tokens.textPrimary,
      tokens.textSecondary,
      tokens.textMuted,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: tokens.bgPage,
      colorScheme: ColorScheme.dark(
        primary: tokens.primaryAccent,
        secondary: tokens.secondaryAccent,
        surface: tokens.bgSurface,
        error: tokens.colorDanger,
      ),
      textTheme: textTheme,
      extensions: const [tokens],
      appBarTheme: AppBarTheme(
        backgroundColor: tokens.bgSurface,
        foregroundColor: tokens.textPrimary,
        elevation: 0,
        centerTitle: false,
        systemOverlayStyle: SystemUiOverlayStyle.light,
      ),
      dividerTheme: DividerThemeData(
        color: tokens.borderColor,
        thickness: 1,
        space: 1,
      ),
    );
  }

  static ThemeData get amoledTheme {
    const tokens = AppTokens.amoled;
    final textTheme = AppTypography.createTextTheme(
      tokens.textPrimary,
      tokens.textSecondary,
      tokens.textMuted,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: tokens.bgPage,
      colorScheme: ColorScheme.dark(
        primary: tokens.primaryAccent,
        secondary: tokens.secondaryAccent,
        surface: tokens.bgSurface,
        error: tokens.colorDanger,
      ),
      textTheme: textTheme,
      extensions: const [tokens],
      appBarTheme: AppBarTheme(
        backgroundColor: tokens.bgSurface,
        foregroundColor: tokens.textPrimary,
        elevation: 0,
        centerTitle: false,
        systemOverlayStyle: SystemUiOverlayStyle.light,
      ),
      dividerTheme: DividerThemeData(
        color: tokens.borderColor,
        thickness: 1,
        space: 1,
      ),
    );
  }
}
