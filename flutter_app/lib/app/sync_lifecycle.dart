import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/env/app_env.dart';
import '../core/links/signup_attribution.dart';
import '../core/network/connectivity_provider.dart';
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

class _SyncLifecycleState extends ConsumerState<SyncLifecycle>
    with WidgetsBindingObserver {
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
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!_syncing) return;
    final c = ref.read(syncCoordinatorProvider);
    if (state == AppLifecycleState.resumed) c.onForeground();
    if (state == AppLifecycleState.paused) c.onBackground();
  }

  void _start(AuthState a) {
    if (!(AppEnv.current.hasBackend && a.isAuthenticated && !a.isLocalOnly)) return;
    ref.read(syncCoordinatorProvider).start();
    ref.read(realtimeManagerProvider).watchNotifications(a.userId!);
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
    ref.listen<AsyncValue<bool>>(isOnlineProvider, (prev, next) {
      if (prev?.value == false && next.value == true && _syncing) {
        ref.read(syncCoordinatorProvider).onConnectivityRegained();
      }
    });
    return widget.child;
  }
}
