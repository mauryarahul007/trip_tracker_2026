import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../application/push_providers.dart';
import '../../../l10n/l10n_ext.dart';

/// Contextual "turn on alerts?" ask. Call after a meaningful action; it is a no-op unless the
/// user is signed in, the OS has not been asked yet, and we have not asked before.
Future<void> maybeAskForPush(BuildContext context, WidgetRef ref) async {
  await ref.read(pushControllerProvider.future); // the OS answer must be loaded before deciding
  final c = ref.read(pushControllerProvider.notifier);
  if (!c.shouldAsk) return;
  await c.markPrompted();
  if (!context.mounted) return;
  final yes = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(ctx.l10n.pushPromptTitle),
      content: Text(ctx.l10n.pushPromptBody),
      actions: [
        TextButton(
          key: const Key('push-prompt-later'),
          onPressed: () => Navigator.pop(ctx, false),
          child: Text(ctx.l10n.pushPromptLater),
        ),
        TextButton(
          key: const Key('push-prompt-yes'),
          onPressed: () => Navigator.pop(ctx, true),
          child: Text(ctx.l10n.pushPromptYes),
        ),
      ],
    ),
  );
  if (yes == true) await c.enable();
}
