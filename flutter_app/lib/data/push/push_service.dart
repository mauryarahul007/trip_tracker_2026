import 'dart:async';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/logging/app_logger.dart';
import '../../core/platform/push_gateway.dart';

/// Server side of token registration (swapped for a fake in tests).
abstract class PushTokenBackend {
  Future<void> register({required String token, required String platform, required String appVersion});
  Future<void> remove({required String userId, required String token});
}

class SupabasePushTokenBackend implements PushTokenBackend {
  SupabasePushTokenBackend(this._client);
  final SupabaseClient _client;

  @override
  Future<void> register({required String token, required String platform, required String appVersion}) async {
    await _client.rpc<dynamic>(
      'register_device_push_token',
      params: {'p_fcm_token': token, 'p_platform': platform, 'p_client': 'flutter', 'p_app_version': appVersion},
    );
  }

  @override
  Future<void> remove({required String userId, required String token}) async {
    await _client.from('device_push_tokens').delete().eq('user_id', userId).eq('fcm_token', token);
  }
}

/// Device token lifecycle (`register_device_push_token`, migration 0111). Registration is
/// idempotent per (user, token); sign-out deletes this device's row and the FCM token itself so the
/// server can no longer reach a signed-out device.
class PushService {
  PushService(this._gateway, this._backend, this._appVersion);

  final PushGateway _gateway;
  final PushTokenBackend? _backend;
  final Future<String> Function() _appVersion;

  StreamSubscription<String>? _refreshSub;
  String? _registered;

  /// Registers the current token for [userId] when permission is already granted. Never throws.
  Future<void> register() async {
    final backend = _backend;
    if (backend == null) return;
    try {
      if (await _gateway.permission() != PushPermission.granted) return;
      await _upload(backend, await _gateway.token());
      await _refreshSub?.cancel();
      _refreshSub = _gateway.tokenRefreshes.listen((t) => unawaited(_upload(backend, t)));
    } catch (e) {
      AppLogger.warn('Push registration failed: $e');
    }
  }

  Future<void> _upload(PushTokenBackend backend, String? token) async {
    if (token == null || token.isEmpty) return;
    await backend.register(token: token, platform: _gateway.platform, appVersion: await _appVersion());
    _registered = token;
  }

  /// Sign-out: stop pushes to this device. Best effort and offline-safe: the server also
  /// prunes tokens FCM reports as UNREGISTERED once [deleteToken] invalidates this one.
  Future<void> unregister(String userId) async {
    await _refreshSub?.cancel();
    _refreshSub = null;
    final backend = _backend;
    final token = _registered ?? await _safeToken();
    try {
      if (backend != null && token != null) await backend.remove(userId: userId, token: token);
    } catch (e) {
      AppLogger.warn('Push token row delete failed: $e');
    }
    try {
      await _gateway.deleteToken();
    } catch (e) {
      AppLogger.warn('FCM token delete failed: $e');
    }
    _registered = null;
  }

  Future<String?> _safeToken() async {
    try {
      return await _gateway.token();
    } catch (_) {
      return null;
    }
  }
}

/// Asks `send-push` to notify other members (web `sendPushNotification`). Best effort:
/// a failed push never fails or blocks the action that caused it.
class PushSender {
  PushSender(this._client);

  final SupabaseClient? _client;

  Future<void> send({
    required List<String> userIds,
    required String tripName,
    required String type,
    Map<String, String> params = const {},
    String? tripId,
  }) async {
    final client = _client;
    if (client == null || userIds.isEmpty) return;
    try {
      await client.functions.invoke(
        'send-push',
        body: {'userIds': userIds, 'tripName': tripName, 'type': type, 'params': params, 'tripId': tripId},
      );
    } catch (e) {
      AppLogger.warn('send-push failed: $e');
    }
  }

  /// Everyone else linked to [tripId] (e.g. "Diana joined the trip").
  Future<void> notifyOthers({
    required String tripId,
    required String tripName,
    required String type,
    required String selfUserId,
    Map<String, String> params = const {},
  }) async {
    final client = _client;
    if (client == null) return;
    try {
      final rows = await client.from('members').select('linked_user_id').eq('trip_id', tripId);
      final ids = <String>{
        for (final r in rows)
          if (r['linked_user_id'] is String) r['linked_user_id'] as String,
      }..remove(selfUserId);
      await send(userIds: ids.toList(), tripName: tripName, type: type, params: params, tripId: tripId);
    } catch (e) {
      AppLogger.warn('notifyOthers failed: $e');
    }
  }
}
