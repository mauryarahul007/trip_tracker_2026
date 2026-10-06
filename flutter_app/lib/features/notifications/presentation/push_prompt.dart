import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../application/push_providers.dart';

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
      title: const Text('Get trip alerts?'),
      content: const Text(
        'We can notify you when friends add expenses, ask you to settle up, or message the trip. You can change this any time in Settings.',
      ),
      actions: [
        TextButton(
          key: const Key('push-prompt-later'),
          onPressed: () => Navigator.pop(ctx, false),
          child: const Text('Not now'),
        ),
        TextButton(
          key: const Key('push-prompt-yes'),
          onPressed: () => Navigator.pop(ctx, true),
          child: const Text('Turn on'),
        ),
      ],
    ),
  );
  if (yes == true) await c.enable();
}
