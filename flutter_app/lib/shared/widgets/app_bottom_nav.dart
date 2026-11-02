import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_tokens.dart';

class AppNavItem {
  const AppNavItem({
    required this.icon,
    required this.label,
    this.selectedIcon,
    this.badge = false,
    this.count = 0,
    this.badgeKey,
  });

  final IconData icon;
  final String label;

  /// Filled variant shown while selected (polished dock only). Falls back to [icon].
  final IconData? selectedIcon;

  /// Shows a small dot on the icon (e.g. unread chat).
  final bool badge;

  /// Shows a number on the icon instead of the dot (capped at 99+). 0 means no count.
  final int count;
  final Key? badgeKey;
}

/// Trip and home bottom navigation: a floating dock where every item keeps its label. With [polish] (flag
/// `enableNavPolish`) the selected item gets a soft pill behind its icon that slides between tabs, a filled icon, a
/// press-down scale and a blurred bar; without it the selected item fills its whole cell with the accent colour.
/// [forceDock]: false selects the plain Material 3 [NavigationBar] (tests and previews).
class AppBottomNav extends StatelessWidget {
  const AppBottomNav({
    required this.items,
    required this.currentIndex,
    required this.onTap,
    this.forceDock,
    this.polish = false,
    this.centerAction,
    this.centerLabel,
    super.key,
  });

  final List<AppNavItem> items;
  final int currentIndex;
  final ValueChanged<int> onTap;
  final bool? forceDock;
  final bool polish;

  /// Round button between the two halves of the dock (e.g. New trip). Not drawn in the Calm theme, where the
  /// screen's primary action floats over the content ([CalmAddButton]).
  final VoidCallback? centerAction;
  final String? centerLabel;

  /// The dock is used on every platform.
  static bool get dockByDefault => true;

  bool get _useDock => forceDock ?? dockByDefault;

  @override
  Widget build(BuildContext context) {
    if (!_useDock) return _M3Bar(this);
    return _Dock(
      items: items,
      currentIndex: currentIndex,
      onTap: onTap,
      polish: polish,
      centerAction: context.tokens.calm ? null : centerAction,
      centerLabel: centerLabel,
    );
  }
}

Widget _icon(AppNavItem it, {Color? color, IconData? icon}) {
  final glyph = Icon(icon ?? it.icon, color: color);
  if (it.count > 0) {
    return Badge(key: it.badgeKey, label: Text(it.count > 99 ? '99+' : '${it.count}'), child: glyph);
  }
  return it.badge ? Badge(key: it.badgeKey, child: glyph) : glyph;
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

/// The floating dock. Its height is just the bar: the screen's primary action floats over the content
/// ([CalmAddButton]).
class _Dock extends StatelessWidget {
  const _Dock({
    required this.items,
    required this.currentIndex,
    required this.onTap,
    required this.polish,
    this.centerAction,
    this.centerLabel,
  });

  final List<AppNavItem> items;
  final int currentIndex;
  final ValueChanged<int> onTap;
  final bool polish;
  final VoidCallback? centerAction;
  final String? centerLabel;

  static const double _radius = 26;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final center = centerAction == null ? null : _DockCenter(label: centerLabel, onTap: centerAction!);
    final bar = Padding(
      padding: const EdgeInsets.all(8),
      child: polish
          ? _PolishRow(items: items, currentIndex: currentIndex, onTap: onTap, center: center)
          : Row(
              children: [
                for (var i = 0; i < items.length; i++) ...[
                  if (center != null && i == items.length ~/ 2) center,
                  Expanded(
                    child: _TileItem(item: items[i], selected: i == currentIndex, onTap: () => onTap(i)),
                  ),
                ],
              ],
            ),
    );
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
        child: DecoratedBox(
          key: const Key('calm-dock'),
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(_radius), boxShadow: t.shadowLg),
          child: polish
              ? ClipRRect(
                  borderRadius: BorderRadius.circular(_radius),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: t.bgSurface.withValues(alpha: 0.88),
                        borderRadius: BorderRadius.circular(_radius),
                        border: Border.all(color: t.borderColor),
                      ),
                      child: bar,
                    ),
                  ),
                )
              : DecoratedBox(
                  decoration: BoxDecoration(
                    color: t.bgSurface,
                    borderRadius: BorderRadius.circular(_radius),
                    border: Border.all(color: t.borderColor),
                  ),
                  child: bar,
                ),
        ),
      ),
    );
  }
}

