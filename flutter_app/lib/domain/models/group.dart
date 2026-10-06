class Group {
  final String id;
  final String? tripId;
  final String name;
  final List<String> memberIds;

  const Group({
    required this.id,
    this.tripId,
    required this.name,
    this.memberIds = const [],
  });

  Group copyWith({
    String? id,
    String? tripId,
    String? name,
    List<String>? memberIds,
  }) {
    return Group(
      id: id ?? this.id,
      tripId: tripId ?? this.tripId,
      name: name ?? this.name,
      memberIds: memberIds ?? this.memberIds,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      if (tripId != null) 'tripId': tripId,
      'name': name,
      'memberIds': memberIds,
    };
  }

  factory Group.fromJson(Map<String, dynamic> json) {
    return Group(
      id: json['id'] as String,
      tripId: (json['tripId'] ?? json['trip_id']) as String?,
      name: json['name'] as String,
      memberIds: (json['memberIds'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
    );
  }
}
