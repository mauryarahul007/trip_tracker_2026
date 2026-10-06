import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/router.dart';
import '../../../domain/logic/notifications.dart';
import '../../../domain/models/notification_item.dart';
import '../../../shared/theme/app_tokens.dart';
import '../application/notification_providers.dart';
import 'notification_style.dart';

const _autoDismiss = Duration(seconds: 5);

/// Only rows created this recently count as "arrived now"; a history page pulled
/// by `refresh` (fresh install, back online) must not replay as banners.
const _freshWindow = Duration(minutes: 2);

/// Foreground banner for notifications that arrive while the app is open
/// (web `InAppNotificationBanner`). Only unread rows created within the last
/// couple of minutes that we have not shown yet qualify.
class NotificationBannerHost extends ConsumerStatefulWidget {
  const NotificationBannerHost({required this.child, super.key});

  final Widget child;

  @override
  ConsumerState<NotificationBannerHost> createState() => _NotificationBannerHostState();
}

class _NotificationBannerHostState extends ConsumerState<NotificationBannerHost> {
  Set<String>? _seen;
  NotificationItem? _active;
  Timer? _timer;

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _onList(List<NotificationItem> list) {
    final seen = _seen ?? const <String>{};
    _seen = {for (final n in list) n.id};
    final cutoff = DateTime.now().toUtc().subtract(_freshWindow);
    final fresh = list.where((n) {
      final at = DateTime.tryParse(n.createdAt);
      return !n.read && !seen.contains(n.id) && at != null && at.isAfter(cutoff);
    });
    if (fresh.isEmpty) return;
    _show(fresh.first);
  }

  void _show(NotificationItem n) {
    _timer?.cancel();
    setState(() => _active = n);
    _timer = Timer(_autoDismiss, _dismiss);
  }

  void _dismiss() {
    _timer?.cancel();
    if (mounted && _active != null) setState(() => _active = null);
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AsyncValue<List<NotificationItem>>>(notificationsProvider, (_, next) {
      final list = next.value;
      if (list != null) _onList(list);
    });
    final n = _active;
    return Stack(
      children: [
        widget.child,
        if (n != null)
          Positioned(
            top: 0,
            left: 12,
            right: 12,
            child: SafeArea(
              child: Dismissible(
                key: ValueKey('banner-${n.id}'),
                direction: DismissDirection.up,
                onDismissed: (_) => setState(() => _active = null),
                child: _Banner(
                  item: n,
                  onTap: () {
                    _dismiss();
                    ref.read(routerProvider).push('/notifications');
                  },
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _Banner extends StatelessWidget {
  const _Banner({required this.item, required this.onTap});

  final NotificationItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final type = item.data?['type'] as String?;
    final meta = notificationMeta(type);
    final headline = getNotificationHeadline(type);
    final body = renderNotificationBody(item);
    return Semantics(
      liveRegion: true,
      label: '$headline: $body. Tap to view notifications.',
      child: Material(
        key: const Key('notification-banner'),
        color: tokens.bgSurface,
        elevation: 6,
        borderRadius: BorderRadius.circular(tokens.radiusLg),
        child: InkWell(
          borderRadius: BorderRadius.circular(tokens.radiusLg),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: meta.color.withValues(alpha: 0.15),
                  child: Icon(meta.icon, size: 18, color: meta.color),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        headline,
                        style: TextStyle(fontWeight: FontWeight.w700, color: tokens.textPrimary),
                      ),
                      Text(
                        body,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(color: tokens.textSecondary),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
