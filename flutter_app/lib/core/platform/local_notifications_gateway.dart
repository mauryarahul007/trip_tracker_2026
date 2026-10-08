import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:timezone/data/latest_all.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

import '../../domain/logic/pass_reminders.dart';
import '../logging/app_logger.dart';

/// Android channel the push payload targets (`send-push` sets `channel_id`), created here so
/// background pushes have somewhere to land.
const pushChannelId = 'trip_tracker_high_importance';
const _reminderChannelId = 'trip_tracker_reminders';

/// Seam over `flutter_local_notifications`. `replaceAll` is the only scheduling call: the app
/// recomputes every reminder and swaps the whole set, which makes edits, deletes, reboots and
/// app updates all the same code path.
abstract class LocalNotificationsGateway {
  Future<bool> requestPermission();
  Future<void> replaceAll(List<PlannedReminder> reminders);

  /// Ids of reminders currently scheduled (for tests and Diagnostics).
  Future<List<int>> pendingIds();
}

class PlatformLocalNotificationsGateway implements LocalNotificationsGateway {
  final _plugin = FlutterLocalNotificationsPlugin();
  bool _ready = false;

  Future<bool> _init() async {
    if (_ready) return true;
    try {
      tzdata.initializeTimeZones();
      try {
        tz.setLocalLocation(tz.getLocation((await FlutterTimezone.getLocalTimezone()).identifier));
      } catch (_) {
        // Falls back to UTC; reminders still fire at the right instant.
      }
      await _plugin.initialize(
        settings: const InitializationSettings(
          android: AndroidInitializationSettings('@mipmap/ic_launcher'),
          iOS: DarwinInitializationSettings(
            requestAlertPermission: false,
            requestBadgePermission: false,
            requestSoundPermission: false,
          ),
        ),
      );
      await _plugin
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(
            const AndroidNotificationChannel(
              pushChannelId,
              'Trip alerts',
              description: 'Expenses, settlements, members and chat',
              importance: Importance.high,
            ),
          );
      _ready = true;
    } catch (e) {
      AppLogger.warn('Local notifications unavailable: $e');
    }
    return _ready;
  }

  @override
  Future<bool> requestPermission() async {
    if (!await _init()) return false;
    if (Platform.isIOS) {
      return await _plugin
              .resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>()
              ?.requestPermissions(alert: true, badge: true, sound: true) ??
          false;
    }
    return await _plugin
            .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
            ?.requestNotificationsPermission() ??
        true;
  }

  @override
  Future<void> replaceAll(List<PlannedReminder> reminders) async {
    if (!await _init()) return;
    await _plugin.cancelAllPendingNotifications();
    for (final r in reminders) {
      await _plugin.zonedSchedule(
        id: r.id,
        title: r.title,
        body: r.body,
        scheduledDate: tz.TZDateTime.from(r.fireAt, tz.local),
        notificationDetails: const NotificationDetails(
          android: AndroidNotificationDetails(
            _reminderChannelId,
            'Travel reminders',
            channelDescription: 'Before flights, trains and stays',
            importance: Importance.high,
            priority: Priority.high,
          ),
          iOS: DarwinNotificationDetails(),
        ),
        // Inexact: no SCHEDULE_EXACT_ALARM permission; may drift a few minutes under Doze.
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        payload: '/trip/${r.tripId}/notes',
      );
    }
  }

  @override
  Future<List<int>> pendingIds() async => [for (final p in await _plugin.pendingNotificationRequests()) p.id];
}

/// Browser build: scheduled local reminders are not supported.
class NoLocalNotificationsGateway implements LocalNotificationsGateway {
  @override
  Future<bool> requestPermission() async => false;
  @override
  Future<void> replaceAll(List<PlannedReminder> reminders) async {}
  @override
  Future<List<int>> pendingIds() async => const [];
}

final localNotificationsGatewayProvider = Provider<LocalNotificationsGateway>(
  (ref) => kIsWeb ? NoLocalNotificationsGateway() : PlatformLocalNotificationsGateway(),
);
