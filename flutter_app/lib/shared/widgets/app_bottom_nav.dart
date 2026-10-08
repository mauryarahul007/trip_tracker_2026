import 'dart:ui' show ImageFilter;

import 'package:flutter/foundation.dart' show TargetPlatform, defaultTargetPlatform, kIsWeb;
import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

class AppNavItem {
  const AppNavItem({required this.icon, required this.label, this.badge = false, this.badgeKey});

  final IconData icon;
  final String label;

  /// Shows a small dot on the icon (e.g. unread chat).
  final bool badge;
  final Key? badgeKey;
}

/// Horizon bottom navigation. iOS / web: floating frosted dock with a tinted pill behind the
/// selected item. Android: Material 3 [NavigationBar] (pill indicator). Pass [forceDock] to
/// pick a style explicitly (used by tests and previews).
class AppBottomNav extends StatelessWidget {
  const AppBottomNav({required this.items, required this.currentIndex, required this.onTap, this.forceDock, super.key});

  final List<AppNavItem> items;
  final int currentIndex;
  final ValueChanged<int> onTap;
  final bool? forceDock;

  bool get _useDock => forceDock ?? (kIsWeb || defaultTargetPlatform != TargetPlatform.android);

  @override
  Widget build(BuildContext context) {
    return _useDock ? _Dock(items: items, currentIndex: currentIndex, onTap: onTap) : _M3Bar(this);
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

class _Dock extends StatelessWidget {
  const _Dock({required this.items, required this.currentIndex, required this.onTap});

  final List<AppNavItem> items;
  final int currentIndex;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final radius = BorderRadius.circular(32);
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
        child: DecoratedBox(
          decoration: BoxDecoration(borderRadius: radius, boxShadow: t.shadowLg),
          child: ClipRRect(
            borderRadius: radius,
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: t.bgSurface.withValues(alpha: 0.9),
                  borderRadius: radius,
                  border: Border.all(color: t.borderColor.withValues(alpha: 0.7)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(6),
                  child: Row(
                    children: [
                      for (var i = 0; i < items.length; i++)
                        Expanded(
                          child: _DockItem(item: items[i], selected: i == currentIndex, onTap: () => onTap(i)),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
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
    final color = selected ? t.primaryAccent : t.textMuted;
    return Semantics(
      button: true,
      selected: selected,
      label: item.label,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(26),
        child: AnimatedContainer(
          duration: t.durationNormal,
          curve: t.easeSpring,
          constraints: const BoxConstraints(minHeight: 52),
          padding: const EdgeInsets.symmetric(vertical: 6),
          decoration: BoxDecoration(
            color: selected ? t.primaryAccent.withValues(alpha: 0.12) : Colors.transparent,
            borderRadius: BorderRadius.circular(26),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconTheme(
                data: IconThemeData(color: color, size: 24),
                child: _icon(item, color: color),
              ),
              const SizedBox(height: 2),
              Text(
                item.label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 11, fontWeight: selected ? FontWeight.w700 : FontWeight.w600, color: color),
              ),
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
