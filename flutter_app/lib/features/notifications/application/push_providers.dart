import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/auth_state.dart';
import '../../../core/env/app_env.dart';
import '../../../core/platform/push_gateway.dart';
import '../../../core/settings/app_settings.dart';
import '../../../core/storage/prefs.dart';
import '../../../data/push/push_service.dart';
import '../../../data/supabase/supabase_gateway.dart';

final pushServiceProvider = Provider<PushService>(
  (ref) => PushService(
    ref.watch(pushGatewayProvider),
    AppEnv.current.hasBackend ? SupabasePushTokenBackend(ref.watch(supabaseGatewayProvider).client) : null,
    () async => (await ref.read(appVersionProvider.future)).version,
  ),
);

final pushSenderProvider = Provider<PushSender>(
  (ref) => PushSender(AppEnv.current.hasBackend ? ref.watch(supabaseGatewayProvider).client : null),
);

const _promptedKey = 'push.prompted';

/// Push permission state plus the contextual ask. The prompt is shown once, after the first
/// meaningful action (a trip created or an expense saved), never at launch.
class PushController extends AsyncNotifier<PushPermission> {
  @override
  Future<PushPermission> build() => ref.read(pushGatewayProvider).permission();

  bool get _signedIn => ref.read(authStateProvider.select((a) => a.user != null && !a.isLocalOnly));

  bool get shouldAsk =>
      _signedIn &&
      state.value == PushPermission.notDetermined &&
      !(ref.read(sharedPreferencesProvider).getBool(_promptedKey) ?? false);

  Future<void> markPrompted() => ref.read(sharedPreferencesProvider).setBool(_promptedKey, true);

  /// Runs the system prompt, then registers this device when granted.
  Future<PushPermission> enable() async {
    final r = await ref.read(pushGatewayProvider).requestPermission();
    state = AsyncData(r);
    if (r == PushPermission.granted && _signedIn) unawaited(ref.read(pushServiceProvider).register());
    return r;
  }
}

final pushControllerProvider = AsyncNotifierProvider<PushController, PushPermission>(PushController.new);
