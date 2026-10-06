import '../../domain/models/member.dart';

class MemberDto {
  final String id;
  final String tripId;
  final String name;
  final String? linkedUserId;
  final bool archived;
  final String? joinDate;
  final String? leaveDate;
  final String? createdAt;
  final String? updatedAt;

  const MemberDto({
    required this.id,
    required this.tripId,
    required this.name,
    this.linkedUserId,
    this.archived = false,
    this.joinDate,
    this.leaveDate,
    this.createdAt,
    this.updatedAt,
  });

  factory MemberDto.fromPostgresJson(Map<String, dynamic> json) {
    return MemberDto(
      id: json['id'] as String,
      tripId: (json['trip_id'] ?? json['tripId'] ?? '') as String,
      name: json['name'] as String,
      linkedUserId: (json['linked_user_id'] ?? json['linkedUserId']) as String?,
      archived: json['archived'] as bool? ?? false,
      joinDate: (json['join_date'] ?? json['joinDate']) as String?,
      leaveDate: (json['leave_date'] ?? json['leaveDate']) as String?,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }

  Map<String, dynamic> toPostgresJson() {
    return {
      'id': id,
      'trip_id': tripId,
      'name': name,
      'linked_user_id': linkedUserId,
      'archived': archived,
      'join_date': joinDate,
      'leave_date': leaveDate,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
    };
  }

  Member toDomain({String? avatarUrl, String? upiId}) {
    return Member(
      id: id,
      tripId: tripId,
      name: name,
      linkedUserId: linkedUserId,
      archived: archived,
      joinDate: joinDate,
      leaveDate: leaveDate,
      avatarUrl: avatarUrl,
      upiId: upiId,
    );
  }

  factory MemberDto.fromDomain(Member member) {
    return MemberDto(
      id: member.id,
      tripId: member.tripId ?? '',
      name: member.name,
      linkedUserId: member.linkedUserId,
      archived: member.archived,
      joinDate: member.joinDate,
      leaveDate: member.leaveDate,
    );
  }
}
