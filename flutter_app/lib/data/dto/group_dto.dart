import '../../domain/models/group.dart';

class GroupDto {
  final String id;
  final String tripId;
  final String name;
  final String? createdAt;
  final String? updatedAt;

  const GroupDto({
    required this.id,
    required this.tripId,
    required this.name,
    this.createdAt,
    this.updatedAt,
  });

  factory GroupDto.fromPostgresJson(Map<String, dynamic> json) {
    return GroupDto(
      id: json['id'] as String,
      tripId: (json['trip_id'] ?? json['tripId'] ?? '') as String,
      name: json['name'] as String,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }

  Map<String, dynamic> toPostgresJson() {
    return {
      'id': id,
      'trip_id': tripId,
      'name': name,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
    };
  }

  Group toDomain({List<String> memberIds = const []}) {
    return Group(
      id: id,
      tripId: tripId,
      name: name,
      memberIds: memberIds,
    );
  }

  factory GroupDto.fromDomain(Group group) {
    return GroupDto(
      id: group.id,
      tripId: group.tripId ?? '',
      name: group.name,
    );
  }
}
