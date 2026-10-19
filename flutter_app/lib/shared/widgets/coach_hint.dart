import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/storage/prefs.dart';
import '../../data/providers.dart';
import '../theme/app_tokens.dart';

/// A one-time tip. Shows until dismissed (remembered on this device) and only while `enableCoachHints` is on.
class CoachHint extends ConsumerStatefulWidget {
  const CoachHint({required this.hintKey, required this.text, this.icon = Icons.lightbulb_outline_rounded, super.key});

  final String hintKey;
  final String text;
  final IconData icon;

  @override
  ConsumerState<CoachHint> createState() => _CoachHintState();
}

class _CoachHintState extends ConsumerState<CoachHint> {
  late bool _gone = ref.read(sharedPreferencesProvider).getBool('hint.${widget.hintKey}') ?? false;

  @override
  Widget build(BuildContext context) {
    final on = ref.watch(flagProvider(('enableCoachHints', null))).value ?? true;
    if (_gone || !on) return const SizedBox.shrink();
    final t = context.tokens;
    return Container(
      key: Key('hint-${widget.hintKey}'),
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.fromLTRB(14, 6, 4, 6),
      decoration: BoxDecoration(
        color: t.primaryAccent.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(t.radiusMd),
      ),
      child: Row(
        children: [
          Icon(widget.icon, size: 20, color: t.primaryAccent),
          const SizedBox(width: 10),
          Expanded(
            child: Text(widget.text, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
          ),
          IconButton(
            key: Key('hint-dismiss-${widget.hintKey}'),
            tooltip: MaterialLocalizations.of(context).closeButtonTooltip,
            constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
            icon: const Icon(Icons.close_rounded, size: 18),
            onPressed: () {
              ref.read(sharedPreferencesProvider).setBool('hint.${widget.hintKey}', true);
              setState(() => _gone = true);
            },
          ),
        ],
      ),
    );
  }
}
