import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/supabase/supabase_gateway.dart';
import '../../domain/logic/version_gate.dart';
import '../env/app_env.dart';
import '../logging/app_logger.dart';
import '../platform/external_launcher.dart';
import '../settings/app_settings.dart';

/// 'ios' | 'android' | '' (anything else is never gated). Tests override this.
final gatePlatformProvider = Provider<String>((ref) => Platform.isIOS ? 'ios' : (Platform.isAndroid ? 'android' : ''));

/// Fetches the gate once; `ref.invalidate` on app resume re-checks it. Any failure = ok.
final versionGateProvider = FutureProvider<VersionGateDecision>((ref) async {
  if (!AppEnv.current.hasBackend) return VersionGateDecision.ok;
  final platform = ref.watch(gatePlatformProvider);
  if (platform.isEmpty) return VersionGateDecision.ok;
  try {
    final v = await ref.watch(appVersionProvider.future);
    final res = await ref
        .read(supabaseGatewayProvider)
        .client
        .rpc<dynamic>(
          'get_app_version_gate',
          params: {'p_client': 'flutter', 'p_platform': platform, 'p_version': v.version},
        )
        .timeout(const Duration(seconds: 6));
    return decideVersionGate(res);
  } catch (e) {
    AppLogger.warn('Version gate check failed (fail-open): $e');
    return VersionGateDecision.ok;
  }
});

/// Hard block (update required / maintenance) or soft nudge banner above the app.
class VersionGateHost extends ConsumerStatefulWidget {
  const VersionGateHost({required this.child, super.key});

  final Widget child;

  @override
  ConsumerState<VersionGateHost> createState() => _VersionGateHostState();
}

class _VersionGateHostState extends ConsumerState<VersionGateHost> {
  bool _softDismissed = false;

  @override
  Widget build(BuildContext context) {
    final d = ref.watch(versionGateProvider).value ?? VersionGateDecision.ok;
    final launch = ref.read(externalLauncherProvider);
    switch (d.status) {
      case GateStatus.hard:
      case GateStatus.maintenance:
        return _Blocker(
          key: const Key('version-gate-block'),
          maintenance: d.status == GateStatus.maintenance,
          message: d.message,
          onUpdate: d.storeUrl.isEmpty ? null : () => launch(Uri.parse(d.storeUrl)),
          onRetry: () => ref.invalidate(versionGateProvider),
        );
      case GateStatus.soft when !_softDismissed:
        return Column(
          children: [
            Material(
              key: const Key('version-gate-soft'),
              color: Theme.of(context).colorScheme.primaryContainer,
              child: SafeArea(
                bottom: false,
                child: Row(
                  children: [
                    const SizedBox(width: 16),
                    const Expanded(child: Text('A new version of Trip Tracker is available.')),
                    if (d.storeUrl.isNotEmpty)
                      TextButton(onPressed: () => launch(Uri.parse(d.storeUrl)), child: const Text('Update')),
                    // No tooltip: this sits above the Navigator, so there is no Overlay for one.
                    IconButton(
                      key: const Key('version-gate-dismiss'),
                      icon: const Icon(Icons.close_rounded, size: 18, semanticLabel: 'Dismiss'),
                      onPressed: () => setState(() => _softDismissed = true),
                    ),
                  ],
                ),
              ),
            ),
            Expanded(child: widget.child),
          ],
        );
      default:
        return widget.child;
    }
  }
}

class _Blocker extends StatelessWidget {
  const _Blocker({
    required this.maintenance,
    required this.message,
    required this.onUpdate,
    required this.onRetry,
    super.key,
  });

  final bool maintenance;
  final String message;
  final VoidCallback? onUpdate;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: theme.scaffoldBackgroundColor,
      child: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(maintenance ? Icons.build_circle_outlined : Icons.system_update_rounded, size: 56),
                const SizedBox(height: 16),
                Text(maintenance ? 'Back soon' : 'Update required', style: theme.textTheme.headlineSmall),
                const SizedBox(height: 8),
                Text(
                  maintenance
                      ? (message.isEmpty
                            ? 'Trip Tracker is undergoing maintenance. Please check back shortly.'
                            : message)
                      : 'This version is no longer supported. Update Trip Tracker to keep your trips in sync.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                if (!maintenance && onUpdate != null)
                  FilledButton(
                    key: const Key('version-gate-update'),
                    onPressed: onUpdate,
                    child: const Text('Update now'),
                  ),
                if (maintenance)
                  FilledButton(
                    key: const Key('version-gate-retry'),
                    onPressed: onRetry,
                    child: const Text('Try again'),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
