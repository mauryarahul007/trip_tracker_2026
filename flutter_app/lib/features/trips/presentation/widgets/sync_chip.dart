import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/connectivity_provider.dart';
import '../../../../core/platform/haptics.dart';
import '../../../../data/providers.dart';
import '../../../../data/sync/outbox_store.dart';
import '../../../../data/sync/outbox_types.dart';
import '../../../../domain/logic/trip_utilities.dart' show describeSyncItem;
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_icons.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/widgets/app_sheet.dart';
import '../../application/sync_wording.dart';
import '../../application/trips_providers.dart';

import 'ambient_outbox_sheet.dart';

/// "N changes waiting to sync" / "Sync issue". The review sheet (retry or
/// discard stuck items) is behind the `enableSyncQueueInspector` flag.
/// When `enableAmbientOutboxDrawer` is enabled, tapping opens the rich Material 3 Ambient Outbox Drawer.
class SyncChip extends ConsumerWidget {
  const SyncChip({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(syncStatusProvider).value ?? const SyncStatus();
    if (status.idle) return const SizedBox.shrink();
    final l10n = context.l10n;
    final tokens = context.tokens;
    final inspector = ref.watch(flagProvider(('enableSyncQueueInspector', null))).value ?? false;
    final ambientOutbox = ref.watch(flagProvider(('enableAmbientOutboxDrawer', null))).value ?? false;
    final issue = status.issues > 0;
    final color = issue ? tokens.colorDanger : tokens.primaryAccent;

    return Align(
      alignment: Alignment.centerLeft,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
        child: ActionChip(
          avatar: Icon(issue ? AppIcons.alert : AppIcons.sync, size: 16, color: color),
          label: Text(
            issue ? l10n.syncLineIssue(status.issues) : l10n.syncPending(status.pending),
            style: TextStyle(color: color, fontSize: 12),
          ),
          side: BorderSide(color: color.withValues(alpha: 0.4)),
          backgroundColor: color.withValues(alpha: 0.08),
          onPressed: ambientOutbox
              ? () {
                  AppHaptics.selection();
                  showAmbientOutboxSheet(context);
                }
              : (issue || inspector ? () => showSyncReviewSheet(context) : null),
        ),
      ),
    );
  }
}

/// Header sync button (flag `enableSyncLine`): tap pulls and pushes now, spins while it runs,
/// and turns red with the review sheet when items are stuck. Offline / pending only change the icon.
/// When `enableAmbientOutboxDrawer` is active, displays an ambient pulse badge for pending/issues and
/// opens the rich Material 3 offline outbox drawer.
class SyncButton extends ConsumerWidget {
  const SyncButton({this.tripId, super.key});
  final String? tripId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!(ref.watch(flagProvider(('enableSyncLine', tripId))).value ?? true)) return const SizedBox.shrink();
    final l10n = context.l10n;
    final t = context.tokens;
    final online = ref.watch(isOnlineProvider).value ?? true;
    final status = ref.watch(syncStatusProvider).value ?? const SyncStatus();
    final syncing = ref.watch(tripsSyncingProvider).value ?? false;
    final ambientOutbox = ref.watch(flagProvider(('enableAmbientOutboxDrawer', tripId))).value ?? false;
    final w = syncWording(l10n, online: online, status: status);
    final (String, IconData, Color) state = (
      online && status.idle ? l10n.syncNow : w.text,
      w.icon == Icons.check_circle_outline_rounded ? Icons.sync_rounded : w.icon,
      w.tone == SyncTone.problem ? t.colorDanger : t.textSecondary,
    );

    final Widget iconWidget = syncing
        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
        : (ambientOutbox && (status.pending > 0 || status.issues > 0))
            ? Stack(
                clipBehavior: Clip.none,
                alignment: Alignment.center,
                children: [
                  Icon(state.$2, color: state.$3),
                  Positioned(
                    right: -2,
                    top: -2,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: status.issues > 0 ? t.colorDanger : t.tones.sky.accent,
                        shape: BoxShape.circle,
                        border: Border.all(color: t.bgSurface, width: 1.5),
                      ),
                    ),
                  ),
                ],
              )
            : Icon(state.$2, color: state.$3);

    return IconButton(
      key: const Key('sync-action'),
      tooltip: state.$1,
      icon: iconWidget,
      onPressed: syncing
          ? null
          : ambientOutbox
              ? () async {
                  await AppHaptics.selection();
                  if (status.issues > 0 || status.pending > 0 || !online) {
                    if (context.mounted) showAmbientOutboxSheet(context);
                  } else {
                    await ref.read(syncCoordinatorProvider).syncNow();
                  }
                }
              : (status.issues > 0
                  ? () => showSyncReviewSheet(context)
                  : () async {
                      await AppHaptics.light();
                      await ref.read(syncCoordinatorProvider).syncNow();
                    }),
    );
  }
}

/// The existing retry list. Failed items can be retried from here.
void showSyncReviewSheet(BuildContext context) {
  AppSheet.show<void>(context: context, title: context.l10n.syncSheetTitle, builder: (_) => const _SyncSheet());
}

class _SyncSheet extends ConsumerWidget {
  const _SyncSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final items = ref.watch(syncItemsProvider).value ?? const <OutboxItem>[];
    final store = ref.read(outboxStoreProvider);
    final inspector = ref.watch(flagProvider(('enableSyncQueueInspector', null))).value ?? false;
    return ConstrainedBox(
      constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.6),
      child: ListView(
        shrinkWrap: true,
        children: [
          for (final i in items)
            ListTile(
              title: Text(describeSyncItem({'id': i.id, 'type': i.type, 'payload': i.payload})),
              subtitle: i.lastError == null ? null : Text(i.lastError!, maxLines: 2, overflow: TextOverflow.ellipsis),
              trailing: (i.status == OutboxStatus.poison || (i.lastError ?? '').isNotEmpty)
                  ? Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        TextButton(onPressed: () => store.retry(i.id), child: Text(l10n.syncRetry)),
                        if (inspector) TextButton(onPressed: () => store.discard(i.id), child: Text(l10n.syncDiscard)),
                      ],
                    )
                  : null,
            ),
        ],
      ),
    );
  }
}
