import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_timezone/flutter_timezone.dart';

import '../../../core/env/app_env.dart';
import '../../../data/repositories/supabase_notification_prefs_repository.dart';
import '../../../data/supabase/supabase_gateway.dart';
import '../../../domain/repositories/notification_prefs_repository.dart';

final notificationPrefsRepositoryProvider = Provider<NotificationPrefsRepository>(
  (ref) =>
      SupabaseNotificationPrefsRepository(AppEnv.current.hasBackend ? ref.watch(supabaseGatewayProvider).client : null),
);

final quietHoursProvider = FutureProvider.autoDispose<QuietHoursPref>(
  (ref) => ref.watch(notificationPrefsRepositoryProvider).getQuietHours(),
);
final digestProvider = FutureProvider.autoDispose<bool>(
  (ref) => ref.watch(notificationPrefsRepositoryProvider).getDigest(),
);
final tripMutedProvider = FutureProvider.autoDispose.family<bool, String>(
  (ref, tripId) => ref.watch(notificationPrefsRepositoryProvider).isTripMuted(tripId),
);

/// IANA name of the device zone, sent with quiet hours so the server applies them locally.
final deviceTimezoneProvider = FutureProvider<String>((ref) async {
  try {
    return (await FlutterTimezone.getLocalTimezone()).identifier;
  } catch (_) {
    return 'UTC';
  }
});
