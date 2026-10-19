class Member {
  final String id;
  final String name;
  final String? email;
  final String? tripId;
  final bool archived;
  final String? linkedUserId;
  final String? avatarUrl;
  final String? upiId;
  final String? joinDate;
  final String? leaveDate;

  const Member({
    required this.id,
    required this.name,
    this.email,
    this.tripId,
    this.archived = false,
    this.linkedUserId,
    this.avatarUrl,
    this.upiId,
    this.joinDate,
    this.leaveDate,
  });

  Member copyWith({
    String? id,
    String? name,
    String? email,
    String? tripId,
    bool? archived,
    String? linkedUserId,
    String? avatarUrl,
    String? upiId,
    String? joinDate,
    String? leaveDate,
  }) {
    return Member(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      tripId: tripId ?? this.tripId,
      archived: archived ?? this.archived,
      linkedUserId: linkedUserId ?? this.linkedUserId,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      upiId: upiId ?? this.upiId,
      joinDate: joinDate ?? this.joinDate,
      leaveDate: leaveDate ?? this.leaveDate,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      if (email != null) 'email': email,
      if (tripId != null) 'tripId': tripId,
      'archived': archived,
      if (linkedUserId != null) 'linkedUserId': linkedUserId,
      if (avatarUrl != null) 'avatarUrl': avatarUrl,
      if (upiId != null) 'upiId': upiId,
      if (joinDate != null) 'joinDate': joinDate,
      if (leaveDate != null) 'leaveDate': leaveDate,
    };
  }

  factory Member.fromJson(Map<String, dynamic> json) {
    return Member(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String?,
      tripId: (json['tripId'] ?? json['trip_id']) as String?,
      archived: json['archived'] as bool? ?? false,
      linkedUserId: (json['linkedUserId'] ?? json['linked_user_id']) as String?,
      avatarUrl: (json['avatarUrl'] ?? json['avatar_url']) as String?,
      upiId: (json['upiId'] ?? json['upi_id']) as String?,
      joinDate: (json['joinDate'] ?? json['join_date']) as String?,
      leaveDate: (json['leaveDate'] ?? json['leave_date']) as String?,
    );
  }
}
