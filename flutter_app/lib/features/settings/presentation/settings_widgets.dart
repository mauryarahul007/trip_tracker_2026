import 'package:flutter/material.dart';

import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';

/// Tinted rounded icon tile shown at the start of a settings row (Horizon `.tile.sm`).
class SettingsIcon extends StatelessWidget {
  const SettingsIcon(this.icon, {this.color, super.key});

  final IconData icon;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = color ?? context.tokens.primaryAccent;
    return Container(
      width: 38,
      height: 38,
      decoration: BoxDecoration(color: c.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(13)),
      child: Icon(icon, size: 20, color: c),
    );
  }
}

class SettingsSection extends StatelessWidget {
  const SettingsSection({required this.title, required this.children, super.key});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 6),
            child: Text(
              title.toUpperCase(),
              style: TextStyle(
                fontFamily: AppTypography.fontMono,
                fontSize: 10.5,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.1,
                color: tokens.textMuted,
              ),
            ),
          ),
          // Material (not DecoratedBox) so the rows' ink ripples are visible on the card.
          Material(
            color: tokens.bgSurface,
            clipBehavior: Clip.antiAlias,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(tokens.radiusMd),
              side: BorderSide(color: tokens.borderColor),
            ),
            child: Column(children: children),
          ),
        ],
      ),
    );
  }
}

class SettingsTile extends StatelessWidget {
  const SettingsTile({
    required this.title,
    this.subtitle,
    this.trailing,
    this.onTap,
    this.danger = false,
    this.icon,
    this.iconColor,
    super.key,
  });

  /// Optional leading icon tile (red when [danger]).
  final IconData? icon;
  final Color? iconColor;
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return ListTile(
      minTileHeight: 48,
      onTap: onTap,
      leading: icon == null ? null : SettingsIcon(icon!, color: danger ? tokens.dangerColor : iconColor),
      title: Text(
        title,
        style: TextStyle(color: danger ? tokens.dangerColor : tokens.textPrimary, fontWeight: FontWeight.w600),
      ),
      subtitle: subtitle == null ? null : Text(subtitle!),
      trailing: trailing ?? (onTap == null ? null : const Icon(Icons.chevron_right_rounded)),
    );
  }
}

class SettingsSwitchTile extends StatelessWidget {
  const SettingsSwitchTile({
    required this.title,
    required this.value,
    required this.onChanged,
    this.subtitle,
    this.icon,
    this.iconColor,
    super.key,
  });

  final IconData? icon;
  final Color? iconColor;
  final String title;
  final String? subtitle;
  final bool value;
  final ValueChanged<bool>? onChanged;

  @override
  Widget build(BuildContext context) => SwitchListTile.adaptive(
    secondary: icon == null ? null : SettingsIcon(icon!, color: iconColor),
    title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
    subtitle: subtitle == null ? null : Text(subtitle!),
    value: value,
    onChanged: onChanged,
  );
}
