import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_tokens.dart';
import '../theme/compass.dart';

class AppNavItem {
  const AppNavItem({required this.icon, required this.label, this.badge = false, this.badgeKey});

  final IconData icon;
  final String label;

  /// Shows a small dot on the icon (e.g. unread chat).
  final bool badge;
  final Key? badgeKey;
}

/// Bento bottom navigation: a floating white pill; the selected item grows a lilac pill with its label,
/// the others show only their icon, and the optional centre action is an ink circle. [forceDock]: false
/// selects the plain Material 3 [NavigationBar] (tests and previews).
class AppBottomNav extends StatelessWidget {
  const AppBottomNav({
    required this.items,
    required this.currentIndex,
    required this.onTap,
    this.forceDock,
    this.centerAction,
    this.centerLabel,
    this.compass = false,
    this.centerExtended = false,
    super.key,
  });

  final List<AppNavItem> items;
  final int currentIndex;
  final ValueChanged<int> onTap;
  final bool? forceDock;

  /// Compass look (flag `enableCompassNav`): every item shows its label, the selected one is teal with a top bar,
  /// and the centre action is the orange Add button.
  final bool compass;

  /// Round button between the two halves of the dock.
  final VoidCallback? centerAction;
  final String? centerLabel;

  /// Calm Passport only: the floating action shows [centerLabel] beside the "+" (Trips home "New trip").
  final bool centerExtended;

  /// The Bento pill is used on every platform.
  static bool get dockByDefault => true;

  bool get _useDock => forceDock ?? dockByDefault;

  @override
  Widget build(BuildContext context) {
    // Calm Passport theme (flag `enableCalmPassportUi`) wins over the Compass and Bento docks.
    if (context.tokens.calm && _useDock) {
      return _CalmDock(
        items: items,
        currentIndex: currentIndex,
        onTap: onTap,
        action: centerAction,
        actionLabel: centerLabel,
        actionExtended: centerExtended,
      );
    }
    if (compass && _useDock) {
      return _CompassDock(
        items: items,
        currentIndex: currentIndex,
        onTap: onTap,
        centerAction: centerAction,
        centerLabel: centerLabel,
      );
    }
    return _useDock
        ? _Dock(
            items: items,
            currentIndex: currentIndex,
            onTap: onTap,
            centerAction: centerAction,
            centerLabel: centerLabel,
          )
        : _M3Bar(this);
  }
}

Widget _icon(AppNavItem it, {Color? color}) {
  final icon = Icon(it.icon, color: color);
  return it.badge ? Badge(key: it.badgeKey, child: icon) : icon;
}

class _M3Bar extends StatelessWidget {
  const _M3Bar(this.nav);
  final AppBottomNav nav;

  @override
  Widget build(BuildContext context) {
    return NavigationBar(
      selectedIndex: nav.currentIndex,
      onDestinationSelected: nav.onTap,
      destinations: [for (final it in nav.items) NavigationDestination(icon: _icon(it), label: it.label)],
    );
  }
}

/// Compass dock: floating pill, labels always visible, orange raised centre button.
class _CompassDock extends StatelessWidget {
  const _CompassDock({
    required this.items,
    required this.currentIndex,
    required this.onTap,
    this.centerAction,
    this.centerLabel,
  });

