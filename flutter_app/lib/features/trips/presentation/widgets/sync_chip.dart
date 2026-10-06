import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../data/providers.dart';
import '../../../../data/sync/outbox_store.dart';
import '../../../../data/sync/outbox_types.dart';
import '../../../../domain/logic/trip_utilities.dart' show describeSyncItem;
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_icons.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/widgets/app_sheet.dart';
import '../../application/trips_providers.dart';

/// "N changes waiting to sync" / "Sync issue". The review sheet (retry or
/// discard stuck items) is behind the `enableSyncQueueInspector` flag.
class SyncChip extends ConsumerWidget {
  const SyncChip({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(syncStatusProvider).value ?? const SyncStatus();
    if (status.idle) return const SizedBox.shrink();
    final l10n = context.l10n;
    final tokens = context.tokens;
    final inspector = ref.watch(flagProvider(('enableSyncQueueInspector', null))).value ?? false;
    final issue = status.issues > 0;
    final color = issue ? tokens.colorDanger : tokens.primaryAccent;

    return Align(
      alignment: Alignment.centerLeft,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
        child: ActionChip(
          avatar: Icon(issue ? AppIcons.alert : AppIcons.sync, size: 16, color: color),
          label: Text(issue ? l10n.syncIssue : l10n.syncPending(status.pending), style: TextStyle(color: color, fontSize: 12)),
          side: BorderSide(color: color.withValues(alpha: 0.4)),
          backgroundColor: color.withValues(alpha: 0.08),
          onPressed: inspector ? () => _openSheet(context) : null,
        ),
      ),
    );
  }

  void _openSheet(BuildContext context) {
    AppSheet.show<void>(
      context: context,
      title: context.l10n.syncSheetTitle,
      builder: (_) => const _SyncSheet(),
    );
  }
}

class _SyncSheet extends ConsumerWidget {
  const _SyncSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final items = ref.watch(syncItemsProvider).value ?? const <OutboxItem>[];
    final store = ref.read(outboxStoreProvider);
    return ConstrainedBox(
      constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.6),
      child: ListView(
        shrinkWrap: true,
        children: [
          for (final i in items)
            ListTile(
              title: Text(describeSyncItem({'id': i.id, 'type': i.type, 'payload': i.payload})),
              subtitle: i.lastError == null ? null : Text(i.lastError!, maxLines: 2, overflow: TextOverflow.ellipsis),
              trailing: i.status == OutboxStatus.poison
                  ? Row(mainAxisSize: MainAxisSize.min, children: [
                      TextButton(onPressed: () => store.retry(i.id), child: Text(l10n.syncRetry)),
                      TextButton(onPressed: () => store.discard(i.id), child: Text(l10n.syncDiscard)),
                    ])
                  : null,
            ),
        ],
      ),
    );
  }
}
