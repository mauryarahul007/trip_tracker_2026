import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../data/providers.dart';
import '../../../domain/repositories/notification_prefs_repository.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../settings/presentation/settings_widgets.dart';
import '../../trips/application/trips_providers.dart';
import '../../../core/platform/push_gateway.dart' show PushPermission;
import '../application/notification_prefs_providers.dart';
import '../application/push_providers.dart';

/// Quiet hours, digest and muted trips. Rows appear only with their flag, like the web.
class NotificationPrefsScreen extends ConsumerWidget {
  const NotificationPrefsScreen({super.key});

  Future<void> _time(BuildContext context, WidgetRef ref, QuietHoursPref p, {required bool start}) async {
    final cur = (start ? p.startTime : p.endTime).split(':');
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: int.tryParse(cur[0]) ?? 22, minute: int.tryParse(cur[1]) ?? 0),
    );
    if (picked == null) return;
    final v = '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
    await _saveQuiet(ref, start ? p.copyWith(startTime: v) : p.copyWith(endTime: v));
  }

  Future<void> _saveQuiet(WidgetRef ref, QuietHoursPref p) async {
    final tz = await ref.read(deviceTimezoneProvider.future);
    await ref.read(notificationPrefsRepositoryProvider).setQuietHours(p.copyWith(timezone: tz));
    ref.invalidate(quietHoursProvider);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final quietFlag = ref.watch(flagProvider(('enableQuietHours', null))).value ?? false;
    final digestFlag = ref.watch(flagProvider(('enableDigestNotifications', null))).value ?? false;
    final quiet = ref.watch(quietHoursProvider).value ?? const QuietHoursPref();
    final digest = ref.watch(digestProvider).value ?? false;
    final trips = ref.watch(tripsProvider).value ?? const [];

    return AppScaffold(
      appBar: AppBar(
        title: const Text('Notification preferences'),
        leading: IconButton(
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          icon: const Icon(AppIcons.back, size: 20),
          onPressed: () => context.pop(),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 32),
        children: [
          SettingsSection(title: 'Push notifications', children: [_PushTile()]),
          if (quietFlag)
            SettingsSection(
              title: 'Quiet hours',
              children: [
                SettingsSwitchTile(
                  key: const Key('quiet-enabled'),
                  icon: Icons.bedtime_outlined,
                  iconColor: const Color(0xFF8B3CF7),
                  title: 'Pause push alerts overnight',
                  subtitle: 'Alerts in this window arrive in your notification list instead',
                  value: quiet.enabled,
                  onChanged: (v) => _saveQuiet(ref, quiet.copyWith(enabled: v)),
                ),
                if (quiet.enabled) ...[
                  SettingsTile(
                    key: const Key('quiet-start'),
                    icon: Icons.schedule_rounded,
                    title: 'From',
                    subtitle: quiet.startTime,
                    onTap: () => _time(context, ref, quiet, start: true),
                  ),
                  SettingsTile(
                    key: const Key('quiet-end'),
                    icon: Icons.alarm_rounded,
                    title: 'Until',
                    subtitle: quiet.endTime,
                    onTap: () => _time(context, ref, quiet, start: false),
                  ),
                ],
              ],
            ),
          if (digestFlag)
            SettingsSection(
              title: 'Daily digest',
              children: [
                SettingsSwitchTile(
                  key: const Key('digest-enabled'),
                  icon: Icons.mark_email_unread_outlined,
                  iconColor: const Color(0xFFE8890C),
                  title: 'Bundle alerts into one daily summary',
                  value: digest,
                  onChanged: (v) async {
                    await ref.read(notificationPrefsRepositoryProvider).setDigest(v);
                    ref.invalidate(digestProvider);
                  },
                ),
              ],
            ),
          SettingsSection(
            title: 'Muted trips',
            children: [
              if (trips.isEmpty) const SettingsTile(title: 'No trips yet'),
              for (final t in trips) _MuteTile(tripId: t.id, name: t.name),
            ],
          ),
        ],
      ),
    );
  }
}

class _MuteTile extends ConsumerWidget {
  const _MuteTile({required this.tripId, required this.name});

  final String tripId;
  final String name;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final muted = ref.watch(tripMutedProvider(tripId)).value ?? false;
    return SettingsSwitchTile(
      key: Key('mute-$tripId'),
      icon: Icons.notifications_off_outlined,
      iconColor: const Color(0xFF16A34A),
      title: name,
      subtitle: muted ? 'Muted' : null,
      value: muted,
      onChanged: (v) async {
        await ref.read(notificationPrefsRepositoryProvider).setTripMuted(tripId, v);
        ref.invalidate(tripMutedProvider(tripId));
      },
    );
  }
}

class _PushTile extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(pushControllerProvider).value;
    final (subtitle, canEnable) = switch (status) {
      PushPermission.granted => ('On for this device', false),
      PushPermission.denied => ('Blocked. Turn it on in your phone settings.', false),
      PushPermission.unavailable => ('Not available in this build', false),
      _ => ('Off. Tap to turn on.', true),
    };
    return SettingsTile(
      key: const Key('push-tile'),
      icon: Icons.notifications_none_rounded,
      title: 'Alerts on this device',
      subtitle: subtitle,
      onTap: canEnable ? () => ref.read(pushControllerProvider.notifier).enable() : null,
    );
  }
}
