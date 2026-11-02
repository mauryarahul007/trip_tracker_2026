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
import '../../application/trips_providers.dart';

/// Opens the ambient Material 3 offline outbox drawer / sheet.
void showAmbientOutboxSheet(BuildContext context) {
  AppSheet.show<void>(
    context: context,
    title: 'Trip Outbox & Sync',
    builder: (_) => const AmbientOutboxSheet(),
  );
}

/// Rich Material 3 offline outbox drawer displaying queued mutations, connection banner,
/// item status badges, and batch retry controls.
class AmbientOutboxSheet extends ConsumerWidget {
  const AmbientOutboxSheet({super.key});

  IconData _entityIcon(String type) {
    if (type.contains('Expense')) return AppIcons.expenses;
    if (type.contains('Member')) return AppIcons.members;
    if (type.contains('Message')) return AppIcons.chat;
    if (type.contains('Group')) return Icons.groups_outlined;
    if (type.contains('Category')) return Icons.category_outlined;
    if (type.contains('Trip')) return Icons.explore_outlined;
    return Icons.sync_alt_rounded;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.tokens;
    final l10n = context.l10n;
    final online = ref.watch(isOnlineProvider).value ?? true;
    final status = ref.watch(syncStatusProvider).value ?? const SyncStatus();
    final syncing = ref.watch(tripsSyncingProvider).value ?? false;
    final items = ref.watch(syncItemsProvider).value ?? const <OutboxItem>[];
    final store = ref.read(outboxStoreProvider);
    final inspector = ref.watch(flagProvider(('enableSyncQueueInspector', null))).value ?? false;

    final failedItems = items.where((i) => i.status == OutboxStatus.poison || (i.lastError ?? '').isNotEmpty).toList();
    final inFlightItems = items.where((i) => i.status == OutboxStatus.inFlight).toList();
    final pendingItems = items.where((i) => i.status == OutboxStatus.pending).toList();

    return ConstrainedBox(
      constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.75),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. Connection & Sync Banner
            _buildConnectionBanner(context, online: online, syncing: syncing, status: status, tokens: t),
            const SizedBox(height: 12),

            // 2. Metrics Bar (when items present)
            if (items.isNotEmpty) ...[
              _buildMetricsBar(
                context,
                pendingCount: pendingItems.length,
                inFlightCount: inFlightItems.length,
                issueCount: failedItems.length,
                tokens: t,
              ),
              const SizedBox(height: 12),
            ],

            // 3. Outbox Items List or Empty State
            Flexible(
              child: items.isEmpty
                  ? _buildEmptyState(context, tokens: t)
                  : ListView.separated(
                      key: const Key('ambient-outbox-list'),
                      shrinkWrap: true,
                      itemCount: items.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final item = items[index];
                        final hasError = (item.lastError ?? '').isNotEmpty || item.status == OutboxStatus.poison;
                        return _buildItemCard(
                          context,
                          item: item,
                          hasError: hasError,
                          inspector: inspector,
                          store: store,
                          tokens: t,
                          l10n: l10n,
                        );
                      },
                    ),
            ),
            const SizedBox(height: 14),

