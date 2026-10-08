import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';
import '../theme/app_typography.dart';

class AppSheet extends StatelessWidget {
  final String? title;
  final Widget child;
  final Widget? trailing;

  const AppSheet({super.key, this.title, required this.child, this.trailing});

  static Future<T?> show<T>({
    required BuildContext context,
    required WidgetBuilder builder,
    String? title,
    bool isDismissible = true,
    bool enableDrag = true,
  }) {
    final tokens = context.tokens;

    return showModalBottomSheet<T>(
      context: context,
      isDismissible: isDismissible,
      enableDrag: enableDrag,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: Container(
          decoration: BoxDecoration(
            color: tokens.bgSurface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(tokens.radiusLg)),
            boxShadow: [
              BoxShadow(color: tokens.shadowBase.withValues(alpha: 0.22), blurRadius: 40, offset: const Offset(0, -10)),
            ],
          ),
          child: SafeArea(
            top: false,
            // Transparent Material so ListTile ink/background paints correctly on the sheet colour.
            child: Material(
              type: MaterialType.transparency,
              child: AppSheet(title: title, child: builder(ctx)),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Drag Handle
        Center(
          child: Container(
            margin: const EdgeInsets.only(top: 10, bottom: 8),
            width: 40,
            height: 4,
            decoration: BoxDecoration(color: tokens.borderColor, borderRadius: BorderRadius.circular(2)),
          ),
        ),
        if (title != null) ...[
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    title!,
                    style: TextStyle(
                      fontFamily: AppTypography.fontTitle,
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.3,
                      color: tokens.textPrimary,
                    ),
                  ),
                ),
                if (trailing != null)
                  trailing!
                else
                  IconButton(
                    tooltip: MaterialLocalizations.of(context).closeButtonTooltip,
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.of(context).pop(),
                    iconSize: 20,
                    color: tokens.textMuted,
                  ),
              ],
            ),
          ),
        ],
        Flexible(child: child),
      ],
    );
  }
}
