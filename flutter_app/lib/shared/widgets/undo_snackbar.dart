import 'package:flutter/material.dart';

import '../../core/platform/feedback.dart';

import '../../l10n/l10n_ext.dart';
import '../theme/app_tokens.dart';
import '../theme/app_typography.dart';

class UndoSnackbar {
  static ScaffoldFeatureController<SnackBar, SnackBarClosedReason> show({
    required BuildContext context,
    required String message,
    required VoidCallback onUndo,
    Duration duration = const Duration(seconds: 5),
  }) {
    final tokens = context.tokens;

    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    return ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        duration: duration,
        persist: false, // snackbars with an action persist by default; the undo window must end
        behavior: SnackBarBehavior.floating,
        // Horizon: the navy hero toast with a light-blue Undo (mockup "Saved toast").
        backgroundColor: tokens.horizon ? tokens.heroMid : tokens.secondaryAccent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(tokens.horizon ? 14 : tokens.radiusMd)),
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        content: Text(
          message,
          style: TextStyle(
            fontFamily: tokens.horizon ? AppTypography.fontBody : null,
            color: Colors.white,
            fontSize: 14,
            fontWeight: tokens.horizon ? FontWeight.w600 : FontWeight.w500,
          ),
        ),
        action: SnackBarAction(
          label: tokens.horizon ? context.l10n.horizonUndo : 'UNDO',
          textColor: tokens.horizon ? const Color(0xFF9DB4FF) : tokens.primaryAccentLight,
          onPressed: () {
            AppFeedback.tap();
            onUndo();
          },
        ),
      ),
    );
  }
}
