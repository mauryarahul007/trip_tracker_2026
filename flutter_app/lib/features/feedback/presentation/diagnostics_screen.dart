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
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_surface.dart' show AppCard;

/// Support view: app and sync state, recent (scrubbed) logs, share/copy.
class DiagnosticsScreen extends ConsumerWidget {
  const DiagnosticsScreen({super.key});

  /// Horizon ("Diagnostics" mockup): Sync and Queue cards, an app/issues card, the log in a mono block and
  /// Copy log.
  Widget _horizon(BuildContext context, WidgetRef ref, SyncStatus status, String version, List<String> logs) {
    final t = context.tokens;
    final ok = status.idle && status.issues == 0;
    Widget card({required Widget child, Key? key}) => Container(
      key: key,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: t.bgSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: t.borderColor),
      ),
      child: child,
    );
    TextStyle eyebrow() => TextStyle(
      fontFamily: AppTypography.fontMono,
      fontSize: 11,
      letterSpacing: 1.1,
      fontWeight: FontWeight.w600,
      color: t.textSecondary,
    );
    Widget row(IconData icon, String title, String sub) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(color: t.bgSurfaceHover, borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, size: 18, color: t.textSecondary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontFamily: AppTypography.fontBody,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: t.textPrimary,
                  ),
                ),
                Text(
                  sub,
                  style: TextStyle(fontFamily: AppTypography.fontBody, fontSize: 13, color: t.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
    final tone = ok ? t.colorSuccess : t.colorWarning;
    return ListView(
      key: const Key('horizon-diagnostics'),
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      children: [
        Row(
          children: [
            Expanded(
              child: card(
                key: const Key('diag-sync'),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('SYNC', style: eyebrow()),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: tone.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(ok ? Icons.check_rounded : Icons.sync_rounded, size: 14, color: tone),
                          const SizedBox(width: 4),
                          Text(
                            ok ? 'Healthy' : (status.issues > 0 ? 'Needs attention' : 'Syncing'),
                            style: TextStyle(
                              fontFamily: AppTypography.fontBody,
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: tone,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: card(
                key: const Key('diag-queue'),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('QUEUE', style: eyebrow()),
                    const SizedBox(height: 4),
                    Text(
                      '${status.pending}',
                      style: TextStyle(
                        fontFamily: AppTypography.fontMono,
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: t.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        card(
          child: Column(
            children: [
              row(
                Icons.cloud_outlined,
                'Sync',
                status.idle ? 'Everything is synced' : '${status.pending} waiting, ${status.issues} need attention',
              ),
              Divider(height: 1, color: t.borderColor),
              row(Icons.phone_android_rounded, 'App', '$version · ${AppEnv.current.flavor.name}'),
            ],
          ),
        ),
        if (!AppEnv.current.isProd) ...[
          const SizedBox(height: 10),
          Material(
            color: t.bgSurface,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(color: t.borderColor),
            ),
            clipBehavior: Clip.antiAlias,
            child: SettingsTile(
              key: const Key('diag-flags'),
              icon: Icons.flag_outlined,
              title: 'Feature flag overrides',
              subtitle: 'QA only',
              onTap: () => context.push('/settings/flag-overrides'),
            ),
          ),
        ],
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: t.bgSurfaceHover, borderRadius: BorderRadius.circular(16)),
          child: SelectableText(
            logs.isEmpty ? 'No log lines yet.' : logs.reversed.take(80).toList().reversed.join('\n'),
            key: const Key('diag-log'),
            style: TextStyle(fontFamily: AppTypography.fontMono, fontSize: 12, height: 1.6, color: t.textPrimary),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 52,
          child: OutlinedButton.icon(
            key: const Key('diag-copy'),
            style: OutlinedButton.styleFrom(
              foregroundColor: t.textPrimary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              textStyle: const TextStyle(fontFamily: AppTypography.fontBody, fontSize: 16, fontWeight: FontWeight.w700),
            ),
            onPressed: logs.isEmpty
                ? null
                : () async {
                    await ref.read(shareServiceProvider).copy(logs.join('\n'));
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Log copied')));
                  },
            icon: const Icon(Icons.copy_rounded, size: 18),
            label: const Text('Copy log'),
          ),
        ),
      ],
    );
  }

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
      body: context.tokens.horizon
          ? _horizon(context, ref, status, v == null ? '-' : '${v.version} (${v.build})', logs)
          : ListView(
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
                      decoration: BoxDecoration(
                        color: Color.alphaBlend(
                          context.tokens.textPrimary.withValues(alpha: 0.06),
                          context.tokens.bgSurface,
                        ),
                        border: Border.symmetric(
                          horizontal: BorderSide(color: context.tokens.textMuted.withValues(alpha: 0.25)),
                        ),
                      ),
                      padding: const EdgeInsets.all(14),
                      child: SelectableText(
                        logs.isEmpty ? 'No log lines yet.' : logs.reversed.take(80).toList().reversed.join('\n'),
                        key: const Key('diag-log'),
                        style: TextStyle(
                          fontFamily: 'monospace',
                          fontSize: 11,
                          height: 1.6,
                          color: context.tokens.textSecondary,
                        ),
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
