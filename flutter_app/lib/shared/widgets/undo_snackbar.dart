import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

class UndoSnackbar {
  static void show({
    required BuildContext context,
    required String message,
    required VoidCallback onUndo,
    Duration duration = const Duration(seconds: 5),
  }) {
    final tokens = context.tokens;

    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        duration: duration,
        behavior: SnackBarBehavior.floating,
        backgroundColor: tokens.secondaryAccent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(tokens.radiusMd),
        ),
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        content: Text(
          message,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
        action: SnackBarAction(
          label: 'UNDO',
          textColor: tokens.primaryAccentLight,
          onPressed: onUndo,
        ),
      ),
    );
  }
}
