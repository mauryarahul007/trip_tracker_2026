import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

class AppSwitch extends StatelessWidget {
  final bool value;
  final ValueChanged<bool> onChanged;
  final String? title;
  final String? subtitle;

  const AppSwitch({
    super.key,
    required this.value,
    required this.onChanged,
    this.title,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    final toggle = Switch.adaptive(
      value: value,
      onChanged: onChanged,
      activeThumbColor: tokens.primaryAccent,
      activeTrackColor: tokens.primaryAccent.withValues(alpha: 0.35),
      inactiveThumbColor: tokens.textMuted,
      inactiveTrackColor: tokens.borderColor,
    );

    if (title == null) return toggle;

    return InkWell(
      onTap: () => onChanged(!value),
      borderRadius: BorderRadius.circular(tokens.radiusMd),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title!,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: tokens.textPrimary,
                    ),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      subtitle!,
                      style: TextStyle(
                        fontSize: 13,
                        color: tokens.textSecondary,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            toggle,
          ],
        ),
      ),
    );
  }
}