            // 4. Action Controls Footer
            _buildActionFooter(
              context,
              ref: ref,
              online: online,
              syncing: syncing,
              failedItems: failedItems,
              store: store,
              tokens: t,
              l10n: l10n,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildConnectionBanner(
    BuildContext context, {
    required bool online,
    required bool syncing,
    required SyncStatus status,
    required AppTokens tokens,
  }) {
    final (Color bg, Color border, Color fg, IconData icon, String title, String subtitle) = switch ((online, syncing, status.issues > 0)) {
      (false, _, _) => (
        tokens.colorWarning.withValues(alpha: 0.12),
        tokens.colorWarning.withValues(alpha: 0.35),
        tokens.colorWarning,
        Icons.cloud_off_rounded,
        'Offline Mode — All Changes Staged',
        'Mutations are saved locally on this device. They will automatically sync as soon as network is restored.',
      ),
      (true, true, _) => (
        tokens.tones.sky.bg,
        tokens.tones.sky.accent.withValues(alpha: 0.35),
        tokens.tones.sky.accent,
        Icons.sync_rounded,
        'Syncing in Progress',
        'Uploading queued mutations and pulling latest trip updates from the server...',
      ),
      (true, false, true) => (
        tokens.colorDanger.withValues(alpha: 0.12),
        tokens.colorDanger.withValues(alpha: 0.35),
        tokens.colorDanger,
        Icons.sync_problem_rounded,
        'Sync Issues Detected',
        '${status.issues} action(s) encountered an issue. Tap retry to process them again.',
      ),
      _ => (
        tokens.tones.mint.bg,
        tokens.tones.mint.accent.withValues(alpha: 0.35),
        tokens.tones.mint.accent,
        Icons.check_circle_rounded,
        'Trip Synchronized',
        'All changes are safely recorded and up to date with the server.',
      ),
    };

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(tokens.radiusMd),
        border: Border.all(color: border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: fg, size: 22),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: tokens.textPrimary,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  subtitle,
                  style: TextStyle(
                    color: tokens.textSecondary,
                    fontSize: 11.5,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricsBar(
    BuildContext context, {
    required int pendingCount,
    required int inFlightCount,
    required int issueCount,
    required AppTokens tokens,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: tokens.bgSurfaceHover,
        borderRadius: BorderRadius.circular(tokens.radiusMd),
        border: Border.all(color: tokens.borderColor.withValues(alpha: 0.4)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _metricItem('Pending', pendingCount.toString(), tokens.textSecondary, tokens),
          _divider(tokens),
          _metricItem('In Flight', inFlightCount.toString(), tokens.tones.sky.accent, tokens),
          _divider(tokens),
          _metricItem('Issues', issueCount.toString(), issueCount > 0 ? tokens.colorDanger : tokens.textMuted, tokens),
        ],
      ),
    );
  }

  Widget _metricItem(String label, String value, Color color, AppTokens tokens) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          value,
          style: TextStyle(
            color: color,
            fontSize: 14,
            fontWeight: FontWeight.w800,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            color: tokens.textMuted,
            fontSize: 11,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _divider(AppTokens tokens) {
    return Container(
      width: 1,
      height: 24,
      color: tokens.borderColor.withValues(alpha: 0.5),
    );
  }

  Widget _buildEmptyState(BuildContext context, {required AppTokens tokens}) {
    return Container(
      key: const Key('ambient-outbox-empty'),
      padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 16),
      alignment: Alignment.center,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.cloud_done_outlined, size: 48, color: tokens.tones.mint.accent),
          const SizedBox(height: 10),
          Text(
            'Outbox is completely clear',
            style: TextStyle(
              color: tokens.textPrimary,
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'No pending writes or sync operations waiting in queue.',
            textAlign: TextAlign.center,
            style: TextStyle(color: tokens.textMuted, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildItemCard(
    BuildContext context, {
    required OutboxItem item,
    required bool hasError,
    required bool inspector,
    required OutboxStore store,
    required AppTokens tokens,
    required dynamic l10n,
  }) {
    final title = describeSyncItem({'id': item.id, 'type': item.type, 'payload': item.payload});
    final statusColor = hasError
        ? tokens.colorDanger
        : item.status == OutboxStatus.inFlight
            ? tokens.tones.sky.accent
            : tokens.textMuted;

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: tokens.bgSurface,
        borderRadius: BorderRadius.circular(tokens.radiusMd),
        border: Border.all(
          color: hasError ? tokens.colorDanger.withValues(alpha: 0.4) : tokens.borderColor.withValues(alpha: 0.6),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: (hasError ? tokens.colorDanger : tokens.tones.sky.accent).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(tokens.radiusSm),
                ),
                child: Icon(
                  _entityIcon(item.type),
                  size: 16,
                  color: hasError ? tokens.colorDanger : tokens.tones.sky.accent,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        color: tokens.textPrimary,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Type: ${item.type} · ${item.status.toUpperCase()}',
                      style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ),
              if (item.status == OutboxStatus.inFlight)
                const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
            ],
          ),
          if (item.lastError != null) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: tokens.colorDanger.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(tokens.radiusSm),
              ),
              child: Text(
                '${item.lastError} (Attempts: ${item.attempts})',
                style: TextStyle(color: tokens.colorDanger, fontSize: 11),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
          if (hasError) ...[
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton.icon(
                  onPressed: () async {
                    await AppHaptics.light();
                    await store.retry(item.id);
                  },
                  icon: const Icon(Icons.refresh_rounded, size: 14),
                  label: Text(l10n.syncRetry),
                  style: TextButton.styleFrom(
                    visualDensity: VisualDensity.compact,
                    foregroundColor: tokens.primaryAccent,
                  ),
                ),
                if (inspector || item.status == OutboxStatus.poison)
                  TextButton.icon(
                    onPressed: () async {
                      await AppHaptics.medium();
                      await store.discard(item.id);
                    },
                    icon: const Icon(Icons.delete_outline_rounded, size: 14),
                    label: Text(l10n.syncDiscard),
                    style: TextButton.styleFrom(
                      visualDensity: VisualDensity.compact,
                      foregroundColor: tokens.colorDanger,
                    ),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildActionFooter(
    BuildContext context, {
    required WidgetRef ref,
    required bool online,
    required bool syncing,
    required List<OutboxItem> failedItems,
    required OutboxStore store,
    required AppTokens tokens,
    required dynamic l10n,
  }) {
    return Row(
      children: [
        if (failedItems.isNotEmpty) ...[
          Expanded(
            child: OutlinedButton.icon(
              key: const Key('ambient-retry-all-button'),
              onPressed: () async {
                await AppHaptics.medium();
                for (final item in failedItems) {
                  await store.retry(item.id);
                }
              },
              icon: const Icon(Icons.refresh_rounded, size: 16),
              label: Text('Retry All (${failedItems.length})'),
              style: OutlinedButton.styleFrom(
                foregroundColor: tokens.colorDanger,
                side: BorderSide(color: tokens.colorDanger.withValues(alpha: 0.4)),
              ),
            ),
          ),
          const SizedBox(width: 8),
        ],
        Expanded(
          child: FilledButton.icon(
            key: const Key('ambient-sync-now-button'),
            onPressed: (!online || syncing)
                ? null
                : () async {
                    await AppHaptics.selection();
                    await ref.read(syncCoordinatorProvider).syncNow();
                  },
            icon: syncing
                ? const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.sync_rounded, size: 16),
            label: Text(syncing ? 'Syncing...' : (!online ? 'Offline' : l10n.syncNow)),
            style: FilledButton.styleFrom(
              backgroundColor: tokens.ctaBg,
              foregroundColor: tokens.ctaFg,
            ),
          ),
        ),
      ],
    );
  }
}
