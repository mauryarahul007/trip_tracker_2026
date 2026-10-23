import 'package:flutter/material.dart';

import '../../l10n/l10n_ext.dart';
import '../../shared/theme/app_icons.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/empty_state.dart';

/// Wraps one tab page. If a widget under it throws while building, [InPlaceErrorWidget] shows a
/// friendly message with Retry in that spot only; the header, the other tabs and the nav keep working.
/// Retry rebuilds the subtree from scratch.
class TabErrorBoundary extends StatefulWidget {
  const TabErrorBoundary({required this.child, super.key});
  final Widget child;

  @override
  State<TabErrorBoundary> createState() => _TabErrorBoundaryState();
}

class _TabErrorBoundaryState extends State<TabErrorBoundary> {
  var _attempt = 0;

  void _retry() => setState(() => _attempt++);

  @override
  Widget build(BuildContext context) => _Scope(
    retry: _retry,
    child: KeyedSubtree(key: ValueKey(_attempt), child: widget.child),
  );
}

class _Scope extends InheritedWidget {
  const _Scope({required this.retry, required super.child});
  final VoidCallback retry;

  @override
  bool updateShouldNotify(_Scope old) => false;
}

/// Replaces a widget that failed to build. Inside a [TabErrorBoundary] it offers Retry; anywhere else it
/// defers to the framework's own error widget.
class InPlaceErrorWidget extends StatelessWidget {
  const InPlaceErrorWidget(this.details, this.fallback, {super.key});
  final FlutterErrorDetails details;
  final Widget Function(FlutterErrorDetails) fallback;

  @override
  Widget build(BuildContext context) {
    final scope = context.getInheritedWidgetOfExactType<_Scope>();
    if (scope == null) return fallback(details);
    final l10n = context.l10n;
    return Center(
      child: SingleChildScrollView(
        child: EmptyState(
          key: const Key('tab-error'),
          icon: AppIcons.alert,
          title: l10n.errorGenericTitle,
          subtitle: l10n.errorGenericMessage,
          action: AppButton(label: l10n.actionRetry, onPressed: scope.retry),
        ),
      ),
    );
  }
}

/// Call once at startup, before runApp.
void installInPlaceErrorWidget() {
  final previous = ErrorWidget.builder;
  ErrorWidget.builder = (details) => InPlaceErrorWidget(details, previous);
}
