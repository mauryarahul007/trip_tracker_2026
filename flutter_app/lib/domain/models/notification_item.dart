class NotificationItem {
  final String id;
  final String? tripId;
  final String title;
  final String body;
  final Map<String, dynamic>? data;
  final bool read;
  final String createdAt;

  const NotificationItem({
    required this.id,
    this.tripId,
    required this.title,
    required this.body,
    this.data,
    this.read = false,
    required this.createdAt,
  });

  NotificationItem copyWith({
    String? id,
    String? tripId,
    String? title,
    String? body,
    Map<String, dynamic>? data,
    bool? read,
    String? createdAt,
  }) {
    return NotificationItem(
      id: id ?? this.id,
      tripId: tripId ?? this.tripId,
      title: title ?? this.title,
      body: body ?? this.body,
      data: data ?? this.data,
      read: read ?? this.read,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      if (tripId != null) 'tripId': tripId,
      'title': title,
      'body': body,
      if (data != null) 'data': data,
      'read': read,
      'createdAt': createdAt,
    };
  }

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      id: json['id'] as String,
      tripId: (json['tripId'] ?? json['trip_id']) as String?,
      title: json['title'] as String? ?? '',
      body: json['body'] as String? ?? '',
      data: json['data'] as Map<String, dynamic>?,
      read: json['read'] as bool? ?? false,
      createdAt: json['createdAt'] as String? ?? json['created_at'] as String? ?? DateTime.now().toIso8601String(),
    );
  }
}
