import 'package:flutter/material.dart';

import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/section_label.dart';

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
            child: Text(title.toUpperCase(), style: sectionLabelStyle(context)),
          ),
          // Material (not DecoratedBox) so the rows' ink ripples are visible on the card.
          Material(
            color: tokens.bgSurface,
            clipBehavior: Clip.antiAlias,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(tokens.radiusMd)),
            child: Column(
              children: [
                for (var i = 0; i < children.length; i++) ...[
                  if (i > 0) Divider(height: 1, indent: 68, color: tokens.borderColor.withValues(alpha: 0.6)),
                  children[i],
                ],
              ],
            ),
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
    super.key,
  });

  /// Optional leading icon tile (red when [danger]).
  final IconData? icon;
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
      leading: icon == null ? null : SettingsIcon(icon!, color: danger ? tokens.dangerColor : null),
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
    super.key,
  });

  final IconData? icon;
  final String title;
  final String? subtitle;
  final bool value;
  final ValueChanged<bool>? onChanged;

  @override
  Widget build(BuildContext context) => SwitchListTile.adaptive(
    secondary: icon == null ? null : SettingsIcon(icon!),
    title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
    subtitle: subtitle == null ? null : Text(subtitle!),
    value: value,
    onChanged: onChanged,
  );
}

/// Row with a title/subtitle on the left and a compact segmented control on the right (web `Appearance` / `Haptics`).
class SettingsSegmentedTile<T> extends StatelessWidget {
  const SettingsSegmentedTile({
    required this.title,
    required this.options,
    required this.value,
    required this.onChanged,
    this.subtitle,
    this.icon,
    super.key,
  });

  final IconData? icon;
  final String title;
  final String? subtitle;

  /// Value, label (null for icon-only), icon (null for text-only).
  final List<(T, String?, IconData?)> options;
  final T value;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          if (icon != null) ...[SettingsIcon(icon!), const SizedBox(width: 14)],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                if (subtitle != null) Text(subtitle!, style: TextStyle(color: t.textSecondary, fontSize: 13)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.all(2),
            decoration: BoxDecoration(color: t.bgSurfaceHover, borderRadius: BorderRadius.circular(14)),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (final o in options)
                  Semantics(
                    button: true,
                    selected: o.$1 == value,
                    label: o.$2 ?? '',
                    child: InkWell(
                      key: Key('segment-${o.$1 is Enum ? (o.$1 as Enum).name : o.$1}'),
                      borderRadius: BorderRadius.circular(9),
                      onTap: () => onChanged(o.$1),
                      child: Container(
                        constraints: const BoxConstraints(minWidth: 48, minHeight: 48), // 48dp tap target
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: o.$1 == value ? t.bgSurface : Colors.transparent,
                          borderRadius: BorderRadius.circular(9),
                          border: o.$1 == value ? Border.all(color: t.primaryAccent.withValues(alpha: 0.5)) : null,
                        ),
                        child: o.$3 != null
                            ? Icon(o.$3, size: 18, color: o.$1 == value ? t.primaryAccent : t.textSecondary)
                            : Text(
                                o.$2 ?? '',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: o.$1 == value ? FontWeight.w700 : FontWeight.w500,
                                  color: o.$1 == value ? t.primaryAccent : t.textSecondary,
                                ),
                              ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Small pill shown at the right of a row (web "3.5 MB" badge).
class SettingsBadge extends StatelessWidget {
  const SettingsBadge(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: t.primaryAccent.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(99),
      ),
      child: Text(
        text,
        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: t.primaryAccent),
      ),
    );
  }
}
