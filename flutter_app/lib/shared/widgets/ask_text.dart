import 'package:flutter/material.dart';

import '../../l10n/l10n_ext.dart';

/// One-line prompt. Returns the trimmed text, or null when cancelled.
Future<String?> askText(BuildContext context, String title, {String initial = ''}) {
  final c = TextEditingController(text: initial);
  return showDialog<String>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: TextField(key: const Key('ask-field'), controller: c, autofocus: true),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: Text(ctx.l10n.actionCancel)),
        TextButton(
          key: const Key('ask-ok'),
          onPressed: () => Navigator.pop(ctx, c.text.trim()),
          child: Text(ctx.l10n.actionSave),
        ),
      ],
    ),
  );
}
