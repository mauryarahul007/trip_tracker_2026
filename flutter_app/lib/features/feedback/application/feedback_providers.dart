import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/storage/prefs.dart';
import '../../../core/telemetry/growth_telemetry.dart';

import '../../../app/auth_state.dart';
import '../../../core/env/app_env.dart';
import '../../../core/settings/app_settings.dart';
import '../../../core/version/version_gate.dart';
import '../../../data/repositories/supabase_feedback_repository.dart';
import '../../../data/supabase/supabase_gateway.dart';
import '../../../domain/repositories/feedback_repository.dart';

final feedbackRepositoryProvider = Provider<FeedbackRepository>(
  (ref) => SupabaseFeedbackRepository(AppEnv.current.hasBackend ? ref.watch(supabaseGatewayProvider).client : null),
);

/// `environment` JSON shared by bug reports and feature requests (no personal data).
final feedbackEnvironmentProvider = Provider<Future<Map<String, Object?>> Function(String route)>(
  (ref) => (route) async {
    final v = await ref.read(appVersionProvider.future);
    return {
      'platform': ref.read(gatePlatformProvider).isEmpty ? 'android' : ref.read(gatePlatformProvider),
      'client': 'flutter',
      'isOnline': true,
      'appVersion': v.version,
      'route': route,
    };
  },
);

final myBugReportsProvider = FutureProvider.autoDispose((ref) {
  ref.watch(authStateProvider.select((a) => a.userId));
  return ref.watch(feedbackRepositoryProvider).myBugReports();
});

/// Growth telemetry (flag `enableGrowthTelemetry`): inserts into `app_events` (migration 0108).
final growthTelemetryProvider = Provider<GrowthTelemetry>((ref) {
  final client = AppEnv.current.hasBackend ? ref.watch(supabaseGatewayProvider).client : null;
  return GrowthTelemetry(
    prefs: ref.watch(sharedPreferencesProvider),
    send: (userId, event) async {
      if (client == null) return;
      final v = await ref.read(appVersionProvider.future);
      await client.from('app_events').insert({
        'user_id': userId,
        'event': event,
        'props': {'platform': ref.read(gatePlatformProvider), 'client': 'flutter', 'appVersion': v.version},
      });
    },
  );
});