class _DockCenter extends StatelessWidget {
  const _DockCenter({required this.onTap, this.label});

  static const double width = 62; // 54 button + 4 margin each side

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

/// Polished items: an accent-tinted pill sits behind the selected icon and slides to the next one.
class _PolishRow extends StatelessWidget {
  const _PolishRow({required this.items, required this.currentIndex, required this.onTap, this.center});

  final List<AppNavItem> items;
  final int currentIndex;
  final ValueChanged<int> onTap;
  final Widget? center;

  static const double _pillWidth = 56;
  static const double _pillHeight = 32;
  static const double _pillTop = 4;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final reduce = MediaQuery.disableAnimationsOf(context);
    return LayoutBuilder(
      builder: (context, box) {
        final centerW = center == null ? 0.0 : _DockCenter.width;
        final slot = (box.maxWidth - centerW) / items.length;
        final afterCenter = center != null && currentIndex >= items.length ~/ 2 ? centerW : 0.0;
        final left = currentIndex * slot + afterCenter + slot / 2 - _pillWidth / 2;
        return Stack(
          children: [
            AnimatedPositioned(
              key: const Key('dock-pill'),
              duration: reduce ? Duration.zero : t.durationNormal,
              curve: t.easeSpring,
              top: _pillTop,
              left: left,
              width: _pillWidth,
              height: _pillHeight,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: t.primaryAccent.withValues(alpha: dark ? 0.24 : 0.14),
                  borderRadius: BorderRadius.circular(_pillHeight),
                ),
              ),
            ),
            Row(
              children: [
                for (var i = 0; i < items.length; i++) ...[
                  if (center != null && i == items.length ~/ 2) center!,
                  Expanded(
                    child: _PolishItem(item: items[i], selected: i == currentIndex, onTap: () => onTap(i)),
                  ),
                ],
              ],
            ),
          ],
        );
      },
    );
  }
}

class _PolishItem extends StatefulWidget {
  const _PolishItem({required this.item, required this.selected, required this.onTap});

  final AppNavItem item;
  final bool selected;
  final VoidCallback onTap;

  @override
  State<_PolishItem> createState() => _PolishItemState();
}

class _PolishItemState extends State<_PolishItem> {
  bool _pressed = false;

  void _press(bool down) {
    if (_pressed != down) setState(() => _pressed = down);
  }

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final item = widget.item;
    final selected = widget.selected;
    final color = selected ? t.primaryAccent : t.textMuted;
    final reduce = MediaQuery.disableAnimationsOf(context);
    final glyph = selected ? (item.selectedIcon ?? item.icon) : item.icon;
    return Semantics(
      button: true,
      selected: selected,
      label: item.label,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: widget.onTap,
        onTapDown: (_) => _press(true),
        onTapUp: (_) => _press(false),
        onTapCancel: () => _press(false),
        child: AnimatedScale(
          scale: _pressed && !reduce ? 0.94 : 1,
          duration: const Duration(milliseconds: 90),
          child: ExcludeSemantics(
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 56),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(height: _PolishRow._pillTop),
                  SizedBox(
                    height: _PolishRow._pillHeight,
                    child: Center(
                      child: IconTheme(
                        data: IconThemeData(color: color, size: 24),
                        child: AnimatedSwitcher(
                          duration: reduce ? Duration.zero : const Duration(milliseconds: 180),
                          transitionBuilder: (child, anim) => ScaleTransition(
                            scale: Tween<double>(begin: 0.8, end: 1).animate(anim),
                            child: FadeTransition(opacity: anim, child: child),
                          ),
                          child: KeyedSubtree(
                            key: ValueKey(selected),
                            child: _icon(item, color: color, icon: glyph),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    item.label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Calm Passport floating primary action (ink in light, teal in dark). Hand it to a Scaffold's
/// `floatingActionButton` so it hovers over the content and reserves no space.
class CalmAddButton extends StatelessWidget {
  const CalmAddButton({required this.onTap, this.extended = false, this.label, super.key});

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

/// The original dock item (polish off): the selected item fills its whole cell with the accent colour.
class _TileItem extends StatelessWidget {
  const _TileItem({required this.item, required this.selected, required this.onTap});

  final AppNavItem item;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    // Selected: the teal pill (bright teal with ink in dark, deep teal with white in light).
    final dark = Theme.of(context).brightness == Brightness.dark;
    final teal = t.primaryAccent;
    final color = selected ? (dark ? AppColors.calmInk : Colors.white) : t.textMuted;
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
