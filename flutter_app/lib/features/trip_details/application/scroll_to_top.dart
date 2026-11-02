import 'package:flutter/widgets.dart';

/// Scrolls the tab that is on screen back to the top (re-tapping the current tab in the bottom bar).
///
/// The tab pages are kept alive side by side in a pager, so this walks the widgets under [context] and picks the
/// first vertical scrollable that sits inside the window and has been scrolled down. Returns whether one was found.
bool scrollVisibleTabToTop(BuildContext context, {Duration duration = const Duration(milliseconds: 320)}) {
  final width = MediaQuery.sizeOf(context).width;
  ScrollPosition? target;

  void visit(Element element) {
    if (target != null) return;
    if (element is StatefulElement && element.state is ScrollableState) {
      final state = element.state as ScrollableState;
      final box = element.renderObject;
      if (box is RenderBox && box.hasSize && box.attached && state.position.hasPixels) {
        final dx = box.localToGlobal(Offset.zero).dx;
        final vertical = state.position.axis == Axis.vertical;
        if (vertical && dx > -1 && dx < width - 1 && state.position.pixels > 0) {
          target = state.position;
          return;
        }
      }
    }
    element.visitChildren(visit);
  }

  (context as Element).visitChildren(visit);
  final position = target;
  if (position == null) return false;
  position.animateTo(position.minScrollExtent, duration: duration, curve: Curves.easeOutCubic);
  return true;
}
