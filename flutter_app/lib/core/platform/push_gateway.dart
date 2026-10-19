import 'dart:async';
import 'dart:io' show Platform;

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../logging/app_logger.dart';

enum PushPermission { granted, denied, notDetermined, unavailable }

class PushMessage {
  const PushMessage({this.title, this.body, this.data = const {}});

  final String? title;
  final String? body;
  final Map<String, dynamic> data;
}

/// Seam over Firebase Cloud Messaging so everything above it is testable headless.
/// [unavailable] means the build has no Firebase config (google-services.json /
/// GoogleService-Info.plist): push is off, the rest of the app is unaffected.
abstract class PushGateway {
  Future<bool> initialize();
  Future<PushPermission> permission();
  Future<PushPermission> requestPermission();
  Future<String?> token();
  Stream<String> get tokenRefreshes;
  Future<void> deleteToken();
  Stream<PushMessage> get onForeground;
  Stream<PushMessage> get onOpened;
  Future<PushMessage?> initialMessage();
  String get platform;
}

PushMessage _toMessage(RemoteMessage m) =>
    PushMessage(title: m.notification?.title, body: m.notification?.body, data: m.data);

class FirebasePushGateway implements PushGateway {
  bool _ready = false;

  FirebaseMessaging get _fcm => FirebaseMessaging.instance;

  @override
  String get platform => Platform.isIOS ? 'ios' : 'android';

  @override
  Future<bool> initialize() async {
    if (_ready) return true;
    try {
      await Firebase.initializeApp();
      // Foreground: the in-app banner (realtime) is the surface, so no second system banner.
      await _fcm.setForegroundNotificationPresentationOptions(alert: false, badge: true, sound: true);
      _ready = true;
    } catch (e) {
      AppLogger.warn('Push disabled (Firebase not configured for this build): $e');
    }
    return _ready;
  }

  PushPermission _map(AuthorizationStatus s) => switch (s) {
    AuthorizationStatus.authorized || AuthorizationStatus.provisional => PushPermission.granted,
    AuthorizationStatus.denied || AuthorizationStatus.deniedPermanently => PushPermission.denied,
    AuthorizationStatus.notDetermined => PushPermission.notDetermined,
  };

  @override
  Future<PushPermission> permission() async {
    if (!await initialize()) return PushPermission.unavailable;
    return _map((await _fcm.getNotificationSettings()).authorizationStatus);
  }

  @override
  Future<PushPermission> requestPermission() async {
    if (!await initialize()) return PushPermission.unavailable;
    return _map((await _fcm.requestPermission()).authorizationStatus);
  }

  @override
  Future<String?> token() async {
    if (!await initialize()) return null;
    // iOS: the FCM token needs the APNs token first; it can lag a moment after permission.
    if (Platform.isIOS) {
      for (var i = 0; i < 10 && await _fcm.getAPNSToken() == null; i++) {
        await Future<void>.delayed(const Duration(milliseconds: 500));
      }
    }
    return _fcm.getToken();
  }

  @override
  Stream<String> get tokenRefreshes => _ready ? _fcm.onTokenRefresh : const Stream.empty();

  @override
  Future<void> deleteToken() async {
    if (_ready) await _fcm.deleteToken();
  }

  @override
  Stream<PushMessage> get onForeground => _ready ? FirebaseMessaging.onMessage.map(_toMessage) : const Stream.empty();

  @override
  Stream<PushMessage> get onOpened =>
      _ready ? FirebaseMessaging.onMessageOpenedApp.map(_toMessage) : const Stream.empty();

  @override
  Future<PushMessage?> initialMessage() async {
    if (!await initialize()) return null;
    final m = await _fcm.getInitialMessage();
    return m == null ? null : _toMessage(m);
  }
}

/// Browser build: no FCM (needs a web Firebase config + service worker). Push is simply off.
class NoPushGateway implements PushGateway {
  @override
  Future<bool> initialize() async => false;
  @override
  Future<PushPermission> permission() async => PushPermission.unavailable;
  @override
  Future<PushPermission> requestPermission() async => PushPermission.unavailable;
  @override
  Future<String?> token() async => null;
  @override
  Stream<String> get tokenRefreshes => const Stream.empty();
  @override
  Future<void> deleteToken() async {}
  @override
  Stream<PushMessage> get onForeground => const Stream.empty();
  @override
  Stream<PushMessage> get onOpened => const Stream.empty();
  @override
  Future<PushMessage?> initialMessage() async => null;
  @override
  String get platform => 'web';
}

final pushGatewayProvider = Provider<PushGateway>((ref) => kIsWeb ? NoPushGateway() : FirebasePushGateway());
