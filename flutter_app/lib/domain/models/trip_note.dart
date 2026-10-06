class TripNote {
  final String id;
  final String title;
  final String content;
  final String? category;
  final String? colorTag;
  final bool isPinned;
  final int createdAt;
  final int updatedAt;

  const TripNote({
    required this.id,
    required this.title,
    required this.content,
    this.category,
    this.colorTag,
    this.isPinned = false,
    required this.createdAt,
    required this.updatedAt,
  });

  TripNote copyWith({
    String? id,
    String? title,
    String? content,
    String? category,
    String? colorTag,
    bool? isPinned,
    int? createdAt,
    int? updatedAt,
  }) {
    return TripNote(
      id: id ?? this.id,
      title: title ?? this.title,
      content: content ?? this.content,
      category: category ?? this.category,
      colorTag: colorTag ?? this.colorTag,
      isPinned: isPinned ?? this.isPinned,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'content': content,
      if (category != null) 'category': category,
      if (colorTag != null) 'colorTag': colorTag,
      'isPinned': isPinned,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }

  factory TripNote.fromJson(Map<String, dynamic> json) {
    return TripNote(
      id: json['id'] as String,
      title: json['title'] as String,
      content: (json['content'] ?? json['body'] ?? '') as String,
      category: json['category'] as String?,
      colorTag: json['colorTag'] as String?,
      isPinned: (json['isPinned'] ?? json['pinned']) as bool? ?? false,
      createdAt: (json['createdAt'] as num?)?.toInt() ?? 0,
      updatedAt: (json['updatedAt'] as num?)?.toInt() ?? 0,
    );
  }
}
