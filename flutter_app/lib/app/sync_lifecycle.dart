import 'dart:async';
import 'dart:convert';

import 'package:crypto/crypto.dart';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/env/app_env.dart';
import '../core/links/signup_attribution.dart';
import '../core/network/connectivity_provider.dart';
import '../core/logging/crash_reporter.dart';
import '../core/telemetry/auto_bug_reporter.dart';
import '../core/telemetry/growth_telemetry.dart';
import '../core/version/version_gate.dart';
import '../data/sync/sync_engine.dart' show FlushResult;
import '../features/feedback/application/feedback_providers.dart';
import '../features/trips/application/trips_providers.dart' show SyncStatus, syncStatusProvider, tripsProvider;
import '../features/notifications/application/notification_providers.dart';
import '../data/supabase/supabase_gateway.dart';
import '../data/providers.dart';
import 'auth_state.dart';

/// Starts sync once a real (non-guest) session exists and re-triggers it on
/// foreground / connectivity regained. Pauses realtime in the background.
class SyncLifecycle extends ConsumerStatefulWidget {
  const SyncLifecycle({required this.child, super.key});
  final Widget child;

  @override
  ConsumerState<SyncLifecycle> createState() => _SyncLifecycleState();
}

class _SyncLifecycleState extends ConsumerState<SyncLifecycle> with WidgetsBindingObserver {
  bool get _syncing {
    final a = ref.read(authStateProvider);
    return AppEnv.current.hasBackend && a.isAuthenticated && !a.isLocalOnly;
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    unawaited(_results?.cancel());
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) ref.invalidate(versionGateProvider); // kill switch: re-check on resume
    if (!_syncing) return;
    final c = ref.read(syncCoordinatorProvider);
    if (state == AppLifecycleState.resumed) {
      c.onForeground();
      _refreshFlagsIfStale();
    }
    if (state == AppLifecycleState.paused) c.onBackground();
  }

  DateTime _flagsAt = DateTime.now();

  /// Remote kill-switch: flags older than 15 minutes are re-fetched when the app returns.
  void _refreshFlagsIfStale() {
    if (DateTime.now().difference(_flagsAt) < const Duration(minutes: 15)) return;
    _flagsAt = DateTime.now();
    unawaited(ref.read(flagsRepositoryProvider).refresh());
  }

  StreamSubscription<FlushResult>? _results;

  /// Opaque, stable id for crash and bug reports: never the raw user id or email.
  String _hash(String userId) => sha256.convert(utf8.encode(userId)).toString().substring(0, 16);

  void _identify(AuthState a) {
    final synced = AppEnv.current.hasBackend && a.isAuthenticated && !a.isLocalOnly;
    final crash = ref.read(crashReporterProvider);
    final telemetry = ref.read(growthTelemetryProvider);
    unawaited(_results?.cancel());
    _results = null;
    if (!synced) {
      AutoBugReporter.instance.detach();
      unawaited(crash.clearUserIdentifier());
      telemetry.configure(on: false, userId: null);
      return;
    }
    final hash = _hash(a.userId!);
    AutoBugReporter.instance.attach(
      ref.read(feedbackRepositoryProvider),
      () => ref.read(feedbackEnvironmentProvider)('auto'),
      userHash: hash,
    );
    unawaited(crash.setUserIdentifier(hash));
    telemetry.configure(on: ref.read(flagProvider(('enableGrowthTelemetry', null))).value ?? false, userId: a.userId);
    _results = ref.read(syncEngineProvider).results.listen((r) {
      if (r.failed > 0 || r.poisoned > 0) telemetry.track(GrowthEvent.syncFail);
      if (r.sent > 0) telemetry.track(GrowthEvent.flushOk);
    });
  }

  void _start(AuthState a) {
    _identify(a);
    if (!(AppEnv.current.hasBackend && a.isAuthenticated && !a.isLocalOnly)) return;
    unawaited(ref.read(syncCoordinatorProvider).start().whenComplete(() => ref.invalidate(tripsProvider)));
    ref.read(realtimeManagerProvider).watchNotifications(a.userId!);
    unawaited(ref.read(notificationRepositoryProvider).refresh(a.userId!));
    _flagsAt = DateTime.now();
    ref.read(flagsRepositoryProvider).refresh();
    unawaited(_flushAttribution());
  }

  /// First-touch attribution from a deep link; the RPC ignores repeats.
  Future<void> _flushAttribution() async {
    final store = ref.read(signupAttributionStoreProvider);
    final attr = store.load();
    if (attr == null) return;
    try {
      await ref.read(supabaseGatewayProvider).client.rpc<dynamic>('record_signup_source', params: {'p_source': attr});
      await store.clear();
    } catch (_) {
      // Keep it for the next launch.
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AuthState>(authStateProvider, (prev, next) {
      if (prev?.userId != next.userId) _start(next);
    });
    ref.listen<AsyncValue<bool>>(flagProvider(('enableGrowthTelemetry', null)), (_, next) {
      final a = ref.read(authStateProvider);
      ref
          .read(growthTelemetryProvider)
          .configure(on: (next.value ?? false) && _syncing, userId: _syncing ? a.userId : null);
    });
    ref.listen<AsyncValue<SyncStatus>>(syncStatusProvider, (_, next) {
      final st = next.value;
      if (st != null) {
        ref
            .read(growthTelemetryProvider)
            .onQueue(pending: st.pending, online: ref.read(isOnlineProvider).value ?? true);
      }
    });
    ref.listen<AsyncValue<bool>>(isOnlineProvider, (prev, next) {
      if (prev?.value == false && next.value == true && _syncing) {
        ref.read(syncCoordinatorProvider).onConnectivityRegained();
      }
    });
    return widget.child;
  }
}
