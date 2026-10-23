import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/providers.dart';
import '../../l10n/l10n_ext.dart';
import 'confirm_dialog.dart';

/// Wrap a form sheet: once any of [controllers] differs from its [initial] text, leaving by back,
/// swipe-down or tapping outside asks "Discard changes?" first. Save / Cancel buttons that call
/// `Navigator.pop` directly are not affected. Gated by `enablePersistentExpenseDraft`.
class DiscardGuard extends ConsumerWidget {
  const DiscardGuard({required this.controllers, required this.initial, required this.child, super.key})
    : assert(controllers.length == initial.length);

  final List<TextEditingController> controllers;
  final List<String> initial;
  final Widget child;

  bool _dirty() {
    for (var i = 0; i < controllers.length; i++) {
      if (controllers[i].text != initial[i]) return true;
    }
    return false;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!(ref.watch(flagProvider(('enablePersistentExpenseDraft', null))).value ?? true)) return child;
    final l10n = context.l10n;
    return ListenableBuilder(
      listenable: Listenable.merge(controllers),
      builder: (context, _) => PopScope(
        canPop: !_dirty(),
        onPopInvokedWithResult: (didPop, _) async {
          if (didPop) return;
          final leave = await ConfirmDialog.show(
            context: context,
            title: l10n.discardChangesTitle,
            message: l10n.discardChangesBody,
            confirmLabel: l10n.syncDiscard,
            cancelLabel: l10n.discardKeepEditing,
            isDestructive: true,
          );
          if (leave && context.mounted) Navigator.of(context).pop();
        },
        child: child,
      ),
    );
  }
}
