import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/providers.dart';
import '../../domain/logic/trip_utilities.dart' show formatRelativeTime;
import '../../l10n/l10n_ext.dart';
import '../theme/app_tokens.dart';

/// "Updated 2 min ago": when this device last pulled from the server. Hidden until the first sync (guests and
/// local-only builds never sync) and with `enableLastSyncedCaption` off. Pull down on the page to refresh.
class LastSyncedCaption extends ConsumerStatefulWidget {
  const LastSyncedCaption({this.padding = const EdgeInsets.only(bottom: 8), super.key});

  final EdgeInsetsGeometry padding;

  @override
  ConsumerState<LastSyncedCaption> createState() => _LastSyncedCaptionState();
}

class _LastSyncedCaptionState extends ConsumerState<LastSyncedCaption> {
  Timer? _tick;

  @override
  void initState() {
    super.initState();
    _tick = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _tick?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final on = ref.watch(flagProvider(('enableLastSyncedCaption', null))).value ?? true;
    final at = ref.watch(lastSyncedProvider);
    if (!on || at == null) return const SizedBox.shrink();
    return Padding(
      padding: widget.padding,
      child: Align(
        alignment: Alignment.centerRight,
        child: Text(
          context.l10n.lastSynced(formatRelativeTime(at.millisecondsSinceEpoch)),
          key: const Key('last-synced'),
          style: TextStyle(fontSize: 12, color: context.tokens.textMuted),
        ),
      ),
    );
  }
}
