import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/env/app_env.dart';
import '../../../data/repositories/supabase_admin_repository.dart';
import '../../../data/supabase/supabase_gateway.dart';
import '../../../domain/models/admin.dart';
import '../../../domain/models/admin_fleet.dart';
import '../../../domain/repositories/admin_repository.dart';

final adminRepositoryProvider = Provider<AdminRepository>(
  (ref) => SupabaseAdminRepository(AppEnv.current.hasBackend ? ref.watch(supabaseGatewayProvider).client : null),
);

// autoDispose: leaving the portal drops the lists, so a returning superadmin always sees fresh data.
final adminBugsProvider = FutureProvider.autoDispose<List<AdminBug>>(
  (ref) => ref.watch(adminRepositoryProvider).bugs(),
);
final adminUsersProvider = FutureProvider.autoDispose<List<AdminUser>>(
  (ref) => ref.watch(adminRepositoryProvider).users(),
);
final adminTripsProvider = FutureProvider.autoDispose<List<AdminTrip>>(
  (ref) => ref.watch(adminRepositoryProvider).trips(),
);
final adminFlagOverridesProvider = FutureProvider.autoDispose<List<FlagOverride>>(
  (ref) => ref.watch(adminRepositoryProvider).flagOverrides(),
);

final adminConfigProvider = FutureProvider.autoDispose<AdminConfig>(
  (ref) => ref.watch(adminRepositoryProvider).appConfig(),
);
final adminAuditProvider = FutureProvider.autoDispose<List<AuditEntry>>(
  (ref) => ref.watch(adminRepositoryProvider).auditLogs(),
);
final adminFeaturesProvider = FutureProvider.autoDispose<List<AdminFeature>>(
  (ref) => ref.watch(adminRepositoryProvider).features(),
);
final adminRecycledCountProvider = FutureProvider.autoDispose<int>(
  (ref) => ref.watch(adminRepositoryProvider).recycledExpenseCount(),
);
final adminNotificationStatsProvider = FutureProvider.autoDispose<NotificationStats>(
  (ref) => ref.watch(adminRepositoryProvider).notificationStats(),
);
final adminDevicesProvider = FutureProvider.autoDispose<Map<String, int>>(
  (ref) => ref.watch(adminRepositoryProvider).devicePlatformCounts(),
);
final adminRetentionProvider = FutureProvider.autoDispose<List<RetentionCohort>>(
  (ref) => ref.watch(adminRepositoryProvider).retentionCohorts(),
);
final adminRepeatCreatorsProvider = FutureProvider.autoDispose<({int eligible, int repeat})>(
  (ref) => ref.watch(adminRepositoryProvider).repeatCreatorRate(),
);
final adminReliabilityProvider = FutureProvider.autoDispose<List<ReliabilityGroup>>(
  (ref) => ref.watch(adminRepositoryProvider).reliability(),
);

/// One heavy read (all trips, members and expenses) shared by every analytics tab.
final adminFleetProvider = FutureProvider.autoDispose<FleetData>((ref) => ref.watch(adminRepositoryProvider).fleet());

/// "Now" in epoch milliseconds for the analytics maths; overridden in tests for a fixed clock.
final adminNowProvider = Provider<int Function()>(
  (ref) =>
      () => DateTime.now().millisecondsSinceEpoch,
);
