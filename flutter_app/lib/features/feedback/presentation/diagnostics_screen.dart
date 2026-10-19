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
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_surface.dart' show AppCard;

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
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Row(
              children: [
                Expanded(
                  child: _Kpi(label: 'Version', value: v == null ? '-' : '${v.version} (${v.build})'),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _Kpi(label: 'Env', value: AppEnv.current.flavor.name),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _Kpi(
                    key: const Key('diag-sync'),
                    label: 'Sync',
                    value: status.idle ? 'Synced' : '${status.pending} pending',
                    valueColor: status.idle ? context.tokens.successColor : context.tokens.warningColor,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
            child: Text(
              status.idle ? 'Everything is synced' : '${status.pending} waiting, ${status.issues} need attention',
              style: TextStyle(fontSize: 13, color: context.tokens.textSecondary),
            ),
          ),
          if (!AppEnv.current.isProd)
            SettingsSection(
              title: 'QA',
              children: [
                SettingsTile(
                  key: const Key('diag-flags'),
                  icon: Icons.flag_outlined,
                  title: 'Feature flag overrides',
                  subtitle: 'QA only',
                  onTap: () => context.push('/settings/flag-overrides'),
                ),
              ],
            ),
          SettingsSection(
            title: 'Recent logs (personal data removed)',
            children: [
              Container(
                width: double.infinity,
                color: const Color(0xFF0B0F14),
                padding: const EdgeInsets.all(14),
                child: SelectableText(
                  logs.isEmpty ? 'No log lines yet.' : logs.reversed.take(80).toList().reversed.join('\n'),
                  key: const Key('diag-log'),
                  style: const TextStyle(fontFamily: 'monospace', fontSize: 11, height: 1.6, color: Color(0xFF7CF0A2)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Kpi extends StatelessWidget {
  const _Kpi({required this.label, required this.value, this.valueColor, super.key});

  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return AppCard(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 11, color: t.textMuted)),
          const SizedBox(height: 4),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: valueColor ?? t.textPrimary),
          ),
        ],
      ),
    );
  }
}
