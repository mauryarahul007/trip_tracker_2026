import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../domain/models/location_share.dart';
import '../../domain/repositories/location_share_repository.dart';
import '../supabase/supabase_gateway.dart';

const Duration _shareDuration = Duration(hours: 12);

class SupabaseLocationShareRepository implements LocationShareRepository {
  SupabaseLocationShareRepository(this._client);

  final SupabaseClient? _client;

  @override
  Future<MyLocationShare> startLocationShare({
    required String tripId,
    required String memberId,
    required String userId,
    required double lat,
    required double lng,
  }) async {
    final client = _client;
    final expiresAt = DateTime.now().toUtc().add(_shareDuration).toIso8601String();
    if (client == null) {
      return MyLocationShare(
        isSharing: true,
        shareToken: 'demo_token_$tripId',
        expiresAt: expiresAt,
      );
    }

    final data = await client
        .from('member_locations')
        .upsert(
          {
            'trip_id': tripId,
            'member_id': memberId,
            'user_id': userId,
            'lat': lat,
            'lng': lng,
            'is_sharing': true,
            'expires_at': expiresAt,
            'updated_at': DateTime.now().toUtc().toIso8601String(),
          },
          onConflict: 'trip_id,user_id',
        )
        .select('share_token, is_sharing, expires_at')
        .single();

    return MyLocationShare.fromJson(data);
  }

  @override
  Future<void> updateLocationShare({
    required String tripId,
    required double lat,
    required double lng,
  }) async {
    final client = _client;
    if (client == null) {
      return;
    }

    await client
        .from('member_locations')
        .update({
          'lat': lat,
          'lng': lng,
          'updated_at': DateTime.now().toUtc().toIso8601String(),
        })
        .eq('trip_id', tripId);
  }

  @override
  Future<void> stopLocationShare(String tripId) async {
    final client = _client;
    if (client == null) {
      return;
    }

    await client
        .from('member_locations')
        .update({'is_sharing': false})
        .eq('trip_id', tripId);
  }

  @override
  Future<MyLocationShare?> getMyLocationShare(String tripId) async {
    final client = _client;
    if (client == null) {
      return null;
    }

    final data = await client
        .from('member_locations')
        .select('share_token, is_sharing, expires_at')
        .eq('trip_id', tripId)
        .maybeSingle();

    if (data == null) {
      return null;
    }
    return MyLocationShare.fromJson(data);
  }

  @override
  Future<List<TripActiveShare>> getActiveTripLocationShares(String tripId) async {
    final client = _client;
    if (client == null) {
      return const [];
    }

    final data = await client
        .from('member_locations')
        .select('member_id, lat, lng, updated_at')
        .eq('trip_id', tripId)
        .eq('is_sharing', true);

    return [
      for (final row in (data as List<dynamic>? ?? const []))
        TripActiveShare.fromJson(Map<String, dynamic>.from(row as Map)),
    ];
  }

  @override
  Future<SharedLocation?> getSharedLocation(String shareToken) async {
    final client = _client;
    if (client == null) {
      if (shareToken.startsWith('demo_token_')) {
        return SharedLocation(
          memberName: 'Demo Traveler',
          tripName: 'Goa Trip',
          lat: 15.2993,
          lng: 74.1240,
          updatedAt: DateTime.now().toIso8601String(),
          expiresAt: DateTime.now().add(const Duration(hours: 10)).toIso8601String(),
        );
      }
      return null;
    }

    final data = await client.rpc<dynamic>(
      'get_shared_location',
      params: {'p_token': shareToken},
    );

    if (data is List && data.isNotEmpty) {
      final row = Map<String, dynamic>.from(data.first as Map);
      return SharedLocation.fromJson(row);
    }
    return null;
  }
}

class FakeLocationShareRepository implements LocationShareRepository {
  MyLocationShare? myShare;
  final List<TripActiveShare> activeShares = [];
  final Map<String, SharedLocation> publicShares = {};

  @override
  Future<MyLocationShare> startLocationShare({
    required String tripId,
    required String memberId,
    required String userId,
    required double lat,
    required double lng,
  }) async {
    final share = MyLocationShare(
      isSharing: true,
      shareToken: 'test_token_$tripId',
      expiresAt: DateTime.now().add(const Duration(hours: 12)).toIso8601String(),
    );
    myShare = share;
    activeShares.removeWhere((s) => s.memberId == memberId);
    activeShares.add(TripActiveShare(
      memberId: memberId,
      lat: lat,
      lng: lng,
      updatedAt: DateTime.now().toIso8601String(),
    ));
    publicShares['test_token_$tripId'] = SharedLocation(
      memberName: 'Test Member',
      tripName: 'Test Trip',
      lat: lat,
      lng: lng,
      updatedAt: DateTime.now().toIso8601String(),
      expiresAt: share.expiresAt,
    );
    return share;
  }

  @override
  Future<void> updateLocationShare({
    required String tripId,
    required double lat,
    required double lng,
  }) async {
    if (myShare != null && myShare!.isSharing) {
      publicShares[myShare!.shareToken ?? ''] = SharedLocation(
        memberName: 'Test Member',
        tripName: 'Test Trip',
        lat: lat,
        lng: lng,
        updatedAt: DateTime.now().toIso8601String(),
      );
    }
  }

  @override
  Future<void> stopLocationShare(String tripId) async {
    if (myShare != null) {
      myShare = MyLocationShare(
        isSharing: false,
        shareToken: myShare!.shareToken,
        expiresAt: myShare!.expiresAt,
      );
    }
    activeShares.clear();
  }

  @override
  Future<MyLocationShare?> getMyLocationShare(String tripId) async => myShare;

  @override
  Future<List<TripActiveShare>> getActiveTripLocationShares(String tripId) async => List.unmodifiable(activeShares);

  @override
  Future<SharedLocation?> getSharedLocation(String shareToken) async => publicShares[shareToken];
}

final locationShareRepositoryProvider = Provider<LocationShareRepository>((ref) {
  try {
    final gateway = ref.watch(supabaseGatewayProvider);
    return SupabaseLocationShareRepository(gateway.client);
  } catch (_) {
    return SupabaseLocationShareRepository(null);
  }
});
