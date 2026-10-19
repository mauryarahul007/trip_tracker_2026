class TripMessage {
  final String id;
  final String tripId;
  final String memberId;
  final String body;
  final String? eventKind; // 'text' | 'expense_added' | 'settlement_recorded' | etc.
  final Map<String, dynamic>? payload;
  final int createdAt;
  final int? editedAt;
  final int? deletedAt;
  final String? replyToId;
  final String? replyToSenderName;
  final String? replyToBody;
  final Map<String, List<String>> reactions;
  final bool isPinned;

  const TripMessage({
    required this.id,
    required this.tripId,
    required this.memberId,
    required this.body,
    this.eventKind,
    this.payload,
    required this.createdAt,
    this.editedAt,
    this.deletedAt,
    this.replyToId,
    this.replyToSenderName,
    this.replyToBody,
    this.reactions = const {},
    this.isPinned = false,
  });

  TripMessage copyWith({
    String? id,
    String? tripId,
    String? memberId,
    String? body,
    String? eventKind,
    Map<String, dynamic>? payload,
    int? createdAt,
    int? editedAt,
    int? deletedAt,
    String? replyToId,
    String? replyToSenderName,
    String? replyToBody,
    Map<String, List<String>>? reactions,
    bool? isPinned,
  }) {
    return TripMessage(
      id: id ?? this.id,
      tripId: tripId ?? this.tripId,
      memberId: memberId ?? this.memberId,
      body: body ?? this.body,
      eventKind: eventKind ?? this.eventKind,
      payload: payload ?? this.payload,
      createdAt: createdAt ?? this.createdAt,
      editedAt: editedAt ?? this.editedAt,
      deletedAt: deletedAt ?? this.deletedAt,
      replyToId: replyToId ?? this.replyToId,
      replyToSenderName: replyToSenderName ?? this.replyToSenderName,
      replyToBody: replyToBody ?? this.replyToBody,
      reactions: reactions ?? this.reactions,
      isPinned: isPinned ?? this.isPinned,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tripId': tripId,
      'memberId': memberId,
      'body': body,
      if (eventKind != null) 'eventKind': eventKind,
      if (payload != null) 'payload': payload,
      'createdAt': createdAt,
      if (editedAt != null) 'editedAt': editedAt,
      if (deletedAt != null) 'deletedAt': deletedAt,
      if (replyToId != null) 'replyToId': replyToId,
      if (replyToSenderName != null) 'replyToSenderName': replyToSenderName,
      if (replyToBody != null) 'replyToBody': replyToBody,
      'reactions': reactions,
      'isPinned': isPinned,
    };
  }

  factory TripMessage.fromJson(Map<String, dynamic> json) {
    return TripMessage(
      id: json['id'] as String,
      tripId: (json['tripId'] ?? json['trip_id'] ?? '') as String,
      memberId: (json['memberId'] ?? json['member_id'] ?? '') as String,
      body: json['body'] as String? ?? '',
      eventKind: (json['eventKind'] ?? json['event_kind'] ?? json['kind']) as String?,
      payload: json['payload'] as Map<String, dynamic>?,
      createdAt: (json['createdAt'] is String)
          ? DateTime.tryParse(json['createdAt'] as String)?.millisecondsSinceEpoch ?? 0
          : (json['createdAt'] as num?)?.toInt() ?? 0,
      editedAt: (json['editedAt'] is String)
          ? DateTime.tryParse(json['editedAt'] as String)?.millisecondsSinceEpoch
          : (json['editedAt'] as num?)?.toInt(),
      deletedAt: (json['deletedAt'] is String)
          ? DateTime.tryParse(json['deletedAt'] as String)?.millisecondsSinceEpoch
          : (json['deletedAt'] as num?)?.toInt(),
      replyToId: json['replyToId'] as String?,
      replyToSenderName: json['replyToSenderName'] as String?,
      replyToBody: json['replyToBody'] as String?,
      reactions:
          (json['reactions'] as Map<String, dynamic>?)?.map(
            (k, v) => MapEntry(k, (v as List<dynamic>).map((e) => e.toString()).toList()),
          ) ??
          const {},
      isPinned: json['isPinned'] as bool? ?? false,
    );
  }
}
