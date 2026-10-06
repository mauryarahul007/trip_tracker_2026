import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/env/app_env.dart';
import '../core/flags/flag_overrides.dart';
import '../core/network/connectivity_provider.dart';
import '../core/storage/prefs.dart';
import '../domain/repositories/repositories.dart';
import 'local/app_database.dart';
import 'realtime/realtime_manager.dart';
import 'realtime/realtime_source.dart';
import 'repositories/drift_flags_repository.dart';
import 'repositories/drift_repositories.dart';
import 'repositories/supabase_auth_repository.dart';
import 'repositories/supabase_join_share_repository.dart';
import 'supabase/supabase_gateway.dart';
import 'remote/expense_online_api.dart';
import 'storage/receipt_store.dart';
import 'sync/expense_side_effects.dart';
import '../features/notifications/application/push_providers.dart';
import 'sync/conflict_store.dart';
import 'sync/outbox_store.dart';
import 'sync/supabase_outbox_remote.dart';
import 'sync/sync_coordinator.dart';
import 'sync/sync_engine.dart';
import 'sync/trip_pull_sync.dart';

final outboxStoreProvider = Provider<OutboxStore>((ref) => OutboxStore(ref.watch(appDatabaseProvider)));

final syncEngineProvider = Provider<SyncEngine>((ref) {
  final auth = ref.watch(supabaseGatewayProvider).auth;
  final engine = SyncEngine(
    store: ref.watch(outboxStoreProvider),
    remote: () {
      final client = ref.watch(supabaseGatewayProvider).client;
      return SupabaseOutboxRemote(
        client,
        effects: ExpenseSideEffects(
          receipts: SupabaseReceiptUploader(client, ref.watch(appDatabaseProvider)),
          chat: SupabaseChatEventSender(client),
          push: SupabaseExpensePushSender(client),
        ),
      );
    }(),
    isOnline: checkInitialConnection,
    ensureSession: () async {
      final s = auth.currentSession;
      if (s == null) return false;
      final exp = s.expiresAt;
      final nearExpiry =
          exp != null &&
          DateTime.fromMillisecondsSinceEpoch(exp * 1000).difference(DateTime.now()) < const Duration(seconds: 60);
      if (!nearExpiry) return true;
      try {
        await auth.refreshSession();
        return true;
      } catch (_) {
        return false; // pause; queued work is kept
      }
    },
  );
  ref.onDispose(engine.dispose);
  return engine;
});

final tripPullSyncProvider = Provider<TripPullSync>(
  (ref) => TripPullSync(
    ref.watch(appDatabaseProvider),
    ref.watch(outboxStoreProvider),
    SupabaseTripReader(ref.watch(supabaseGatewayProvider).client),
  ),
);

final realtimeManagerProvider = Provider<RealtimeManager>((ref) {
  final pull = ref.watch(tripPullSyncProvider);
  final m = RealtimeManager(
    source: SupabaseRealtimeSource(ref.watch(supabaseGatewayProvider).client),
    db: ref.watch(appDatabaseProvider),
    onResync: (tripId) async {
      await pull.syncTrip(tripId);
    },
  );
  ref.onDispose(m.dispose);
  return m;
});

final syncCoordinatorProvider = Provider<SyncCoordinator>((ref) {
  final c = SyncCoordinator(
    engine: ref.watch(syncEngineProvider),
    pull: ref.watch(tripPullSyncProvider),
    realtime: ref.watch(realtimeManagerProvider),
    onPulled: (results) {
      final store = ref.read(conflictStoreProvider.notifier);
      results.forEach((tripId, r) => store.setForTrip(tripId, r.conflicts));
    },
  );
  ref.onDispose(c.dispose);
  return c;
});

/// Guests/demo and no-backend builds are local-only: nothing to flush.
void Function() _requestSync(Ref ref) => () {
  final u = ref.read(authRepositoryProvider).currentUser;
  if (!AppEnv.current.hasBackend || u == null || u.isLocalOnly) return;
  ref.read(syncCoordinatorProvider).requestFlush();
};

final tripRepositoryProvider = Provider<TripRepository>(
  (ref) => DriftTripRepository(ref.watch(appDatabaseProvider), ref.watch(outboxStoreProvider), _requestSync(ref)),
);
final expenseRepositoryProvider = Provider<ExpenseRepository>(
  (ref) => DriftExpenseRepository(
    ref.watch(appDatabaseProvider),
    ref.watch(outboxStoreProvider),
    _requestSync(ref),
    api: AppEnv.current.hasBackend ? SupabaseExpenseOnlineApi(ref.watch(supabaseGatewayProvider).client) : null,
  ),
);

/// Receipt photos waiting to upload (file copies + bookkeeping).
final receiptStoreProvider = Provider<ReceiptStore>((ref) => ReceiptStore(ref.watch(appDatabaseProvider)));
final memberRepositoryProvider = Provider<MemberRepository>(
  (ref) => DriftMemberRepository(ref.watch(appDatabaseProvider), ref.watch(outboxStoreProvider), _requestSync(ref)),
);
final messageRepositoryProvider = Provider<MessageRepository>(
  (ref) => DriftMessageRepository(ref.watch(appDatabaseProvider), ref.watch(outboxStoreProvider), _requestSync(ref)),
);
final categoryRepositoryProvider = Provider<CategoryRepository>(
  (ref) => DriftCategoryRepository(ref.watch(appDatabaseProvider), ref.watch(outboxStoreProvider), _requestSync(ref)),
);

final flagOverrideStoreProvider = Provider<FlagOverrideStore>(
  (ref) => FlagOverrideStore(ref.watch(sharedPreferencesProvider)),
);

final flagsRepositoryProvider = Provider<FlagsRepository>((ref) {
  final client = AppEnv.current.hasBackend ? ref.watch(supabaseGatewayProvider).client : null;
  final inner = DriftFlagsRepository(ref.watch(appDatabaseProvider), (tripId) async {
    if (client == null) return null; // local-only: registry defaults apply
    final res = await client.rpc<dynamic>('get_resolved_feature_flags', params: {'p_trip_id': tripId});
    if (res is! Map) return null;
    Map<String, bool> layer(Object? m) =>
        m is Map ? {for (final e in m.entries) e.key as String: e.value == true} : const {};
    return ResolvedFlags(global: layer(res['global']), trip: layer(res['trip']), user: layer(res['user']));
  });
  // QA overrides exist only outside prod, so a shipped build can never be flipped locally.
  return AppEnv.current.isProd ? inner : OverridableFlagsRepository(inner, ref.watch(flagOverrideStoreProvider));
});

/// Convenience: `ref.watch(flagProvider(('enableAchievements', null)))`.
final flagProvider = StreamProvider.family<bool, (String, String?)>(
  (ref, a) => ref.watch(flagsRepositoryProvider).watch(a.$1, tripId: a.$2),
);

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final repo = SupabaseAuthRepository(
    AppEnv.current.hasBackend ? ref.watch(supabaseGatewayProvider).client : null,
    ref.watch(appDatabaseProvider),
    unregisterPush: (userId) => ref.read(pushServiceProvider).unregister(userId),
    beforeWipe: () async {
      await ref.read(syncEngineProvider).flush(); // best effort; offline = no-op
    },
  );
  ref.onDispose(repo.dispose);
  return repo;
});

final joinRepositoryProvider = Provider<JoinRepository>(
  (ref) => SupabaseJoinRepository(ref.watch(supabaseGatewayProvider).client),
);
final shareRepositoryProvider = Provider<ShareRepository>(
  (ref) => SupabaseShareRepository(ref.watch(supabaseGatewayProvider).client),
);
