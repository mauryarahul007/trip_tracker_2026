class Category {
  final String id;
  final String? tripId;
  final String name;
  final String? icon;
  final bool isCustom;
  final List<String> keywords;

  const Category({
    required this.id,
    this.tripId,
    required this.name,
    this.icon,
    this.isCustom = true,
    this.keywords = const [],
  });

  Category copyWith({String? id, String? tripId, String? name, String? icon, bool? isCustom, List<String>? keywords}) {
    return Category(
      id: id ?? this.id,
      tripId: tripId ?? this.tripId,
      name: name ?? this.name,
      icon: icon ?? this.icon,
      isCustom: isCustom ?? this.isCustom,
      keywords: keywords ?? this.keywords,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      if (tripId != null) 'tripId': tripId,
      'name': name,
      if (icon != null) 'icon': icon,
      'isCustom': isCustom,
      'keywords': keywords,
    };
  }

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'] as String,
      tripId: (json['tripId'] ?? json['trip_id']) as String?,
      name: json['name'] as String,
      icon: json['icon'] as String?,
      isCustom: (json['isCustom'] ?? json['is_custom']) as bool? ?? true,
      keywords: (json['keywords'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
    );
  }
}
