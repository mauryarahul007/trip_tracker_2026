import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';
import 'app_button.dart';

class ConfirmDialog extends StatelessWidget {
  final String title;
  final String message;
  final String confirmLabel;
  final String cancelLabel;
  final bool isDestructive;

  const ConfirmDialog({
    super.key,
    required this.title,
    required this.message,
    this.confirmLabel = 'Confirm',
    this.cancelLabel = 'Cancel',
    this.isDestructive = false,
  });

  static Future<bool> show({
    required BuildContext context,
    required String title,
    required String message,
    String confirmLabel = 'Confirm',
    String cancelLabel = 'Cancel',
    bool isDestructive = false,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => ConfirmDialog(
        title: title,
        message: message,
        confirmLabel: confirmLabel,
        cancelLabel: cancelLabel,
        isDestructive: isDestructive,
      ),
    );
    return result ?? false;
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    return Dialog(
      backgroundColor: tokens.bgSurface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(tokens.radiusLg)),
      // Scrolls: at 200% text on a small phone the content is taller than the screen.
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyle(fontSize: 19, fontWeight: FontWeight.w700, color: tokens.textPrimary),
            ),
            const SizedBox(height: 12),
            Text(message, style: TextStyle(fontSize: 15, height: 1.4, color: tokens.textSecondary)),
            const SizedBox(height: 24),
            // Wrap, not Row: long labels or large text must flow onto a second line.
            Wrap(
              alignment: WrapAlignment.end,
              spacing: 8,
              runSpacing: 8,
              children: [
                AppButton(
                  label: cancelLabel,
                  variant: AppButtonVariant.ghost,
                  onPressed: () => Navigator.of(context).pop(false),
                ),
                AppButton(
                  label: confirmLabel,
                  variant: isDestructive ? AppButtonVariant.danger : AppButtonVariant.primary,
                  onPressed: () => Navigator.of(context).pop(true),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
