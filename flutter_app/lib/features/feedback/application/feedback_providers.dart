import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/storage/prefs.dart';
import '../../../core/telemetry/growth_telemetry.dart';

import '../../../app/auth_state.dart';
import '../../../core/env/app_env.dart';
import '../../../core/settings/app_settings.dart';
import '../../../core/version/version_gate.dart';
import '../../../core/network/connectivity_provider.dart';
import '../../../data/feedback/feedback_queue.dart';
import '../../../data/providers.dart' show flagProvider;
import '../../../data/repositories/supabase_feedback_repository.dart';
import '../../../domain/logic/bug_report.dart';
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

/// Bug reports and suggestions waiting on this phone for a connection (flag `enableOfflineFeedback`). Offline, or when
/// a send fails, they are saved and sent automatically once the connection is back; with the flag off a send needs
/// the network now, as before.
class FeedbackQueueNotifier extends Notifier<List<PendingFeedback>> {
  FeedbackQueue get _queue => FeedbackQueue(ref.read(sharedPreferencesProvider), ref.read(feedbackRepositoryProvider));

  bool get _enabled => ref.read(flagProvider(('enableOfflineFeedback', null))).value ?? true;
  bool get _online => ref.read(isOnlineProvider).value ?? true;
  bool get _signedIn {
    final a = ref.read(authStateProvider);
    return a.user != null && !a.isLocalOnly;
  }

  @override
  List<PendingFeedback> build() {
    ref.watch(flagProvider(('enableOfflineFeedback', null))); // keep it loaded, so the first send already knows
    return _queue.pending;
  }

  Future<FeedbackOutcome> submitBug(BugReport report) async {
    if (!_enabled) return FeedbackOutcome.sent(await ref.read(feedbackRepositoryProvider).reportBug(report));
    if (!_signedIn) throw const FeedbackUnavailable();
    final q = _queue;
    final out = await q.submitBug(report, online: _online);
    state = q.pending;
    return out;
  }

  Future<FeedbackOutcome> submitFeature({
    required String title,
    required String description,
    required String category,
    required String requestedBy,
    required Map<String, Object?> environment,
  }) async {
    if (!_enabled) {
      await ref
          .read(feedbackRepositoryProvider)
          .submitFeatureRequest(
            title: title,
            description: description,
            category: category,
            requestedBy: requestedBy,
            environment: environment,
          );
      return const FeedbackOutcome.sent();
    }
    if (!_signedIn) throw const FeedbackUnavailable();
    final q = _queue;
    final out = await q.submitFeature(
      title: title,
      description: description,
      category: category,
      requestedBy: requestedBy,
      environment: environment,
      online: _online,
    );
    state = q.pending;
    return out;
  }

  /// Sends what is waiting (called when the connection returns, the app comes back, or the user signs in).
  Future<int> flush() async {
    if (!_enabled || !_signedIn || !_online) return 0;
    final q = _queue;
    final sent = await q.flush();
    state = q.pending;
    if (sent > 0) ref.invalidate(myBugReportsProvider);
    return sent;
  }
}

final feedbackQueueProvider = NotifierProvider<FeedbackQueueNotifier, List<PendingFeedback>>(FeedbackQueueNotifier.new);
