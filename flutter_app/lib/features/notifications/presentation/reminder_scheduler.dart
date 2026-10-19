import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/platform/local_notifications_gateway.dart';
import '../../../core/settings/app_settings.dart';
import '../../../data/providers.dart';
import '../../../domain/logic/pass_reminders.dart';
import '../../../domain/models/trip.dart';
import '../../trips/application/trips_providers.dart';
import '../application/notification_prefs_providers.dart';

/// Keeps local pass reminders in step with the trips on this device. Any change to trips or
/// passes, the reminders switch, or quiet hours recomputes the full set, so edits, deleted
/// passes, app updates and reboots (the app start recomputes) all converge. Renders nothing.
class ReminderScheduler extends ConsumerStatefulWidget {
  const ReminderScheduler({required this.child, super.key});

  final Widget child;

  @override
  ConsumerState<ReminderScheduler> createState() => _ReminderSchedulerState();
}

class _ReminderSchedulerState extends ConsumerState<ReminderScheduler> {
  Timer? _debounce;
  String? _last;

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  void _schedule() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(seconds: 2), _run);
  }

  Future<void> _run() async {
    if (!mounted) return;
    final enabled = ref.read(passRemindersEnabledProvider);
    final trips = ref.read(tripsProvider).value ?? const <Trip>[];
    final quietFlag = ref.read(flagProvider(('enableQuietHours', null))).value ?? false;
    final quiet = quietFlag ? ref.read(quietHoursProvider).value : null;
    final now = DateTime.now();
    final plan = <PlannedReminder>[
      if (enabled)
        for (final t in trips.where((t) => !t.archived))
          for (final p in t.passes)
            ...planPassReminders(
              p,
              t.name,
              now,
              quietEnabled: quiet?.enabled ?? false,
              quietStart: quiet?.startTime ?? '22:00',
              quietEnd: quiet?.endTime ?? '07:00',
            ),
    ];
    // Skip the platform call when nothing changed (every trips emission lands here).
    final key = plan.map((r) => '${r.id}@${r.fireAt.millisecondsSinceEpoch}').join(',');
    if (key == _last) return;
    _last = key;
    final gw = ref.read(localNotificationsGatewayProvider);
    if (plan.isNotEmpty && !await gw.requestPermission()) return;
    await gw.replaceAll(plan);
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(tripsProvider, (_, _) => _schedule());
    ref.listen(passRemindersEnabledProvider, (_, _) => _schedule());
    ref.listen(quietHoursProvider, (_, _) => _schedule());
    return widget.child;
  }
}
