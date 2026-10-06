/// Current user's location sharing status for a trip.
class MyLocationShare {
  const MyLocationShare({
    required this.isSharing,
    this.shareToken,
    this.expiresAt,
  });

  final bool isSharing;
  final String? shareToken;
  final String? expiresAt;

  bool get isExpired {
    if (expiresAt == null) return false;
    final exp = DateTime.tryParse(expiresAt!);
    if (exp == null) return false;
    return DateTime.now().isAfter(exp);
  }

  bool get isActive => isSharing && !isExpired;

  factory MyLocationShare.fromJson(Map<String, dynamic> json) {
    return MyLocationShare(
      isSharing: json['is_sharing'] == true,
      shareToken: json['share_token'] as String?,
      expiresAt: json['expires_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'is_sharing': isSharing,
    'share_token': shareToken,
    'expires_at': expiresAt,
  };
}

/// Public shared location retrieved by anonymous viewers via token.
class SharedLocation {
  const SharedLocation({
    required this.memberName,
    required this.tripName,
    required this.lat,
    required this.lng,
    required this.updatedAt,
    this.expiresAt,
  });

  final String memberName;
  final String tripName;
  final double lat;
  final double lng;
  final String updatedAt;
  final String? expiresAt;

  bool get isExpired {
    if (expiresAt == null) return false;
    final exp = DateTime.tryParse(expiresAt!);
    if (exp == null) return false;
    return DateTime.now().isAfter(exp);
  }

  factory SharedLocation.fromJson(Map<String, dynamic> json) {
    return SharedLocation(
      memberName: json['member_name'] as String? ?? 'Traveler',
      tripName: json['trip_name'] as String? ?? 'Trip',
      lat: (json['lat'] as num?)?.toDouble() ?? 0.0,
      lng: (json['lng'] as num?)?.toDouble() ?? 0.0,
      updatedAt: json['updated_at'] as String? ?? DateTime.now().toIso8601String(),
      expiresAt: json['expires_at'] as String?,
    );
  }
}

/// Active member share visible to participants inside a trip.
class TripActiveShare {
  const TripActiveShare({
    required this.memberId,
    required this.lat,
    required this.lng,
    required this.updatedAt,
  });

  final String memberId;
  final double lat;
  final double lng;
  final String updatedAt;

  factory TripActiveShare.fromJson(Map<String, dynamic> json) {
    return TripActiveShare(
      memberId: json['member_id'] as String,
      lat: (json['lat'] as num?)?.toDouble() ?? 0.0,
      lng: (json['lng'] as num?)?.toDouble() ?? 0.0,
      updatedAt: json['updated_at'] as String? ?? DateTime.now().toIso8601String(),
    );
  }
}
