class ChecklistItem {
  final String id;
  final String text;
  final bool completed;
  final String? category; // 'packing' | 'prep' | 'documents' | 'medical' | 'general'
  final String? assignedTo;
  final String? assignedToMemberId;
  final String? completedByMemberId;
  final String? completedAt;
  final int createdAt;
  final int updatedAt;

  const ChecklistItem({
    required this.id,
    required this.text,
    this.completed = false,
    this.category,
    this.assignedTo,
    this.assignedToMemberId,
    this.completedByMemberId,
    this.completedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  ChecklistItem copyWith({
    String? id,
    String? text,
    bool? completed,
    String? category,
    String? assignedTo,
    String? assignedToMemberId,
    String? completedByMemberId,
    String? completedAt,
    int? createdAt,
    int? updatedAt,
  }) {
    return ChecklistItem(
      id: id ?? this.id,
      text: text ?? this.text,
      completed: completed ?? this.completed,
      category: category ?? this.category,
      assignedTo: assignedTo ?? this.assignedTo,
      assignedToMemberId: assignedToMemberId ?? this.assignedToMemberId,
      completedByMemberId: completedByMemberId ?? this.completedByMemberId,
      completedAt: completedAt ?? this.completedAt,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'text': text,
      'completed': completed,
      if (category != null) 'category': category,
      if (assignedTo != null) 'assignedTo': assignedTo,
      if (assignedToMemberId != null) 'assignedToMemberId': assignedToMemberId,
      if (completedByMemberId != null) 'completedByMemberId': completedByMemberId,
      if (completedAt != null) 'completedAt': completedAt,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }

  factory ChecklistItem.fromJson(Map<String, dynamic> json) {
    return ChecklistItem(
      id: json['id'] as String,
      text: json['text'] as String,
      completed: json['completed'] as bool? ?? false,
      category: json['category'] as String?,
      assignedTo: json['assignedTo'] as String?,
      assignedToMemberId: json['assignedToMemberId'] as String?,
      completedByMemberId: json['completedByMemberId'] as String?,
      completedAt: json['completedAt'] as String?,
      createdAt: (json['createdAt'] as num?)?.toInt() ?? 0,
      updatedAt: (json['updatedAt'] as num?)?.toInt() ?? 0,
    );
  }
}
