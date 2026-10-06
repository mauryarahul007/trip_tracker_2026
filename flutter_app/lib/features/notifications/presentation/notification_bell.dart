import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/theme/app_icons.dart';
import '../application/notification_providers.dart';

/// Header bell with unread badge; opens the notifications screen
/// (scoped to [tripId] first when given, like the web's "Current Trip" tab).
class NotificationBell extends ConsumerWidget {
  const NotificationBell({this.tripId, super.key});

  final String? tripId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unread = ref.watch(unreadNotificationCountProvider);
    return IconButton(
      key: const Key('action-notifications'),
      tooltip: unread > 0 ? 'Notifications, $unread unread' : 'Notifications',
      onPressed: () => context.push(tripId == null ? '/notifications' : '/notifications?trip=$tripId'),
      icon: Badge(
        isLabelVisible: unread > 0,
        label: Text(unread > 9 ? '9+' : '$unread'),
        child: const Icon(AppIcons.bell, size: 22),
      ),
    );
  }
}
