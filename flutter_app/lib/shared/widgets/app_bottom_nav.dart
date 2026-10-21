import 'package:flutter/material.dart';

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

  /// The Bento pill is used on every platform.
  static bool get dockByDefault => true;

  bool get _useDock => forceDock ?? dockByDefault;

  @override
  Widget build(BuildContext context) {
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
