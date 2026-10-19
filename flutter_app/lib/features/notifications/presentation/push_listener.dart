import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/auth_state.dart';
import '../../../app/router.dart';
import '../../../core/env/app_env.dart';
import '../../../core/platform/push_gateway.dart';
import '../../../domain/logic/push_routing.dart';
import '../application/push_providers.dart';

/// Registers the device token once a real account is signed in, and routes taps on a push
/// (background tap and cold start) to the right trip tab. It renders nothing itself.
class PushListener extends ConsumerStatefulWidget {
  const PushListener({required this.child, super.key});

  final Widget child;

  @override
  ConsumerState<PushListener> createState() => _PushListenerState();
}

class _PushListenerState extends ConsumerState<PushListener> {
  StreamSubscription<PushMessage>? _opened;
  PushMessage? _pending;
  bool _started = false;

  bool get _authenticated => ref.read(authStateProvider).isAuthenticated;

  /// Only real accounts have a device token to register.
  bool get _hasAccount {
    final a = ref.read(authStateProvider);
    return AppEnv.current.hasBackend && a.isAuthenticated && !a.isLocalOnly;
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _start());
  }

  Future<void> _start() async {
    if (_started || !mounted) return;
    _started = true;
    final gw = ref.read(pushGatewayProvider);
    if (!await gw.initialize() || !mounted) return;
    _opened = gw.onOpened.listen(_tap);
    final first = await gw.initialMessage();
    if (first != null) _tap(first);
  }

  /// A tap before sign-in is parked and replayed once the session exists.
  void _tap(PushMessage m) {
    if (!_authenticated) {
      _pending = m;
      return;
    }
    final route = routeForPush(m.data);
    if (route != null) ref.read(routerProvider).go(route);
  }

  @override
  void dispose() {
    unawaited(_opened?.cancel());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AuthState>(authStateProvider, (prev, next) {
      if (prev?.userId == next.userId || !_authenticated) return;
      if (_hasAccount) unawaited(ref.read(pushServiceProvider).register());
      final p = _pending;
      if (p != null) {
        _pending = null;
        _tap(p);
      }
    });
    return widget.child;
  }
}
