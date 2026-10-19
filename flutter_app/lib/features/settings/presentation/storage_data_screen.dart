import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../application/settings_data.dart';
import 'settings_widgets.dart';

/// How much space the app uses on this phone, and a button to free the re-downloadable part.
class StorageDataScreen extends ConsumerWidget {
  const StorageDataScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final usage = ref.watch(storageUsageProvider);
    return AppScaffold(
      backgroundColor: context.tokens.bgSurface,
      appBar: AppBar(title: const Text('Storage and Data')),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 32),
        children: [
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