  final List<AppNavItem> items;
  final int currentIndex;
  final ValueChanged<int> onTap;
  final VoidCallback? centerAction;
  final String? centerLabel;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
        child: DecoratedBox(
          key: const Key('compass-dock'),
          decoration: BoxDecoration(
            color: t.bgSurface,
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: t.borderColor),
            boxShadow: t.shadowLg,
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
            child: Row(
              children: [
                for (var i = 0; i < items.length; i++) ...[
                  if (centerAction != null && i == items.length ~/ 2)
                    Semantics(
                      button: true,
                      label: centerLabel,
                      child: InkWell(
                        key: const Key('dock-center'),
                        onTap: centerAction,
                        borderRadius: BorderRadius.circular(20),
                        child: Container(
                          width: 52,
                          height: 52,
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          decoration: BoxDecoration(color: t.sun, borderRadius: BorderRadius.circular(20)),
                          child: Icon(Icons.add_rounded, color: t.onSun, size: 28),
                        ),
                      ),
                    ),
                  Expanded(
                    child: _CompassItem(item: items[i], selected: i == currentIndex, onTap: () => onTap(i)),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CompassItem extends StatelessWidget {
  const _CompassItem({required this.item, required this.selected, required this.onTap});

  final AppNavItem item;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final color = selected ? t.primaryAccent : t.textMuted;
    return Semantics(
      button: true,
      selected: selected,
      label: item.label,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 52),
          child: ExcludeSemantics(
            child: Column(
              mainAxisSize:
                  MainAxisSize.min, // the dock sits in a loose-height slot: a max column would fill the screen
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                AnimatedContainer(
                  duration: t.durationNormal,
                  width: selected ? 22 : 0,
                  height: 3,
                  margin: const EdgeInsets.only(bottom: 3),
                  decoration: BoxDecoration(color: t.primaryAccent, borderRadius: BorderRadius.circular(3)),
                ),
                IconTheme(
                  data: IconThemeData(color: color, size: 22),
                  child: _icon(item, color: color),
                ),
                const SizedBox(height: 2),
                Text(
                  item.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Calm Passport dock: a dark floating bar where every item keeps its label and the selected one sits on a teal
/// pill. The screen's one primary action floats above the bar's right end (ink "+" in light, teal in dark).
class _CalmDock extends StatelessWidget {
  const _CalmDock({
    required this.items,
    required this.currentIndex,
    required this.onTap,
    this.action,
    this.actionLabel,
    this.actionExtended = false,
  });

  final List<AppNavItem> items;
  final int currentIndex;
  final ValueChanged<int> onTap;
  final VoidCallback? action;
  final String? actionLabel;
  final bool actionExtended;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final barBg = dark ? t.bgSurface : AppColors.calmInk;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            if (action != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: _CalmAction(label: actionLabel, extended: actionExtended, onTap: action!),
              ),
            DecoratedBox(
              key: const Key('calm-dock'),
              decoration: BoxDecoration(
                color: barBg,
                borderRadius: BorderRadius.circular(26),
                border: dark ? Border.all(color: t.borderColor) : null,
                boxShadow: t.shadowLg,
              ),
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Row(
                  children: [
                    for (var i = 0; i < items.length; i++)
                      Expanded(
                        child: _CalmItem(item: items[i], selected: i == currentIndex, onTap: () => onTap(i)),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CalmAction extends StatelessWidget {
  const _CalmAction({required this.onTap, required this.extended, this.label});

  final VoidCallback onTap;
  final bool extended;
  final String? label;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final showLabel = extended && label != null;
    return Semantics(
      button: true,
      label: label,
      child: Material(
        color: t.ctaBg,
        elevation: 6,
        shadowColor: t.shadowBase.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          key: const Key('dock-center'),
          onTap: onTap,
          borderRadius: BorderRadius.circular(20),
          child: SizedBox(
            height: 60,
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: showLabel ? 22 : 18),
              child: ExcludeSemantics(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.add_rounded, color: t.ctaFg, size: 28),
                    if (showLabel) ...[
                      const SizedBox(width: 8),
                      Text(
                        label!,
                        style: TextStyle(color: t.ctaFg, fontSize: 16, fontWeight: FontWeight.w700),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _CalmItem extends StatelessWidget {
  const _CalmItem({required this.item, required this.selected, required this.onTap});

  final AppNavItem item;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    const teal = AppColors.calmDarkTeal;
    const ink = AppColors.calmInk;
    const color0 = AppColors.calmDarkMute;
    final color = selected ? ink : color0;
    return Semantics(
      button: true,
      selected: selected,
      label: item.label,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: AnimatedContainer(
          duration: t.durationNormal,
          curve: t.easeSpring,
          constraints: const BoxConstraints(minHeight: 52),
          margin: const EdgeInsets.symmetric(horizontal: 2),
          decoration: BoxDecoration(
            color: selected ? teal : Colors.transparent,
            borderRadius: BorderRadius.circular(18),
          ),
          child: ExcludeSemantics(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconTheme(
                  data: IconThemeData(color: color, size: 22),
                  child: _icon(item, color: color),
                ),
                const SizedBox(height: 3),
                Text(
                  item.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                    color: color,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Dock extends StatelessWidget {
  const _Dock({
    required this.items,
    required this.currentIndex,
    required this.onTap,
    this.centerAction,
    this.centerLabel,
  });

  final List<AppNavItem> items;
  final int currentIndex;
  final ValueChanged<int> onTap;
  final VoidCallback? centerAction;
  final String? centerLabel;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
        child: DecoratedBox(
          decoration: BoxDecoration(color: t.bgSurface, borderRadius: BorderRadius.circular(36), boxShadow: t.shadowLg),
          child: Padding(
            padding: const EdgeInsets.all(8),
            child: Row(
              children: [
                for (var i = 0; i < items.length; i++) ...[
                  if (centerAction != null && i == items.length ~/ 2)
                    _DockCenter(label: centerLabel, onTap: centerAction!),
                  Expanded(
                    flex: i == currentIndex ? 2 : 1,
                    child: _DockItem(item: items[i], selected: i == currentIndex, onTap: () => onTap(i)),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DockCenter extends StatelessWidget {
  const _DockCenter({required this.onTap, this.label});

  final VoidCallback onTap;
  final String? label;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Semantics(
      button: true,
      label: label,
      child: InkWell(
        key: const Key('dock-center'),
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: Container(
          width: 54,
          height: 54,
          margin: const EdgeInsets.symmetric(horizontal: 4),
          decoration: BoxDecoration(shape: BoxShape.circle, color: t.ctaBg),
          child: Icon(Icons.add_rounded, color: t.ctaFg, size: 28),
        ),
      ),
    );
  }
}

class _DockItem extends StatelessWidget {
  const _DockItem({required this.item, required this.selected, required this.onTap});

  final AppNavItem item;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final lilac = t.tones.lilac;
    // Ink on the lilac pill, muted ink on the bare dock.
    final color = selected ? t.textPrimary : t.textMuted;
    return Semantics(
      button: true,
      selected: selected,
      label: item.label,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(28),
        child: AnimatedContainer(
          duration: t.durationNormal,
          curve: t.easeSpring,
          constraints: const BoxConstraints(minHeight: 52),
          padding: const EdgeInsets.symmetric(horizontal: 6),
          decoration: BoxDecoration(
            color: selected ? lilac.bg : Colors.transparent,
            borderRadius: BorderRadius.circular(28),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconTheme(
                data: IconThemeData(color: color, size: 24),
                child: _icon(item, color: color),
              ),
              if (selected) ...[
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    item.label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: color),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Window width at which the trip chrome swaps the bottom bar for a side rail.
const double kSideNavBreakpoint = 900;

/// Width at which the side rail extends to show labels beside the icons.
const double kSideNavExtendedBreakpoint = 1200;

/// Desktop / tablet navigation (web `.rail` / `.side`): a vertical rail with the same items as
/// [AppBottomNav]. Extended (icon + label) on wide windows, icons with labels below otherwise.
class AppSideNav extends StatelessWidget {
  const AppSideNav({
    required this.items,
    required this.currentIndex,
    required this.onTap,
    this.header,
    this.extended = false,
    super.key,
  });

  final List<AppNavItem> items;
  final int currentIndex;
  final ValueChanged<int> onTap;
  final Widget? header;
  final bool extended;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: t.bgSurface,
        border: Border(right: BorderSide(color: t.borderColor.withValues(alpha: 0.6))),
      ),
      child: NavigationRail(
        backgroundColor: Colors.transparent,
        extended: extended,
        minExtendedWidth: 220,
        selectedIndex: currentIndex,
        onDestinationSelected: onTap,
        labelType: extended ? NavigationRailLabelType.none : NavigationRailLabelType.all,
        leading: header,
        destinations: [
          for (final it in items)
            NavigationRailDestination(
              icon: _icon(it),
              label: Text(it.label),
              padding: const EdgeInsets.symmetric(vertical: 2),
            ),
        ],
      ),
    );
  }
}
