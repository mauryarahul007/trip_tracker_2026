import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/auth_state.dart';
import '../../../core/env/app_env.dart';
import '../../../data/local/app_database.dart';
import '../../../data/repositories/notification_repository.dart';
import '../../../data/supabase/supabase_gateway.dart';
import '../../../domain/models/notification_item.dart';

final notificationRepositoryProvider = Provider<NotificationRepository>(
  (ref) => NotificationRepository(
    ref.watch(appDatabaseProvider),
    AppEnv.current.hasBackend ? ref.watch(supabaseGatewayProvider).client : null,
  ),
);

/// Newest-first, capped at 50, for the signed-in user.
final notificationsProvider = StreamProvider<List<NotificationItem>>((ref) {
  final userId = ref.watch(authStateProvider.select((a) => a.userId));
  if (userId == null) return Stream.value(const []);
  return ref.watch(notificationRepositoryProvider).watch(userId);
});

final unreadNotificationCountProvider = Provider<int>(
  (ref) => (ref.watch(notificationsProvider).value ?? const []).where((n) => !n.read).length,
);
