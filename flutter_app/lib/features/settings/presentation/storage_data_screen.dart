import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/flags/compass_flags.dart';
import '../../../core/settings/app_settings.dart' show dataSaverPrefProvider;
import '../../../data/providers.dart' show flagProvider;
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/theme/compass.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../application/settings_data.dart';
import 'settings_widgets.dart';

/// How much space the app uses on this phone, and a button to free the re-downloadable part.
class StorageDataScreen extends ConsumerWidget {
  const StorageDataScreen({super.key});

  Future<void> _clear(BuildContext context, WidgetRef ref) async {
    final ok = await ConfirmDialog.show(
      context: context,
      title: 'Clear cache?',
      message: 'Cached images and temporary files are removed. Your trips and expenses stay.',
      confirmLabel: 'Clear',
    );
    if (!ok) return;
    await ref.read(storageGatewayProvider).clearCache();
    ref.invalidate(storageUsageProvider);
  }

  /// Horizon ("Storage and data" mockup): one usage card with a split bar and legend, then Data saver and
  /// Clear cache in a card.
  Widget _horizon(BuildContext context, WidgetRef ref, StorageUsage? usage) {
    final t = context.tokens;
    final total = usage == null || usage.totalBytes == 0 ? 1 : usage.totalBytes;
    final saverOn = ref.watch(flagProvider(('enableDataSaverMode', null))).value ?? false;
    Widget legend(Color c, String label) => Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: c, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(fontFamily: AppTypography.fontBody, fontSize: 12, color: t.textSecondary),
        ),
      ],
    );
    return AppScaffold(
      backgroundColor: t.bgPage,
      appBar: AppBar(title: const Text('Storage and data')),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 32),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Container(
              key: const Key('storage-usage-card'),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: t.bgSurface,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: t.borderColor),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          'On this phone',
                          style: TextStyle(
                            fontFamily: AppTypography.fontBody,
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: t.textPrimary,
                          ),
                        ),
                      ),
                      Text(
                        usage == null ? '…' : formatBytes(usage.totalBytes),
                        key: const Key('storage-total'),
                        style: TextStyle(
                          fontFamily: AppTypography.fontMono,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: t.textPrimary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(99),
                    child: SizedBox(
                      height: 10,
                      child: usage == null
                          ? ColoredBox(color: t.bgSurfaceHover)
                          : Row(
                              children: [
                                Expanded(
                                  flex: (usage.dataBytes * 1000 ~/ total).clamp(1, 1000),
                                  child: ColoredBox(color: t.primaryAccent),
                                ),
                                Expanded(
                                  flex: (usage.cacheBytes * 1000 ~/ total).clamp(1, 1000),
                                  child: ColoredBox(color: t.tones.peach.accent),
                                ),
                              ],
                            ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 14,
                    children: [
                      legend(t.primaryAccent, 'Data ${usage == null ? '…' : formatBytes(usage.dataBytes)}'),
                      legend(t.tones.peach.accent, 'Cache ${usage == null ? '…' : formatBytes(usage.cacheBytes)}'),
                    ],
                  ),
                ],
              ),
            ),
          ),
          SettingsSection(
            title: '',
            children: [
              if (saverOn)
                SettingsSwitchTile(
                  key: const Key('storage-data-saver'),
                  icon: Icons.data_saver_on_rounded,
                  title: 'Data saver',
                  subtitle: ref.watch(dataSaverPrefProvider) ? 'Map stays collapsed' : 'Map opens as usual',
                  value: ref.watch(dataSaverPrefProvider),
                  onChanged: (v) => ref.read(dataSaverPrefProvider.notifier).set(v),
                ),
              SettingsTile(
                key: const Key('storage-clear-cache'),
                icon: Icons.delete_outline_rounded,
                title: 'Clear cache',
                subtitle: usage == null
                    ? 'Your trips stay'
                    : 'Frees ${formatBytes(usage.cacheBytes)}. Your trips stay.',
                onTap: () => _clear(context, ref),
              ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final usage = ref.watch(storageUsageProvider);
    if (context.tokens.horizon) return _horizon(context, ref, usage.value);
    return AppScaffold(
      backgroundColor: context.tokens.bgSurface,
      appBar: AppBar(title: const Text('Storage and Data')),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 32),
        children: [
          if (ref.watch(compassFlagProvider((compassMeFlag, null))) && usage.value != null)
            _CompassUsageCard(usage: usage.value!),
          SettingsSection(
            title: 'On this device',
            children: [
              SettingsTile(
                key: const Key('storage-data'),
                icon: Icons.storage_rounded,
                title: 'Trips, expenses and receipts',
                subtitle: 'Your data, kept so the app works offline',
                trailing: SettingsBadge(usage.value == null ? '…' : formatBytes(usage.value!.dataBytes)),
              ),
              SettingsTile(
                key: const Key('storage-cache'),
                icon: Icons.cached_rounded,
                title: 'Cache',
                subtitle: 'Images and temporary files. Safe to clear, they download again when needed.',
                trailing: SettingsBadge(usage.value == null ? '…' : formatBytes(usage.value!.cacheBytes)),
              ),
            ],
          ),
          SettingsSection(
            title: 'Free up space',
            children: [
              SettingsTile(
                key: const Key('storage-clear-cache'),
                icon: Icons.cleaning_services_outlined,
                title: 'Clear cache',
                subtitle: 'Does not delete trips, expenses or anything waiting to sync',
                onTap: () async {
                  final ok = await ConfirmDialog.show(
                    context: context,
                    title: 'Clear cache?',
                    message: 'Cached images and temporary files are removed. Your trips and expenses stay.',
                    confirmLabel: 'Clear',
                  );
                  if (!ok) return;
                  await ref.read(storageGatewayProvider).clearCache();
                  ref.invalidate(storageUsageProvider);
                },
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Compass: the total on this device as one number with a data / cache split bar (flag `enableCompassMe`).
class _CompassUsageCard extends StatelessWidget {
  const _CompassUsageCard({required this.usage});

  final StorageUsage usage;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final total = usage.totalBytes == 0 ? 1 : usage.totalBytes;
    return Padding(
      key: const Key('compass-storage-card'),
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: t.bgPage,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: t.borderColor),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'ON THIS DEVICE',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.1, color: t.textMuted),
              ),
              const SizedBox(height: 4),
              Text(
                formatBytes(usage.totalBytes),
                style: AppTypography.moneyDisplay(fontSize: 34, color: t.textPrimary),
              ),
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(99),
                child: SizedBox(
                  height: 10,
                  child: Row(
                    children: [
                      Expanded(
                        flex: (usage.dataBytes * 1000 ~/ total).clamp(0, 1000),
                        child: ColoredBox(color: t.primaryAccent),
                      ),
                      Expanded(
                        flex: (usage.cacheBytes * 1000 ~/ total).clamp(0, 1000),
                        child: ColoredBox(color: t.sun),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Data ${formatBytes(usage.dataBytes)}  ·  Cache ${formatBytes(usage.cacheBytes)}',
                style: TextStyle(fontSize: 12, color: t.textSecondary),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
