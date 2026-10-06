import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/env/app_env.dart';
import '../../../core/logging/app_logger.dart';
import '../../../core/platform/share_service.dart';
import '../../../core/settings/app_settings.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../settings/presentation/settings_widgets.dart';
import '../../trips/application/trips_providers.dart';

/// Support view: app and sync state, recent (scrubbed) logs, share/copy.
class DiagnosticsScreen extends ConsumerWidget {
  const DiagnosticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(syncStatusProvider).value ?? const SyncStatus();
    final v = ref.watch(appVersionProvider).value;
    final logs = AppLogger.recent;
    final text = logs.join('\n');
    return AppScaffold(
      appBar: AppBar(
        title: const Text('Diagnostics'),
        leading: IconButton(
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          icon: const Icon(AppIcons.back, size: 20),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            key: const Key('diag-share'),
            tooltip: 'Share logs',
            icon: const Icon(AppIcons.share),
            onPressed: logs.isEmpty
                ? null
                : () => ref.read(shareServiceProvider).share(text, subject: 'Trip Tracker logs'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 32),
        children: [
          SettingsSection(
            title: 'App',
            children: [
              SettingsTile(title: 'Version', subtitle: v == null ? '' : '${v.version} (${v.build})'),
              SettingsTile(title: 'Environment', subtitle: AppEnv.current.flavor.name),
              SettingsTile(
                key: const Key('diag-sync'),
                title: 'Sync',
                subtitle: status.idle
                    ? 'Everything is synced'
                    : '${status.pending} waiting, ${status.issues} need attention',
              ),
              if (!AppEnv.current.isProd)
                SettingsTile(
                  key: const Key('diag-flags'),
                  title: 'Feature flag overrides',
                  subtitle: 'QA only',
                  onTap: () => context.push('/settings/flag-overrides'),
                ),
            ],
          ),
          SettingsSection(
            title: 'Recent logs (personal data removed)',
            children: [
              Padding(
                padding: const EdgeInsets.all(12),
                child: SelectableText(
                  logs.isEmpty ? 'No log lines yet.' : logs.reversed.take(80).toList().reversed.join('\n'),
                  key: const Key('diag-log'),
                  style: const TextStyle(fontFamily: 'monospace', fontSize: 11),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
