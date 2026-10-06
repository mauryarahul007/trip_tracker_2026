import '../../domain/models/category.dart';

class CategoryDto {
  final String id;
  final String tripId;
  final String name;
  final String? icon;
  final bool isCustom;
  final String? createdAt;
  final String? updatedAt;

  const CategoryDto({
    required this.id,
    required this.tripId,
    required this.name,
    this.icon,
    this.isCustom = true,
    this.createdAt,
    this.updatedAt,
  });

  factory CategoryDto.fromPostgresJson(Map<String, dynamic> json) {
    return CategoryDto(
      id: json['id'] as String,
      tripId: (json['trip_id'] ?? json['tripId'] ?? '') as String,
      name: json['name'] as String,
      icon: json['icon'] as String?,
      isCustom: (json['is_custom'] ?? json['isCustom']) as bool? ?? true,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }

  Map<String, dynamic> toPostgresJson() {
    return {
      'id': id,
      'trip_id': tripId,
      'name': name,
      if (icon != null) 'icon': icon,
      'is_custom': isCustom,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
    };
  }

  Category toDomain({List<String> keywords = const []}) {
    return Category(
      id: id,
      tripId: tripId,
      name: name,
      icon: icon,
      isCustom: isCustom,
      keywords: keywords,
    );
  }

  factory CategoryDto.fromDomain(Category category) {
    return CategoryDto(
      id: category.id,
      tripId: category.tripId ?? '',
      name: category.name,
      icon: category.icon,
      isCustom: category.isCustom,
    );
  }
}
