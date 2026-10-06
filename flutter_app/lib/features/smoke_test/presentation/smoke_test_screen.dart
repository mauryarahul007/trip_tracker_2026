import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/env/app_env.dart';
import '../../../../data/supabase/supabase_gateway.dart';
import '../../../../shared/theme/app_icons.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_scaffold.dart';

enum SmokeTestStatus { idle, running, success, failure }

class SmokeTestScreen extends ConsumerStatefulWidget {
  const SmokeTestScreen({super.key});

  @override
  ConsumerState<SmokeTestScreen> createState() => _SmokeTestScreenState();
}

class _SmokeTestScreenState extends ConsumerState<SmokeTestScreen> {
  SmokeTestStatus _status = SmokeTestStatus.idle;
  String _details =
      'Tap "Run Smoke Test" to verify network connectivity to Supabase staging.';
  int _latencyMs = 0;

  @override
  void initState() {
    super.initState();
    // Auto-run on launch for automated CI checks
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _runSmokeTest();
    });
  }

  Future<void> _runSmokeTest() async {
    if (_status == SmokeTestStatus.running) return;

    setState(() {
      _status = SmokeTestStatus.running;
      _details = 'Querying Supabase staging endpoint...';
    });

    final stopwatch = Stopwatch()..start();

    try {
      final gateway = ref.read(supabaseGatewayProvider);
      final isHealthy = await gateway.checkConnection();
      stopwatch.stop();

      if (!mounted) return;

      if (isHealthy) {
        setState(() {
          _status = SmokeTestStatus.success;
          _latencyMs = stopwatch.elapsedMilliseconds;
          _details =
              'Network gate verified! Connected to Supabase staging successfully ($_latencyMs ms).';
        });
      } else {
        setState(() {
          _status = SmokeTestStatus.failure;
          _latencyMs = stopwatch.elapsedMilliseconds;
          _details = 'Connection returned false from gateway.';
        });
      }
    } catch (e, st) {
      stopwatch.stop();
      if (!mounted) return;
      setState(() {
        _status = SmokeTestStatus.failure;
        _latencyMs = stopwatch.elapsedMilliseconds;
        _details = 'Network error: $e\n$st';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final env = AppEnv.current;

    return AppScaffold(
      appBar: AppBar(
        title: const Text('Staging Smoke Test'),
        leading: IconButton(
          icon: const Icon(AppIcons.back, size: 20),
          onPressed: () => context.pop(),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Environment Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: tokens.bgSurface,
                borderRadius: BorderRadius.circular(tokens.radiusMd),
                border: Border.all(color: tokens.borderColor),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Environment Configuration',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                      color: tokens.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  _envRow('Flavor', env.flavor.name),
                  _envRow('App Name', env.appName),
                  _envRow(
                    'Endpoint',
                    env.supabaseUrl.isEmpty ? '(Not set)' : env.supabaseUrl,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Status Card
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: _statusBg(tokens),
                  borderRadius: BorderRadius.circular(tokens.radiusLg),
                  border: Border.all(color: _statusBorder(tokens)),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _statusIcon(tokens),
                    const SizedBox(height: 16),
                    Text(
                      _statusTitle(),
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: _statusColor(tokens),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      _details,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        color: tokens.textSecondary,
                        height: 1.4,
                      ),
                    ),
                    if (_latencyMs > 0) ...[
                      const SizedBox(height: 8),
                      Text(
                        'Latency: ${_latencyMs}ms',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: tokens.textMuted,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            AppButton(
              label: 'Run Smoke Test Again',
              isLoading: _status == SmokeTestStatus.running,
              onPressed: _runSmokeTest,
              isFullWidth: true,
            ),
          ],
        ),
      ),
    );
  }

  Widget _envRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, color: Colors.grey)),
          Text(
            value,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  Color _statusColor(AppTokens tokens) {
    switch (_status) {
      case SmokeTestStatus.idle:
        return tokens.textSecondary;
      case SmokeTestStatus.running:
        return tokens.primaryAccent;
      case SmokeTestStatus.success:
        return tokens.successColor;
      case SmokeTestStatus.failure:
        return tokens.dangerColor;
    }
  }

  Color _statusBg(AppTokens tokens) {
    switch (_status) {
      case SmokeTestStatus.idle:
        return tokens.bgSurface;
      case SmokeTestStatus.running:
        return tokens.primaryAccent.withValues(alpha: 0.08);
      case SmokeTestStatus.success:
        return tokens.successColor.withValues(alpha: 0.08);
      case SmokeTestStatus.failure:
        return tokens.dangerColor.withValues(alpha: 0.08);
    }
  }

  Color _statusBorder(AppTokens tokens) {
    switch (_status) {
      case SmokeTestStatus.idle:
        return tokens.borderColor;
      case SmokeTestStatus.running:
        return tokens.primaryAccent.withValues(alpha: 0.3);
      case SmokeTestStatus.success:
        return tokens.successColor.withValues(alpha: 0.4);
      case SmokeTestStatus.failure:
        return tokens.dangerColor.withValues(alpha: 0.4);
    }
  }

  Widget _statusIcon(AppTokens tokens) {
    switch (_status) {
      case SmokeTestStatus.idle:
        return Icon(AppIcons.info, size: 48, color: tokens.textSecondary);
      case SmokeTestStatus.running:
        return SizedBox(
          width: 48,
          height: 48,
          child: CircularProgressIndicator(
            strokeWidth: 3,
            color: tokens.primaryAccent,
          ),
        );
      case SmokeTestStatus.success:
        return Icon(AppIcons.check, size: 48, color: tokens.successColor);
      case SmokeTestStatus.failure:
        return Icon(AppIcons.alert, size: 48, color: tokens.dangerColor);
    }
  }

  String _statusTitle() {
    switch (_status) {
      case SmokeTestStatus.idle:
        return 'Ready to Test';
      case SmokeTestStatus.running:
        return 'Connecting...';
      case SmokeTestStatus.success:
        return 'Staging Connection Verified';
      case SmokeTestStatus.failure:
        return 'Verification Failed';
    }
  }
}
